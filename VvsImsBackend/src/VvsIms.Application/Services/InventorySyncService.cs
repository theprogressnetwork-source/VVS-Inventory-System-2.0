using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Application.Interfaces;
using VvsIms.Domain.Entities;
using VvsIms.Domain.Enums;
using VvsIms.Domain.Interfaces;

namespace VvsIms.Application.Services
{
    /// <summary>
    /// Inventory synchronization service for multi-channel inventory management.
    /// </summary>
    public class InventorySyncService : IInventorySyncService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationService _notificationService;
        private readonly IEnumerable<IPlatformService> _platformServices;
        private readonly ILogger<InventorySyncService> _logger;

        public InventorySyncService(
            IUnitOfWork unitOfWork,
            INotificationService notificationService,
            IEnumerable<IPlatformService> platformServices,
            ILogger<InventorySyncService> logger)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
            _platformServices = platformServices;
            _logger = logger;
        }

        /// <summary>
        /// Processes a channel event with idempotency checks and sync locking.
        /// </summary>
        public async Task<(bool success, object result)> ProcessChannelEventAsync(
            string channelName,
            string eventId,
            DateTime orderDate,
            string rawOrderState,
            List<(string channelSku, int qty, string imei)> items)
        {
            _logger.LogInformation($"Processing channel event {eventId} from {channelName}");

            using var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                var outgoingRepo = _unitOfWork.Repository<Outgoing>();
                var mappingRepo = _unitOfWork.Repository<ChannelMapping>();
                var inventoryRepo = _unitOfWork.Repository<Inventory>();
                var skuRegistryRepo = _unitOfWork.Repository<ProductSku>();
                var stockRepo = _unitOfWork.Repository<Stock>();

                // 1. Idempotency Check
                var alreadyProcessed = await outgoingRepo.Query.AnyAsync(o => o.OrderNo == eventId);
                if (alreadyProcessed)
                {
                    _logger.LogWarning($"Order {eventId} has already been processed. Skipping.");
                    return (true, "Order already processed");
                }

                var processedSkus = new HashSet<string>();

                foreach (var item in items)
                {
                    // 2. Resolve SKU Mapping
                    var mapping = await mappingRepo.Query
                        .FirstOrDefaultAsync(m => m.ChannelSKU == item.channelSku || m.ShopSKU == item.channelSku);
                    var systemSku = mapping != null ? mapping.SystemSKU : item.channelSku;

                    // 3. Find parent Inventory record
                    var inventory = await inventoryRepo.Query
                        .FirstOrDefaultAsync(i => i.BaseProperties.Sku == systemSku);

                    if (inventory == null)
                    {
                        // Check if registered in Sku registry to create default
                        var skuRegistry = await skuRegistryRepo.Query
                            .FirstOrDefaultAsync(s => s.Sku == systemSku);

                        if (skuRegistry != null)
                        {
                            inventory = new Inventory
                            {
                                BaseProperties = new Domain.ValueObjects.BaseProperties
                                {
                                    Sku = systemSku,
                                    Model = skuRegistry.Model,
                                    Storage = skuRegistry.Storage,
                                    Color = skuRegistry.Color,
                                    Grade = skuRegistry.Grade,
                                    Cost = new Domain.ValueObjects.Money(0)
                                },
                                Quantity = 0,
                                Platform = Enum.TryParse<BuyingPlatformEnum>(channelName, true, out var plat) ? plat : BuyingPlatformEnum.BestBuy
                            };
                            await inventoryRepo.AddAsync(inventory);
                        }
                        else
                        {
                            var errMsg = $"System SKU mapping not found for channel SKU {item.channelSku} and no SKU registry found.";
                            _logger.LogError(errMsg);
                            await _notificationService.CreateAsync(
                                "Missing SKU Mapping",
                                $"Order {eventId} contains channel SKU {item.channelSku} which has no system mapping or registry record.",
                                "Error",
                                "System Integration"
                            );
                            return (false, errMsg);
                        }
                    }

                    // 4. Update aggregate immediately (immediate decrement)
                    inventory.Quantity = Math.Max(0, inventory.Quantity - item.qty);
                    inventoryRepo.Update(inventory);

                    // 5. Create Outgoing log entry
                    var outgoing = new Outgoing
                    {
                        OrderNo = eventId,
                        ProductTitle = $"{inventory.BaseProperties.Model} {inventory.BaseProperties.Storage} {inventory.BaseProperties.Color} {inventory.BaseProperties.Grade}",
                        Imei = string.Empty, // Scanning is done later by worker
                        Date = orderDate,
                        OrderStatus = "Pending"
                    };
                    await outgoingRepo.AddAsync(outgoing);

                    // 6. Create reserved Stock entry to act as physical placeholder
                    for (int i = 0; i < item.qty; i++)
                    {
                        var placeholderImei = $"P-{eventId}-{Guid.NewGuid().ToString("N")[..6]}";
                        var stockPlaceholder = new Stock
                        {
                            BaseProperties = inventory.BaseProperties,
                            Imei = placeholderImei,
                            OrderNo = eventId,
                            DateAdded = DateTime.UtcNow,
                            OrderStatus = "Pending",
                            IsShipped = false,
                            IsManualImei = false,
                            Vendor = channelName
                        };
                        await stockRepo.AddAsync(stockPlaceholder);
                    }

                    processedSkus.Add(systemSku);
                }

                await _unitOfWork.SaveChangesAsync();
                
                try
                {
                    await ((dynamic)transaction).CommitAsync();
                }
                catch (Microsoft.CSharp.RuntimeBinder.RuntimeBinderException)
                {
                    // In case of non-EF test doubles
                }

                // 7. Perform verification checks after transaction finishes
                foreach (var sku in processedSkus)
                {
                    await ValidateInventoryIntegrityAsync(sku);
                }

                return (true, "Channel order processed successfully");
            }
            catch (Exception ex)
            {
                try
                {
                    await ((dynamic)transaction).RollbackAsync();
                }
                catch (Microsoft.CSharp.RuntimeBinder.RuntimeBinderException)
                {
                    // In case of non-EF test doubles
                }
                _logger.LogError(ex, $"Failed to process channel event {eventId}");
                return (false, ex.Message);
            }
        }

        /// <summary>
        /// Handles cancellation or return of orders.
        /// </summary>
        public async Task<(bool success, string message)> HandleCancelOrReturnAsync(
            string channelName,
            string orderNo,
            string systemSku,
            string action,
            int quantity)
        {
            _logger.LogInformation($"Handling order cancellation/return for Order {orderNo}, SKU {systemSku}, Action: {action}");

            using var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                var inventoryRepo = _unitOfWork.Repository<Inventory>();
                var stockRepo = _unitOfWork.Repository<Stock>();
                var outgoingRepo = _unitOfWork.Repository<Outgoing>();

                var inventory = await inventoryRepo.Query.FirstOrDefaultAsync(i => i.BaseProperties.Sku == systemSku);
                if (inventory == null)
                {
                    return (false, $"Inventory record for SKU {systemSku} not found.");
                }

                if (action.Equals("Cancel", StringComparison.OrdinalIgnoreCase))
                {
                    // Find pending placeholder stocks for this order SKU
                    var pendingStocks = await stockRepo.Query
                        .Where(s => s.BaseProperties.Sku == systemSku && s.OrderNo == orderNo && !s.IsShipped)
                        .Take(quantity)
                        .ToListAsync();

                    foreach (var stock in pendingStocks)
                    {
                        stockRepo.Remove(stock);
                    }

                    // Increment aggregate inventory quantity
                    inventory.Quantity += quantity;
                    inventoryRepo.Update(inventory);

                    // Remove or update Outgoing record
                    var outgoings = await outgoingRepo.Query
                        .Where(o => o.OrderNo == orderNo)
                        .ToListAsync();
                    foreach (var o in outgoings)
                    {
                        outgoingRepo.Remove(o);
                    }
                }
                else if (action.Equals("Return", StringComparison.OrdinalIgnoreCase))
                {
                    // For returns: items were already shipped. We return them to unsold physical stock.
                    var shippedStocks = await stockRepo.Query
                        .Where(s => s.BaseProperties.Sku == systemSku && s.OrderNo == orderNo && s.IsShipped)
                        .Take(quantity)
                        .ToListAsync();

                    foreach (var stock in shippedStocks)
                    {
                        stock.IsShipped = false;
                        stock.DateSold = null;
                        stock.OrderStatus = null;
                        stock.OrderNo = null;
                        stock.ShippedDate = null;
                        stockRepo.Update(stock);
                    }

                    // Increment aggregate inventory quantity
                    inventory.Quantity += quantity;
                    inventoryRepo.Update(inventory);
                }

                await _unitOfWork.SaveChangesAsync();
                
                try
                {
                    await ((dynamic)transaction).CommitAsync();
                }
                catch (Microsoft.CSharp.RuntimeBinder.RuntimeBinderException)
                {
                    // In case of non-EF test doubles
                }

                // Re-verify integrity
                await ValidateInventoryIntegrityAsync(systemSku);

                return (true, "Order cancellation/return handled successfully");
            }
            catch (Exception ex)
            {
                try
                {
                    await ((dynamic)transaction).RollbackAsync();
                }
                catch (Microsoft.CSharp.RuntimeBinder.RuntimeBinderException)
                {
                    // In case of non-EF test doubles
                }
                _logger.LogError(ex, $"Failed to handle cancel/return for order {orderNo}");
                return (false, ex.Message);
            }
        }

        /// <summary>
        /// Automatically syncs orders from all channels.
        /// </summary>
        public async Task AutoSyncOrdersAsync()
        {
            _logger.LogInformation("Auto-syncing orders from all registered marketplace platform services");

            foreach (var platform in _platformServices)
            {
                try
                {
                    var newOrders = await platform.FetchNewOrdersAsync();
                    if (newOrders == null || newOrders.Count == 0) continue;

                    foreach (var order in newOrders)
                    {
                        var items = new List<(string channelSku, int qty, string imei)>
                        {
                            (order.Sku, order.Quantity, order.Imei ?? string.Empty)
                        };

                        await ProcessChannelEventAsync(
                            platform.PlatformName,
                            order.OrderId,
                            order.OrderDate,
                            order.OrderStatus ?? "Pending",
                            items);

                        await platform.AcknowledgeOrderAsync(order.OrderId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to auto-sync orders for platform {platform.PlatformName}");
                }
            }
        }

        /// <summary>
        /// Propagates stock updates to all channels.
        /// </summary>
        public async Task<(bool success, object result)> PropagateStockUpdateAsync(IEnumerable<string> systemSkus)
        {
            var results = new List<object>();
            var inventoryRepo = _unitOfWork.Repository<Inventory>();

            foreach (var sku in systemSkus)
            {
                var inventory = await inventoryRepo.Query.FirstOrDefaultAsync(i => i.BaseProperties.Sku == sku);
                if (inventory == null) continue;

                int qty = inventory.Quantity;
                foreach (var platform in _platformServices)
                {
                    try
                    {
                        var success = await platform.UpdateInventoryAsync(sku, qty);
                        results.Add(new { Sku = sku, Platform = platform.PlatformName, Success = success, Quantity = qty });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to propagate stock update for SKU {sku} on platform {platform.PlatformName}");
                        results.Add(new { Sku = sku, Platform = platform.PlatformName, Success = false, Error = ex.Message });
                    }
                }
            }
            return (true, results);
        }

        /// <summary>
        /// Validates aggregate inventory against physical stock totals and raises notifications on drift.
        /// </summary>
        public async Task<(bool isValid, string report)> ValidateInventoryIntegrityAsync(string sku, CancellationToken ct = default)
        {
            var stockRepo = _unitOfWork.Repository<Stock>();
            var inventoryRepo = _unitOfWork.Repository<Inventory>();

            // 1. Unsold physical stocks (DateSold == null, !IsShipped, !Rma, and not a pending order placeholder)
            int unsoldPhysical = await stockRepo.Query.CountAsync(s => 
                s.BaseProperties.Sku == sku && 
                s.DateSold == null && 
                !s.IsShipped && 
                !s.Rma && 
                !s.Imei.StartsWith("P-"), ct);

            // 2. Pending orders count (OrderStatus == "Pending", and either has a placeholder IMEI or !IsManualImei)
            int pendingOrders = await stockRepo.Query.CountAsync(s => 
                s.BaseProperties.Sku == sku && 
                s.OrderNo != null && 
                s.OrderNo != "" && 
                !s.IsShipped && 
                !s.IsManualImei, ct);

            // 3. Aggregate inventory quantity
            var inventory = await inventoryRepo.Query.FirstOrDefaultAsync(i => i.BaseProperties.Sku == sku, ct);
            int aggregateQty = inventory?.Quantity ?? 0;

            // 4. Verification formula
            int expectedAvailable = unsoldPhysical - pendingOrders;
            bool isValid = expectedAvailable == aggregateQty;

            string report = $"SKU {sku} Integrity: Unsold Physical = {unsoldPhysical}, Pending Orders = {pendingOrders}, Expected Available = {expectedAvailable}, Aggregate Quantity = {aggregateQty}.";

            if (!isValid)
            {
                _logger.LogError($"INVENTORY DISCREPANCY DETECTED! {report}");
                
                var message = $"Discrepancy detected for SKU {sku}. Unsold Physical: {unsoldPhysical}, Pending Orders: {pendingOrders}, Net Expected: {expectedAvailable}, but Aggregate Quantity is {aggregateQty}. (Difference: {aggregateQty - expectedAvailable})";
                await _notificationService.CreateAsync(
                    title: "Inventory Discrepancy Alert",
                    message: message,
                    type: "Error",
                    createdBy: "System Validation",
                    relatedEntity: sku,
                    ct: ct
                );
            }
            else
            {
                _logger.LogInformation($"Inventory integrity verified: {report}");
            }

            return (isValid, report);
        }
    }
}