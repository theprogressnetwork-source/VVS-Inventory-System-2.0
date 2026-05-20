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

namespace VvsIms.Api.Controllers;

/// <summary>
/// SKU controller — manages product SKU registry.
/// Route: /api/skus (matches frontend API_ROUTES: GET_SKU, SAVE_SKU, UPDATE_SKU, SKU_BULK_UPLOAD)
/// </summary>
[ApiController]
[Route("api/skus")]
[Authorize]
public class SkuController : ControllerBase
{
    private readonly ISkuRepository _skuRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<SkuController> _logger;

    public SkuController(
        ISkuRepository skuRepo,
        IUnitOfWork unitOfWork,
        VvsImsDbContext dbContext,
        ILogger<SkuController> logger)
    {
        _skuRepo = skuRepo;
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/skus — Get all SKUs.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProductSkuDto>>>> GetAll(CancellationToken ct)
    {
        var skus = await _dbContext.ProductSkus
            .OrderBy(s => s.Sku)
            .ToListAsync(ct);

        var dtos = skus.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<ProductSkuDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/skus/{id} — Get SKU by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductSkuDto>>> GetById(int id, CancellationToken ct)
    {
        var sku = await _skuRepo.GetByIdAsync(id, ct);
        if (sku is null) return NotFound(ApiResponse<ProductSkuDto>.Fail("SKU not found"));

        return Ok(ApiResponse<ProductSkuDto>.Ok(MapToDto(sku)));
    }

    /// <summary>
    /// POST /api/skus — Create a new SKU.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductSkuDto>>> Create([FromBody] SkuGenerationRequest request, CancellationToken ct)
    {
        // Check if SKU already exists for this combination
        var existing = await _dbContext.ProductSkus
            .FirstOrDefaultAsync(s =>
                s.Model == request.Model &&
                s.Storage == request.Storage &&
                s.Color == request.Color &&
                s.Grade == request.Grade, ct);

        if (existing is not null)
            return Ok(ApiResponse<ProductSkuDto>.Ok(MapToDto(existing), "SKU already exists"));

        // Generate SKU code: 8-digit random numeric
        var random = new Random();
        var skuCode = random.Next(10000000, 99999999).ToString();

        // Ensure uniqueness
        while (await _dbContext.ProductSkus.AnyAsync(s => s.Sku == skuCode, ct))
        {
            skuCode = random.Next(10000000, 99999999).ToString();
        }

        var productSku = new Domain.Entities.ProductSku
        {
            Sku = skuCode,
            Model = request.Model,
            Storage = request.Storage,
            Color = request.Color,
            Grade = request.Grade,
        };

        var created = await _skuRepo.AddAsync(productSku, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            ApiResponse<ProductSkuDto>.Ok(MapToDto(created), "SKU created"));
    }

    /// <summary>
    /// PUT /api/skus — Update an existing SKU.
    /// </summary>
    [HttpPut]
    public async Task<ActionResult<ApiResponse<ProductSkuDto>>> Update([FromBody] ProductSkuDto dto, CancellationToken ct)
    {
        var sku = await _skuRepo.GetByIdAsync(dto.Id, ct);
        if (sku is null) return NotFound(ApiResponse<ProductSkuDto>.Fail("SKU not found"));

        sku.Sku = dto.Sku;
        sku.Model = dto.Model;
        sku.Storage = dto.Storage;
        sku.Color = dto.Color;
        sku.Grade = dto.Grade;

        _skuRepo.Update(sku);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<ProductSkuDto>.Ok(MapToDto(sku), "SKU updated"));
    }

    /// <summary>
    /// DELETE /api/skus/{id} — Delete a SKU.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken ct)
    {
        var sku = await _skuRepo.GetByIdAsync(id, ct);
        if (sku is null) return NotFound(ApiResponse<object>.Fail("SKU not found"));

        _skuRepo.Remove(sku);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(null, "SKU deleted"));
    }

    /// <summary>
    /// POST /api/skus/bulk — Bulk upload SKUs.
    /// </summary>
    [HttpPost("bulk")]
    public async Task<ActionResult<ApiResponse<List<ProductSkuDto>>>> BulkUpload([FromBody] List<SkuGenerationRequest> requests, CancellationToken ct)
    {
        var created = new List<ProductSkuDto>();
        var random = new Random();

        foreach (var req in requests)
        {
            var existing = await _dbContext.ProductSkus
                .FirstOrDefaultAsync(s =>
                    s.Model == req.Model &&
                    s.Storage == req.Storage &&
                    s.Color == req.Color &&
                    s.Grade == req.Grade, ct);

            if (existing is not null)
            {
                created.Add(MapToDto(existing));
                continue;
            }

            var skuCode = random.Next(10000000, 99999999).ToString();
            while (await _dbContext.ProductSkus.AnyAsync(s => s.Sku == skuCode, ct))
                skuCode = random.Next(10000000, 99999999).ToString();

            var productSku = new Domain.Entities.ProductSku
            {
                Sku = skuCode,
                Model = req.Model,
                Storage = req.Storage,
                Color = req.Color,
                Grade = req.Grade,
            };

            var entity = await _skuRepo.AddAsync(productSku, ct);
            created.Add(MapToDto(entity));
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return Ok(ApiResponse<List<ProductSkuDto>>.Ok(created, $"{created.Count} SKUs processed"));
    }

    // ── Mapping Helper ──────────────────────────────────────────
    private static ProductSkuDto MapToDto(Domain.Entities.ProductSku s) => new()
    {
        Id = s.Id,
        Sku = s.Sku,
        Model = s.Model,
        Storage = s.Storage,
        Color = s.Color,
        Grade = s.Grade,
        GradeName = s.Grade switch
        {
            0 => "Good",
            1 => "OpenBox",
            2 => "Excellent",
            _ => "N/A"
        },
    };
}
