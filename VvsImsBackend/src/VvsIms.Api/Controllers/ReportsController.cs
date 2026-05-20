using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Application.DTOs;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Reports controller — provides inventory and business analytics reports.
/// Route: /api/reports (matches frontend API_ROUTES: GET_INVENTORY_REPORT)
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(
        VvsImsDbContext dbContext,
        ILogger<ReportsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/reports/inventory-by-status — Get inventory grouped by status.
    /// Body: { "status": "all" | "unsold" | "sold" | "shipped" | "rma" }
    /// </summary>
    [HttpPost("inventory-by-status")]
    public async Task<ActionResult<ApiResponse<InventoryByStatusReport>>> GetInventoryByStatus(
        [FromBody] InventoryByStatusRequest request, CancellationToken ct)
    {
        var report = new InventoryByStatusReport();

        // Total stock count
        report.TotalStock = await _dbContext.Stocks.CountAsync(ct);

        // Unsold (DateSold is null)
        report.UnsoldCount = await _dbContext.Stocks
            .CountAsync(s => s.DateSold == null, ct);

        // Sold (DateSold is not null)
        report.SoldCount = await _dbContext.Stocks
            .CountAsync(s => s.DateSold != null, ct);

        // Shipped
        report.ShippedCount = await _dbContext.Stocks
            .CountAsync(s => s.IsShipped, ct);

        // RMA
        report.RmaCount = await _dbContext.Stocks
            .CountAsync(s => s.Rma, ct);

        // In Transit (shipped but not delivered)
        report.InTransitCount = await _dbContext.Stocks
            .CountAsync(s => s.ShippedDate != null && s.OrderLandingDate == null, ct);

        // Inventory aggregates
        report.TotalInventoryLines = await _dbContext.Inventories.CountAsync(ct);
        report.TotalSkuCount = await _dbContext.ProductSkus.CountAsync(ct);
        report.TotalChannelMappings = await _dbContext.ChannelMappings.CountAsync(ct);

        // Total inventory value (sum of cost * quantity)
        var inventoryValue = await _dbContext.Inventories
            .SumAsync(i => i.BaseProperties.Cost.Amount * i.Quantity, ct);
        report.TotalInventoryValue = inventoryValue;

        // Filter stock items based on requested status
        var status = request.Status?.ToLower() ?? "all";
        List<Domain.Entities.Stock> filteredStocks;

        filteredStocks = status switch
        {
            "unsold" => await _dbContext.Stocks.Where(s => s.DateSold == null).OrderByDescending(s => s.DateAdded).ToListAsync(ct),
            "sold" => await _dbContext.Stocks.Where(s => s.DateSold != null).OrderByDescending(s => s.DateSold).ToListAsync(ct),
            "shipped" => await _dbContext.Stocks.Where(s => s.IsShipped).OrderByDescending(s => s.ShippedDate).ToListAsync(ct),
            "rma" => await _dbContext.Stocks.Where(s => s.Rma).OrderByDescending(s => s.CreatedAtUtc).ToListAsync(ct),
            "intransit" => await _dbContext.Stocks.Where(s => s.ShippedDate != null && s.OrderLandingDate == null).OrderByDescending(s => s.ShippedDate).ToListAsync(ct),
            _ => await _dbContext.Stocks.OrderByDescending(s => s.CreatedAtUtc).ToListAsync(ct),
        };

        report.StockItems = filteredStocks.Select(s => new StockDto
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
        }).ToList();

        return Ok(ApiResponse<InventoryByStatusReport>.Ok(report));
    }

    /// <summary>
    /// GET /api/reports/summary — Quick dashboard summary.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<DashboardSummary>>> GetDashboardSummary(CancellationToken ct)
    {
        var summary = new DashboardSummary
        {
            TotalStock = await _dbContext.Stocks.CountAsync(ct),
            UnsoldStock = await _dbContext.Stocks.CountAsync(s => s.DateSold == null, ct),
            SoldStock = await _dbContext.Stocks.CountAsync(s => s.DateSold != null, ct),
            ShippedStock = await _dbContext.Stocks.CountAsync(s => s.IsShipped, ct),
            RmaStock = await _dbContext.Stocks.CountAsync(s => s.Rma, ct),
            TotalSkus = await _dbContext.ProductSkus.CountAsync(ct),
            TotalInventoryLines = await _dbContext.Inventories.CountAsync(ct),
            TotalMappings = await _dbContext.ChannelMappings.CountAsync(ct),
            UnreadNotifications = await _dbContext.Notifications.CountAsync(n => !n.IsRead, ct),
            OpenThreads = await _dbContext.ThreadStatuses.CountAsync(ts => ts.Status != "Resolved", ct),
            PendingOrders = await _dbContext.Pendings.CountAsync(ct),
            OutgoingOrders = await _dbContext.Outgoings.CountAsync(ct),
        };

        return Ok(ApiResponse<DashboardSummary>.Ok(summary));
    }
}

/// <summary>
/// Request body for inventory-by-status report.
/// </summary>
public class InventoryByStatusRequest
{
    /// <summary>
    /// Filter status: "all", "unsold", "sold", "shipped", "rma", "intransit"
    /// </summary>
    public string? Status { get; set; } = "all";
}

/// <summary>
/// Inventory by status report response.
/// </summary>
public class InventoryByStatusReport
{
    public int TotalStock { get; set; }
    public int UnsoldCount { get; set; }
    public int SoldCount { get; set; }
    public int ShippedCount { get; set; }
    public int RmaCount { get; set; }
    public int InTransitCount { get; set; }
    public int TotalInventoryLines { get; set; }
    public int TotalSkuCount { get; set; }
    public int TotalChannelMappings { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public List<StockDto> StockItems { get; set; } = new();
}

/// <summary>
/// Dashboard summary response.
/// </summary>
public class DashboardSummary
{
    public int TotalStock { get; set; }
    public int UnsoldStock { get; set; }
    public int SoldStock { get; set; }
    public int ShippedStock { get; set; }
    public int RmaStock { get; set; }
    public int TotalSkus { get; set; }
    public int TotalInventoryLines { get; set; }
    public int TotalMappings { get; set; }
    public int UnreadNotifications { get; set; }
    public int OpenThreads { get; set; }
    public int PendingOrders { get; set; }
    public int OutgoingOrders { get; set; }
}
