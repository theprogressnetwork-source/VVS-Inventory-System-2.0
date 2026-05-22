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
using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Product controller — manages incoming products, stock listing, pending, and outgoing.
/// Route: /api/products (matches frontend API_ROUTES: GET_PRODUCTS, UPDATE_PRODUCTS, etc.)
/// </summary>
[ApiController]
[Route("api/products")]
[Authorize]
public class ProductController : ControllerBase
{
    private readonly IProductRepository _productRepo;
    private readonly IStockRepository _stockRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<ProductController> _logger;

    public ProductController(
        IProductRepository productRepo,
        IStockRepository stockRepo,
        IUnitOfWork unitOfWork,
        VvsImsDbContext dbContext,
        ILogger<ProductController> logger)
    {
        _productRepo = productRepo;
        _stockRepo = stockRepo;
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    // ── Products/Stock ──────────────────────────────────────────

    /// <summary>
    /// GET /api/products/stock — Get all stock items as product view.
    /// This is the PRIMARY endpoint the frontend calls for the inventory grid.
    /// </summary>
    [HttpGet("stock")]
    public async Task<ActionResult<ApiResponse<List<StockDto>>>> GetStock(CancellationToken ct)
    {
        var stocks = await _dbContext.Stocks
            .OrderByDescending(s => s.CreatedAtUtc)
            .ToListAsync(ct);

        var dtos = stocks.Select(MapStockToDto).ToList();
        return Ok(ApiResponse<List<StockDto>>.Ok(dtos));
    }

    /// <summary>
    /// PUT /api/products/stock — Bulk update stock items.
    /// </summary>
    [HttpPut("stock")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateStock([FromBody] List<StockDto> items, CancellationToken ct)
    {
        foreach (var dto in items)
        {
            var stock = await _stockRepo.GetByIdAsync(dto.Id, ct);
            if (stock is null) continue;

            stock.BaseProperties.Model = dto.Model;
            stock.BaseProperties.Storage = dto.Storage;
            stock.BaseProperties.Color = dto.Color;
            stock.BaseProperties.Grade = dto.Grade;
            stock.BaseProperties.Sku = dto.Sku;
            stock.BaseProperties.Cost = new Domain.ValueObjects.Money(dto.Cost);
            stock.Imei = dto.Imei;
            stock.OrderNo = dto.OrderNo;
            stock.DateSold = dto.DateSold;
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
	}

	await _unitOfWork.SaveChangesAsync(ct);
	return Ok(ApiResponse<object>.Ok(null, $"{items.Count} stock items updated"));
    }

    /// <summary>
    /// DELETE /api/products/stock/{stockId} — Delete a stock item.
    /// </summary>
    [HttpDelete("stock/{stockId:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteStock(int stockId, CancellationToken ct)
    {
        var stock = await _stockRepo.GetByIdAsync(stockId, ct);
        if (stock is null) return NotFound(ApiResponse<object>.Fail("Stock item not found"));

        _stockRepo.Remove(stock);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(null, "Stock item deleted"));
    }

    // ── Products (Incoming) ─────────────────────────────────────

    /// <summary>
    /// POST /api/products — Add new incoming products.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<List<ProductDto>>>> CreateProducts([FromBody] List<ProductDto> dtos, CancellationToken ct)
    {
        var created = new List<ProductDto>();
        foreach (var dto in dtos)
        {
            var product = new Product
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
                Vendor = dto.Vendor,
                InvoiceNumber = dto.InvoiceNumber,
                PhoneCheck = dto.PhoneCheck,
                IsProcessed = false,
            };

            var entity = await _productRepo.AddAsync(product, ct);
            created.Add(MapProductToDto(entity));
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return Ok(ApiResponse<List<ProductDto>>.Ok(created, $"{created.Count} products created"));
    }

    // ── Pending ─────────────────────────────────────────────────

    /// <summary>
    /// GET /api/products/pending — Get all pending products.
    /// </summary>
    [HttpGet("pending")]
    public async Task<ActionResult<ApiResponse<List<PendingResponse>>>> GetPending(CancellationToken ct)
    {
        var pendings = await _dbContext.Pendings
            .OrderByDescending(p => p.DateAdded)
            .ToListAsync(ct);

        var dtos = pendings.Select(p => new PendingResponse
        {
            Id = p.Id,
            OrderNo = p.OrderNo,
            ProductTitle = p.ProductTitle,
            Imei = p.Imei,
            Date = p.DateAdded,
        }).ToList();

        return Ok(ApiResponse<List<PendingResponse>>.Ok(dtos));
    }

    // ── Outgoing ────────────────────────────────────────────────

    /// <summary>
    /// GET /api/products/outgoing-group — Get outgoing products grouped.
    /// </summary>
    [HttpGet("outgoing-group")]
    public async Task<ActionResult<ApiResponse<List<OutgoingRequest>>>> GetOutgoingGroup(CancellationToken ct)
    {
        var outgoings = await _dbContext.Outgoings
            .OrderByDescending(o => o.Date)
            .ToListAsync(ct);

        var dtos = outgoings.Select(o => new OutgoingRequest
        {
            OrderNo = o.OrderNo,
            ProductTitle = o.ProductTitle,
            Imei = o.Imei,
            Date = o.Date ?? DateTime.UtcNow,
            IsPending = o.OrderStatus == "Pending",
        }).ToList();

        return Ok(ApiResponse<List<OutgoingRequest>>.Ok(dtos));
    }

    /// <summary>
    /// POST /api/products/outgoing — Create an outgoing order.
    /// </summary>
    [HttpPost("outgoing")]
    public async Task<ActionResult<ApiResponse<object>>> CreateOutgoing([FromBody] OutgoingRequest request, CancellationToken ct)
    {
        var outgoing = new Outgoing
        {
            OrderNo = request.OrderNo,
            ProductTitle = request.ProductTitle,
            Imei = request.Imei,
            Date = request.Date,
            OrderStatus = request.IsPending ? "Pending" : "Shipped",
        };

        _dbContext.Outgoings.Add(outgoing);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(null, "Outgoing order created"));
    }

    // ── Mapping Helpers ─────────────────────────────────────────

    private static StockDto MapStockToDto(Domain.Entities.Stock s) => new()
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

	private static ProductDto MapProductToDto(Product p) => new()
    {
        Id = p.Id,
        Sku = p.BaseProperties.Sku,
        Model = p.BaseProperties.Model,
        Storage = p.BaseProperties.Storage,
        Color = p.BaseProperties.Color,
        Grade = p.BaseProperties.Grade,
        Cost = p.BaseProperties.Cost.Amount,
        Imei = p.Imei,
        Vendor = p.Vendor,
        InvoiceNumber = p.InvoiceNumber,
        PhoneCheck = p.PhoneCheck,
    };
}
