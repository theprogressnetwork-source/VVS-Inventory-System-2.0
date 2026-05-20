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
using VvsIms.Domain.Enums;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Inventory controller — manages aggregate inventory records with channel pricing.
/// Route: /api/inventory (matches frontend API_ROUTES: GET_ALL_INVENTORY)
/// </summary>
[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryRepository _inventoryRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(
        IInventoryRepository inventoryRepo,
        IUnitOfWork unitOfWork,
        VvsImsDbContext dbContext,
        ILogger<InventoryController> logger)
    {
        _inventoryRepo = inventoryRepo;
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/inventory — Get all inventory aggregate records.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetAll(CancellationToken ct)
    {
        var inventories = await _dbContext.Inventories
            .Include(i => i.InventoryItems)
            .OrderByDescending(i => i.CreatedAtUtc)
            .ToListAsync(ct);

        var dtos = inventories.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<InventoryDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/inventory/{id} — Get a single inventory record by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> GetById(int id, CancellationToken ct)
    {
        var inventory = await _inventoryRepo.GetWithItemsAsync(id, ct);
        if (inventory is null) return NotFound(ApiResponse<InventoryDto>.Fail("Inventory record not found"));

        return Ok(ApiResponse<InventoryDto>.Ok(MapToDto(inventory)));
    }

    /// <summary>
    /// GET /api/inventory/by-sku?sku=XXX — Get inventory by SKU.
    /// </summary>
    [HttpGet("by-sku")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> GetBySku([FromQuery] string sku, CancellationToken ct)
    {
        var inventory = await _inventoryRepo.GetBySkuAsync(sku, ct);
        if (inventory is null) return NotFound(ApiResponse<InventoryDto>.Fail("Inventory record not found"));

        return Ok(ApiResponse<InventoryDto>.Ok(MapToDto(inventory)));
    }

    /// <summary>
    /// GET /api/inventory/winning — Get all winning inventory items.
    /// </summary>
    [HttpGet("winning")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetWinning(CancellationToken ct)
    {
        var inventories = await _inventoryRepo.GetWinningItemsAsync(ct);
        var dtos = inventories.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<InventoryDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/inventory/by-platform?platform=BestBuy — Get inventory by platform.
    /// </summary>
    [HttpGet("by-platform")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetByPlatform([FromQuery] string platform, CancellationToken ct)
    {
        if (!Enum.TryParse<BuyingPlatformEnum>(platform, true, out var platformEnum))
            platformEnum = BuyingPlatformEnum.BestBuy;

        var inventories = await _inventoryRepo.GetByPlatformAsync(platformEnum, ct);
        var dtos = inventories.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<InventoryDto>>.Ok(dtos));
    }

    /// <summary>
    /// POST /api/inventory — Create a new inventory record.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> Create([FromBody] InventoryDto dto, CancellationToken ct)
    {
        var inventory = new Domain.Entities.Inventory
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
            Quantity = dto.Quantity,
            Winning = dto.Winning,
            Platform = Enum.TryParse<BuyingPlatformEnum>(dto.Platform, true, out var p) ? p : BuyingPlatformEnum.BestBuy,
            PlatformPrice = dto.PlatformPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformPrice.Value) : null,
            PlatformDiscountPrice = dto.PlatformDiscountPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformDiscountPrice.Value) : null,
            PlatformDiscountStartDate = dto.PlatformDiscountStartDate,
            PlatformDiscountEndDate = dto.PlatformDiscountEndDate,
            PlatformQuantity = dto.PlatformQuantity,
            PlatformSkuTitle = dto.PlatformSkuTitle,
            PlatformWinningOffer = dto.PlatformWinningOffer,
            PlatformWinnerPrice = dto.PlatformWinnerPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformWinnerPrice.Value) : null,
            PlatformWinnerShippingPrice = dto.PlatformWinnerShippingPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformWinnerShippingPrice.Value) : null,
            PlatformDifference = dto.PlatformDifference.HasValue ? new Domain.ValueObjects.Money(dto.PlatformDifference.Value) : null,
        };

        var created = await _inventoryRepo.AddAsync(inventory, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            ApiResponse<InventoryDto>.Ok(MapToDto(created), "Inventory record created"));
    }

    /// <summary>
    /// PUT /api/inventory/{id} — Update an inventory record.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> Update(int id, [FromBody] InventoryDto dto, CancellationToken ct)
    {
        var inventory = await _inventoryRepo.GetByIdAsync(id, ct);
        if (inventory is null) return NotFound(ApiResponse<InventoryDto>.Fail("Inventory record not found"));

        inventory.BaseProperties.Model = dto.Model;
        inventory.BaseProperties.Storage = dto.Storage;
        inventory.BaseProperties.Color = dto.Color;
        inventory.BaseProperties.Grade = dto.Grade;
        inventory.BaseProperties.Sku = dto.Sku;
        inventory.BaseProperties.Cost = new Domain.ValueObjects.Money(dto.Cost);
        inventory.Quantity = dto.Quantity;
        inventory.Winning = dto.Winning;
        inventory.Platform = Enum.TryParse<BuyingPlatformEnum>(dto.Platform, true, out var p) ? p : BuyingPlatformEnum.BestBuy;
        inventory.PlatformPrice = dto.PlatformPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformPrice.Value) : null;
        inventory.PlatformDiscountPrice = dto.PlatformDiscountPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformDiscountPrice.Value) : null;
        inventory.PlatformDiscountStartDate = dto.PlatformDiscountStartDate;
        inventory.PlatformDiscountEndDate = dto.PlatformDiscountEndDate;
        inventory.PlatformQuantity = dto.PlatformQuantity;
        inventory.PlatformSkuTitle = dto.PlatformSkuTitle;
        inventory.PlatformWinningOffer = dto.PlatformWinningOffer;
        inventory.PlatformWinnerPrice = dto.PlatformWinnerPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformWinnerPrice.Value) : null;
        inventory.PlatformWinnerShippingPrice = dto.PlatformWinnerShippingPrice.HasValue ? new Domain.ValueObjects.Money(dto.PlatformWinnerShippingPrice.Value) : null;
        inventory.PlatformDifference = dto.PlatformDifference.HasValue ? new Domain.ValueObjects.Money(dto.PlatformDifference.Value) : null;

        _inventoryRepo.Update(inventory);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<InventoryDto>.Ok(MapToDto(inventory), "Inventory record updated"));
    }

    /// <summary>
    /// DELETE /api/inventory/{id} — Delete an inventory record.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken ct)
    {
        var inventory = await _inventoryRepo.GetByIdAsync(id, ct);
        if (inventory is null) return NotFound(ApiResponse<object>.Fail("Inventory record not found"));

        _inventoryRepo.Remove(inventory);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(null, "Inventory record deleted"));
    }

    // ── Mapping Helper ──────────────────────────────────────────
    private static InventoryDto MapToDto(Domain.Entities.Inventory i) => new()
    {
        Id = i.Id,
        Sku = i.BaseProperties.Sku,
        Model = i.BaseProperties.Model,
        Storage = i.BaseProperties.Storage,
        Color = i.BaseProperties.Color,
        Grade = i.BaseProperties.Grade,
        GradeName = i.BaseProperties.GradeName,
        Cost = i.BaseProperties.Cost.Amount,
        Quantity = i.Quantity,
        Winning = i.Winning,
        Platform = i.Platform.ToString(),
        PlatformPrice = i.PlatformPrice?.Amount,
        PlatformDiscountPrice = i.PlatformDiscountPrice?.Amount,
        PlatformDiscountStartDate = i.PlatformDiscountStartDate,
        PlatformDiscountEndDate = i.PlatformDiscountEndDate,
        PlatformQuantity = i.PlatformQuantity,
        PlatformSkuTitle = i.PlatformSkuTitle,
        PlatformWinningOffer = i.PlatformWinningOffer,
        PlatformWinnerPrice = i.PlatformWinnerPrice?.Amount,
        PlatformWinnerShippingPrice = i.PlatformWinnerShippingPrice?.Amount,
        PlatformDifference = i.PlatformDifference?.Amount,
    };
}
