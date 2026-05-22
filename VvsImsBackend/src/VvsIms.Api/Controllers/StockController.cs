using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Application.DTOs;
using VvsIms.Application.Interfaces;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

using VvsIms.Application.Services;
using VvsIms.Domain.Entities;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Stock controller — manages IMEI-tracked inventory items.
/// Route: /api/stock (matches frontend API_ROUTES.STOCK_SYNC, IMEI_UPDATE, etc.)
/// </summary>
[ApiController]
[Route("api/stock")]
[Authorize]
public class StockController : ControllerBase
{
    private readonly IStockRepository _stockRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IInventorySyncService _inventorySyncService;
    private readonly ILogger<StockController> _logger;

    public StockController(
        IStockRepository stockRepo,
        IUnitOfWork unitOfWork,
        IInventorySyncService inventorySyncService,
        ILogger<StockController> logger)
    {
        _stockRepo = stockRepo;
        _unitOfWork = unitOfWork;
        _inventorySyncService = inventorySyncService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/stock — Get all stock items (used by frontend for stock listing).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<StockDto>>>> GetAll(CancellationToken ct)
    {
        var stocks = await _stockRepo.Query
            .OrderByDescending(s => s.CreatedAtUtc)
            .ToListAsync(ct);

        var dtos = stocks.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<StockDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/stock/{id} — Get a single stock item by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<StockDto>>> GetById(int id, CancellationToken ct)
    {
        var stock = await _stockRepo.GetByIdAsync(id, ct);
        if (stock is null) return NotFound(ApiResponse<StockDto>.Fail("Stock item not found"));

        return Ok(ApiResponse<StockDto>.Ok(MapToDto(stock)));
    }

    /// <summary>
    /// POST /api/stock — Create a new stock item.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<StockDto>>> Create([FromBody] StockDto dto, CancellationToken ct)
    {
        var stock = new Domain.Entities.Stock
        {
            BaseProperties = new Domain.ValueObjects.BaseProperties
            {
                Model = dto.Model,
                Storage = dto.Storage,
                Color = dto.Color,
                Grade = dto.Grade,
                Sku = dto.Sku,
                Cost = new Domain.ValueObjects.Money(dto.Cost),
            },
            Imei = dto.Imei,
            OrderNo = dto.OrderNo,
            DateSold = dto.DateSold,
            DateAdded = dto.DateAdded ?? DateTime.UtcNow,
            Vendor = dto.Vendor,
            InvoiceNumber = dto.InvoiceNumber,
            PhoneCheck = dto.PhoneCheck,
            Rma = dto.Rma,
            IsManualImei = dto.IsManualImei,
            OrderStatus = dto.OrderStatus,
            IsShipped = dto.IsShipped,
            ShippedDate = dto.ShippedDate,
            OrderLandingDate = dto.OrderLandingDate,
            Channel = dto.Channel,
            SalePrice = dto.SalePrice,
            ReturnDate = dto.ReturnDate,
            ReturnReason = dto.ReturnReason,
            FbaFlag = dto.FbaFlag,
        };

        var created = await _stockRepo.AddAsync(stock, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            ApiResponse<StockDto>.Ok(MapToDto(created), "Stock item created"));
    }

    /// <summary>
    /// PUT /api/stock/{id} — Update a stock item.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<StockDto>>> Update(int id, [FromBody] StockDto dto, CancellationToken ct)
    {
        var stock = await _stockRepo.GetByIdAsync(id, ct);
        if (stock is null) return NotFound(ApiResponse<StockDto>.Fail("Stock item not found"));

        stock.BaseProperties.Model = dto.Model;
        stock.BaseProperties.Storage = dto.Storage;
        stock.BaseProperties.Color = dto.Color;
        stock.BaseProperties.Grade = dto.Grade;
        stock.BaseProperties.Sku = dto.Sku;
        stock.BaseProperties.Cost = new Domain.ValueObjects.Money(dto.Cost);
        stock.Imei = dto.Imei;
        stock.OrderNo = dto.OrderNo;
        stock.DateSold = dto.DateSold;
        stock.DateAdded = dto.DateAdded;
        stock.Vendor = dto.Vendor;
        stock.InvoiceNumber = dto.InvoiceNumber;
        stock.PhoneCheck = dto.PhoneCheck;
        stock.Rma = dto.Rma;
        stock.IsManualImei = dto.IsManualImei;
        stock.OrderStatus = dto.OrderStatus;
        stock.IsShipped = dto.IsShipped;
        stock.ShippedDate = dto.ShippedDate;
        stock.OrderLandingDate = dto.OrderLandingDate;
        stock.Channel = dto.Channel;
        stock.SalePrice = dto.SalePrice;
        stock.ReturnDate = dto.ReturnDate;
        stock.ReturnReason = dto.ReturnReason;
        stock.FbaFlag = dto.FbaFlag;

        _stockRepo.Update(stock);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<StockDto>.Ok(MapToDto(stock), "Stock item updated"));
    }

    /// <summary>
    /// DELETE /api/stock/{id} — Delete a stock item.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken ct)
    {
        var stock = await _stockRepo.GetByIdAsync(id, ct);
        if (stock is null) return NotFound(ApiResponse<object>.Fail("Stock item not found"));

        _stockRepo.Remove(stock);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(null, "Stock item deleted"));
    }

    /// <summary>
    /// POST /api/stock/sync — Trigger stock sync (frontend: STOCK_SYNC).
    /// </summary>
    [HttpPost("sync")]
    public async Task<ActionResult<ApiResponse<object>>> Sync(CancellationToken ct)
    {
        // Stock sync is handled by InventorySyncHostedService
        _logger.LogInformation("Stock sync triggered via API");
        return Ok(ApiResponse<object>.Ok(null, "Stock sync initiated"));
    }

    /// <summary>
    /// PUT /api/stock/imei — Bulk IMEI update (frontend: IMEI_UPDATE).
    /// </summary>
    [HttpPut("imei")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateImei([FromBody] StockUpdateRequest request, CancellationToken ct)
    {
        _logger.LogInformation($"Binding physical IMEI {request.Imei} to order {request.OrderNo}");

        using var transaction = await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            // Find the physical stock record by the scanned IMEI
            var stock = await _stockRepo.GetByImeiAsync(request.Imei, ct);
            if (stock is null)
                return NotFound(ApiResponse<object>.Fail("Stock item not found by IMEI"));

            // Validate: already sold or shipped?
            if (stock.IsShipped || stock.DateSold != null)
                return BadRequest(ApiResponse<object>.Fail("Already sold or shipped"));

            // Assign order
            if (!string.IsNullOrWhiteSpace(request.OrderNo))
                stock.OrderNo = request.OrderNo;

            // Assign status
            if (!string.IsNullOrWhiteSpace(request.OrderStatus))
                stock.OrderStatus = request.OrderStatus;

            // IMEI correction
            if (!string.IsNullOrWhiteSpace(request.NewImei))
                stock.Imei = request.NewImei;

            _stockRepo.Update(stock);
            await _unitOfWork.SaveChangesAsync(ct);

            // Update Outgoing log to show physical IMEI assigned
            var outgoingRepo = _unitOfWork.Repository<Outgoing>();
            var outgoing = await outgoingRepo.Query
                .FirstOrDefaultAsync(o => o.OrderNo == request.OrderNo && (o.Imei == "" || o.Imei == null || o.Imei.StartsWith("P-")), ct);
            if (outgoing != null)
            {
                outgoing.Imei = request.Imei;
                outgoingRepo.Update(outgoing);
            }

            await _unitOfWork.SaveChangesAsync(ct);

            await ((dynamic)transaction).CommitAsync(ct);

            // Re-verify integrity for the SKU
            await _inventorySyncService.ValidateInventoryIntegrityAsync(stock.BaseProperties.Sku, ct);

            return Ok(ApiResponse<object>.Ok(null, "IMEI updated successfully"));
        }
        catch (Exception ex)
        {
            try
            {
                await ((dynamic)transaction).RollbackAsync(ct);
            }
            catch (Exception txEx)
            {
                _logger.LogError(txEx, "Failed to rollback transaction");
            }
            _logger.LogError(ex, $"Failed to bind physical IMEI {request.Imei} to order {request.OrderNo}");
            return StatusCode(500, ApiResponse<object>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// PUT /api/stock/imei/single — Single IMEI update.
    /// </summary>
    [HttpPut("imei/single")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateImeiSingle([FromBody] StockUpdateRequest request, CancellationToken ct)
    {
        return await UpdateImei(request, ct);
    }

    /// <summary>
    /// PUT /api/stock/mark-shipped — Mark stock as shipped.
    /// </summary>
    [HttpPut("mark-shipped")]
    public async Task<ActionResult<ApiResponse<object>>> MarkShipped([FromBody] Dictionary<string, string> body, CancellationToken ct)
    {
        if (!body.TryGetValue("imei", out var imei))
            return BadRequest(ApiResponse<object>.Fail("IMEI is required"));

        _logger.LogInformation($"Marking IMEI {imei} as shipped");

        using var transaction = await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var stock = await _stockRepo.GetByImeiAsync(imei, ct);
            if (stock is null) return NotFound(ApiResponse<object>.Fail("Stock item not found"));

            if (stock.IsShipped)
            {
                return Ok(ApiResponse<object>.Ok(null, "Stock already marked as shipped"));
            }

            stock.IsShipped = true;
            stock.ShippedDate = DateTime.UtcNow;
            stock.DateSold = DateTime.UtcNow;
            stock.OrderStatus = "Shipped";
            _stockRepo.Update(stock);

            // Sync the corresponding Outgoing entry status
            var outgoingRepo = _unitOfWork.Repository<Outgoing>();
            var outgoing = await outgoingRepo.Query
                .FirstOrDefaultAsync(o => o.Imei == imei || (o.OrderNo == stock.OrderNo && (o.Imei == "" || o.Imei == null)), ct);
            if (outgoing != null)
            {
                outgoing.OrderStatus = "Shipped";
                outgoing.Imei = imei;
                outgoing.Date = DateTime.UtcNow;
                outgoingRepo.Update(outgoing);
            }

            // Sync corresponding InventoryItem date ship
            var invItemRepo = _unitOfWork.Repository<InventoryItem>();
            var invItem = await invItemRepo.Query
                .FirstOrDefaultAsync(i => i.Imei == imei, ct);
            if (invItem != null)
            {
                invItem.DateShip = DateTime.UtcNow;
                invItem.Order = stock.OrderNo;
                invItemRepo.Update(invItem);
            }

            await _unitOfWork.SaveChangesAsync(ct);

            await ((dynamic)transaction).CommitAsync(ct);

            // Re-verify integrity for this SKU
            await _inventorySyncService.ValidateInventoryIntegrityAsync(stock.BaseProperties.Sku, ct);

            return Ok(ApiResponse<object>.Ok(null, "Stock successfully marked as shipped"));
        }
        catch (Exception ex)
        {
            try
            {
                await ((dynamic)transaction).RollbackAsync(ct);
            }
            catch (Exception txEx)
            {
                _logger.LogError(txEx, "Failed to rollback transaction");
            }
            _logger.LogError(ex, $"Failed to mark IMEI {imei} as shipped");
            return StatusCode(500, ApiResponse<object>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// GET /api/stock/orders — Get today's orders.
    /// </summary>
    [HttpGet("orders")]
    public async Task<ActionResult<ApiResponse<List<StockDto>>>> GetTodayOrders(CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        var stocks = await _stockRepo.Query
            .Where(s => s.DateAdded.HasValue && s.DateAdded.Value.Date == today)
            .OrderByDescending(s => s.DateAdded)
            .ToListAsync(ct);

        var dtos = stocks.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<StockDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/stock/inventory-by-imei — Get inventory by IMEI.
    /// </summary>
    [HttpGet("inventory-by-imei")]
    public async Task<ActionResult<ApiResponse<StockDto>>> GetByImei([FromQuery] string imei, CancellationToken ct)
    {
        var stock = await _stockRepo.GetByImeiAsync(imei, ct);
        if (stock is null) return NotFound(ApiResponse<StockDto>.Fail("Stock item not found"));

        return Ok(ApiResponse<StockDto>.Ok(MapToDto(stock)));
    }

    /// <summary>
    /// POST /api/stock/manual-return — Process a manual return.
    /// </summary>
    [HttpPost("manual-return")]
    public async Task<ActionResult<ApiResponse<object>>> ManualReturn([FromBody] Dictionary<string, string> body, CancellationToken ct)
    {
        if (!body.TryGetValue("imei", out var imei))
            return BadRequest(ApiResponse<object>.Fail("IMEI is required"));

        var stock = await _stockRepo.GetByImeiAsync(imei, ct);
        if (stock is null) return NotFound(ApiResponse<object>.Fail("Stock item not found"));

        var stockReturn = new Domain.Entities.StockReturn
        {
            StockId = stock.Id,
            ReturnOrderNo = stock.OrderNo ?? "MANUAL",
            ReturnDate = DateTime.UtcNow,
            Reason = body.TryGetValue("reason", out var reason) ? reason : "RETURN",
            Channel = body.TryGetValue("channel", out var channel) ? channel : null,
        };

        await _unitOfWork.Repository<Domain.Entities.StockReturn>().AddAsync(stockReturn, ct);
        stock.Rma = true;
        stock.OrderNo = null;
        stock.DateSold = null;
        stock.IsShipped = false;
        stock.ShippedDate = null;
        stock.OrderStatus = null;
        _stockRepo.Update(stock);

        // Increment inventory quantity for this SKU
        var inventoryRepo = _unitOfWork.Repository<Inventory>();
        var inv = await inventoryRepo.Query.FirstOrDefaultAsync(i => i.BaseProperties.Sku == stock.BaseProperties.Sku, ct);
        if (inv != null)
        {
            inv.Quantity++;
            inventoryRepo.Update(inv);
        }

        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(null, "Manual return processed"));
    }

    // ── Mapping Helper ──────────────────────────────────────────
    private static StockDto MapToDto(Domain.Entities.Stock s) => new()
    {
        Id = s.Id,
        Sku = s.BaseProperties.Sku,
        Model = s.BaseProperties.Model,
        Storage = s.BaseProperties.Storage,
        Color = s.BaseProperties.Color,
        Grade = s.BaseProperties.Grade,
        GradeName = s.BaseProperties.GradeName,
        Cost = s.BaseProperties.Cost.Amount,
        Imei = s.Imei,
        OrderNo = s.OrderNo,
        DateSold = s.DateSold,
        DateAdded = s.DateAdded,
        Vendor = s.Vendor,
        InvoiceNumber = s.InvoiceNumber,
        PhoneCheck = s.PhoneCheck,
        Rma = s.Rma,
        IsManualImei = s.IsManualImei,
        OrderStatus = s.OrderStatus,
        IsShipped = s.IsShipped,
        ShippedDate = s.ShippedDate,
        OrderLandingDate = s.OrderLandingDate,
        Channel = s.Channel,
        SalePrice = s.SalePrice,
        ReturnDate = s.ReturnDate,
        ReturnReason = s.ReturnReason,
        FbaFlag = s.FbaFlag,
    };
}
