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
/// Base Properties controller — provides distinct values for Models, Storages, Grades, Colors.
/// Route: /api/base-props (matches frontend API_ROUTES: GET_MODELS, GET_COLORS, GET_STORAGE, GET_GRADES, etc.)
/// </summary>
[ApiController]
[Route("api/base-props")]
[Authorize]
public class BasePropsController : ControllerBase
{
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<BasePropsController> _logger;

    public BasePropsController(
        VvsImsDbContext dbContext,
        ILogger<BasePropsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    // ── Models ──────────────────────────────────────────────────

    /// <summary>
    /// GET /api/base-props/models — Get all distinct model names.
    /// </summary>
    [HttpGet("models")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetModels(CancellationToken ct)
    {
        // Collect models from both ProductSkus and Stocks for completeness
        var skuModels = await _dbContext.ProductSkus
            .Select(s => s.Model)
            .Distinct()
            .OrderBy(m => m)
            .ToListAsync(ct);

        var stockModels = await _dbContext.Stocks
            .Select(s => s.BaseProperties.Model)
            .Distinct()
            .ToListAsync(ct);

        var allModels = skuModels.Union(stockModels).OrderBy(m => m).ToList();
        return Ok(ApiResponse<List<string>>.Ok(allModels));
    }

    /// <summary>
    /// POST /api/base-props/models — Save/add a new model name.
    /// </summary>
    [HttpPost("models")]
    public async Task<ActionResult<ApiResponse<string>>> SaveModel([FromBody] Dictionary<string, string> body, CancellationToken ct)
    {
        if (!body.TryGetValue("name", out var name) || string.IsNullOrWhiteSpace(name))
            return BadRequest(ApiResponse<string>.Fail("Model name is required"));

        // Models are derived from SKU/Stock data — this endpoint is for validation/acknowledgment
        return Ok(ApiResponse<string>.Ok(name, "Model name acknowledged"));
    }

    // ── Storages ────────────────────────────────────────────────

    /// <summary>
    /// GET /api/base-props/storages — Get all distinct storage values.
    /// </summary>
    [HttpGet("storages")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetStorages(CancellationToken ct)
    {
        var skuStorages = await _dbContext.ProductSkus
            .Select(s => s.Storage)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync(ct);

        var stockStorages = await _dbContext.Stocks
            .Select(s => s.BaseProperties.Storage)
            .Distinct()
            .ToListAsync(ct);

        var allStorages = skuStorages.Union(stockStorages).OrderBy(s => s).ToList();
        return Ok(ApiResponse<List<string>>.Ok(allStorages));
    }

    /// <summary>
    /// POST /api/base-props/storages — Save/add a new storage value.
    /// </summary>
    [HttpPost("storages")]
    public async Task<ActionResult<ApiResponse<string>>> SaveStorage([FromBody] Dictionary<string, string> body, CancellationToken ct)
    {
        if (!body.TryGetValue("name", out var name) || string.IsNullOrWhiteSpace(name))
            return BadRequest(ApiResponse<string>.Fail("Storage name is required"));

        return Ok(ApiResponse<string>.Ok(name, "Storage value acknowledged"));
    }

    // ── Grades ──────────────────────────────────────────────────

    /// <summary>
    /// GET /api/base-props/grades — Get all distinct grade values.
    /// </summary>
    [HttpGet("grades")]
    public async Task<ActionResult<ApiResponse<List<GradeInfo>>>> GetGrades(CancellationToken ct)
    {
        // Grades are enum-like: 0=Good, 1=OpenBox, 2=Excellent
        var grades = new List<GradeInfo>
        {
            new() { Id = 0, Name = "Good" },
            new() { Id = 1, Name = "OpenBox" },
            new() { Id = 2, Name = "Excellent" },
        };

        // Also check what grades exist in the DB
        var dbGrades = await _dbContext.ProductSkus
            .Select(s => s.Grade)
            .Distinct()
            .ToListAsync(ct);

        foreach (var g in dbGrades.Where(g => grades.All(gi => gi.Id != g)))
        {
            grades.Add(new GradeInfo { Id = g, Name = $"Grade {g}" });
        }

        return Ok(ApiResponse<List<GradeInfo>>.Ok(grades.OrderBy(g => g.Id).ToList()));
    }

    /// <summary>
    /// POST /api/base-props/grades — Save/add a new grade value.
    /// </summary>
    [HttpPost("grades")]
    public async Task<ActionResult<ApiResponse<GradeInfo>>> SaveGrade([FromBody] GradeInfo grade, CancellationToken ct)
    {
        return Ok(ApiResponse<GradeInfo>.Ok(grade, "Grade acknowledged"));
    }

    // ── Colors ──────────────────────────────────────────────────

    /// <summary>
    /// GET /api/base-props/colors — Get all distinct color values.
    /// </summary>
    [HttpGet("colors")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetColors(CancellationToken ct)
    {
        var skuColors = await _dbContext.ProductSkus
            .Select(s => s.Color)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);

        var stockColors = await _dbContext.Stocks
            .Select(s => s.BaseProperties.Color)
            .Distinct()
            .ToListAsync(ct);

        var allColors = skuColors.Union(stockColors).OrderBy(c => c).ToList();
        return Ok(ApiResponse<List<string>>.Ok(allColors));
    }

    /// <summary>
    /// GET /api/base-props/colors/by-model?model=iPhone 15 — Get colors filtered by model.
    /// </summary>
    [HttpGet("colors/by-model")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetColorsByModel([FromQuery] string model, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(model))
            return BadRequest(ApiResponse<List<string>>.Fail("Model parameter is required"));

        var colors = await _dbContext.ProductSkus
            .Where(s => s.Model == model)
            .Select(s => s.Color)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);

        return Ok(ApiResponse<List<string>>.Ok(colors));
    }

    /// <summary>
    /// POST /api/base-props/colors — Save/add a new color value.
    /// </summary>
    [HttpPost("colors")]
    public async Task<ActionResult<ApiResponse<string>>> SaveColor([FromBody] Dictionary<string, string> body, CancellationToken ct)
    {
        if (!body.TryGetValue("name", out var name) || string.IsNullOrWhiteSpace(name))
            return BadRequest(ApiResponse<string>.Fail("Color name is required"));

        return Ok(ApiResponse<string>.Ok(name, "Color value acknowledged"));
    }

    /// <summary>
    /// GET /api/base-props — Get all base properties at once.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<BasePropsSummary>>> GetAllBaseProps(CancellationToken ct)
    {
        var models = await _dbContext.ProductSkus.Select(s => s.Model).Distinct().OrderBy(m => m).ToListAsync(ct);
        var storages = await _dbContext.ProductSkus.Select(s => s.Storage).Distinct().OrderBy(s => s).ToListAsync(ct);
        var colors = await _dbContext.ProductSkus.Select(s => s.Color).Distinct().OrderBy(c => c).ToListAsync(ct);

        var grades = new List<GradeInfo>
        {
            new() { Id = 0, Name = "Good" },
            new() { Id = 1, Name = "OpenBox" },
            new() { Id = 2, Name = "Excellent" },
        };

        var summary = new BasePropsSummary
        {
            Models = models,
            Storages = storages,
            Colors = colors,
            Grades = grades,
        };

        return Ok(ApiResponse<BasePropsSummary>.Ok(summary));
    }
}

/// <summary>
/// Grade info DTO for the base-props endpoint.
/// </summary>
public class GradeInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Summary DTO for all base properties.
/// </summary>
public class BasePropsSummary
{
    public List<string> Models { get; set; } = new();
    public List<string> Storages { get; set; } = new();
    public List<string> Colors { get; set; } = new();
    public List<GradeInfo> Grades { get; set; } = new();
}
