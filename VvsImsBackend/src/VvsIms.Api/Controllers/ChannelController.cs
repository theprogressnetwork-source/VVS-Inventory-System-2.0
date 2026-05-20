using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Application.DTOs;
using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Channel Mapping controller — manages SKU-to-channel mappings.
/// Route: /api/mappings (matches frontend API_ROUTES: GET_MAPPINGS, SAVE_MAPPINGS, DELETE_MAPPING)
/// </summary>
[ApiController]
[Route("api/mappings")]
[Authorize]
public class ChannelController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<ChannelController> _logger;

    public ChannelController(
        IUnitOfWork unitOfWork,
        VvsImsDbContext dbContext,
        ILogger<ChannelController> logger)
    {
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/mappings — Get all channel mappings.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ChannelMappingDto>>>> GetAll(CancellationToken ct)
    {
        var mappings = await _dbContext.ChannelMappings
            .OrderBy(m => m.SystemSKU)
            .ThenBy(m => m.ChannelName)
            .ToListAsync(ct);

        var dtos = mappings.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<ChannelMappingDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/mappings/{id} — Get a single mapping by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ChannelMappingDto>>> GetById(int id, CancellationToken ct)
    {
        var mapping = await _dbContext.ChannelMappings.FindAsync(new object[] { id }, ct);
        if (mapping is null) return NotFound(ApiResponse<ChannelMappingDto>.Fail("Mapping not found"));

        return Ok(ApiResponse<ChannelMappingDto>.Ok(MapToDto(mapping)));
    }

    /// <summary>
    /// POST /api/mappings — Create a new channel mapping.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ChannelMappingDto>>> Create([FromBody] ChannelMappingRequest request, CancellationToken ct)
    {
        var mapping = new ChannelMapping
        {
            SystemSKU = request.SystemSKU,
            ChannelName = request.ChannelName,
            ChannelSKU = request.ChannelSKU,
            ShopSKU = request.ShopSKU,
        };

        _dbContext.ChannelMappings.Add(mapping);
        await _unitOfWork.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = mapping.Id },
            ApiResponse<ChannelMappingDto>.Ok(MapToDto(mapping), "Mapping created"));
    }

    /// <summary>
    /// POST /api/mappings (bulk) — Create multiple channel mappings at once.
    /// </summary>
    [HttpPost("bulk")]
    public async Task<ActionResult<ApiResponse<List<ChannelMappingDto>>>> CreateBulk([FromBody] List<ChannelMappingRequest> requests, CancellationToken ct)
    {
        var created = new List<ChannelMappingDto>();
        foreach (var req in requests)
        {
            var mapping = new ChannelMapping
            {
                SystemSKU = req.SystemSKU,
                ChannelName = req.ChannelName,
                ChannelSKU = req.ChannelSKU,
                ShopSKU = req.ShopSKU,
            };
            _dbContext.ChannelMappings.Add(mapping);
            created.Add(MapToDto(mapping));
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return Ok(ApiResponse<List<ChannelMappingDto>>.Ok(created, $"{created.Count} mappings created"));
    }

    /// <summary>
    /// PUT /api/mappings/{id} — Update a channel mapping.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<ChannelMappingDto>>> Update(int id, [FromBody] ChannelMappingRequest request, CancellationToken ct)
    {
        var mapping = await _dbContext.ChannelMappings.FindAsync(new object[] { id }, ct);
        if (mapping is null) return NotFound(ApiResponse<ChannelMappingDto>.Fail("Mapping not found"));

        mapping.SystemSKU = request.SystemSKU;
        mapping.ChannelName = request.ChannelName;
        mapping.ChannelSKU = request.ChannelSKU;
        mapping.ShopSKU = request.ShopSKU;

        _dbContext.Entry(mapping).State = EntityState.Modified;
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<ChannelMappingDto>.Ok(MapToDto(mapping), "Mapping updated"));
    }

    /// <summary>
    /// DELETE /api/mappings/{id} — Delete a channel mapping.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken ct)
    {
        var mapping = await _dbContext.ChannelMappings.FindAsync(new object[] { id }, ct);
        if (mapping is null) return NotFound(ApiResponse<object>.Fail("Mapping not found"));

        _dbContext.ChannelMappings.Remove(mapping);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(null, "Mapping deleted"));
    }

    // ── Mapping Helper ──────────────────────────────────────────
    private static ChannelMappingDto MapToDto(ChannelMapping m) => new()
    {
        MappingId = m.Id,
        SystemSKU = m.SystemSKU,
        ChannelName = m.ChannelName,
        ChannelSKU = m.ChannelSKU,
        ShopSKU = m.ShopSKU,
    };
}
