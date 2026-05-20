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
/// Users controller — manages user accounts.
/// Route: /api/users (matches frontend API_ROUTES: GET_ALL_USERS, SAVE_USER, GET_USER_BY_ID, etc.)
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        VvsImsDbContext dbContext,
        ILogger<UsersController> logger)
    {
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/users — Get all users.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetAll(CancellationToken ct)
    {
        var users = await _dbContext.Users
            .Include(u => u.Role)
            .OrderBy(u => u.UserName)
            .ToListAsync(ct);

        var dtos = users.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<UserDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/users/{id} — Get a user by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(int id, CancellationToken ct)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null) return NotFound(ApiResponse<UserDto>.Fail("User not found"));

        return Ok(ApiResponse<UserDto>.Ok(MapToDto(user)));
    }

    /// <summary>
    /// POST /api/users — Create a new user.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        // Check if username already exists
        var existingUser = await _userRepo.GetByUserNameAsync(request.UserName, ct);
        if (existingUser is not null)
            return Conflict(ApiResponse<UserDto>.Fail("Username already exists"));

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var existingEmail = await _userRepo.GetByEmailAsync(request.Email, ct);
            if (existingEmail is not null)
                return Conflict(ApiResponse<UserDto>.Fail("Email already exists"));
        }

        var user = new Domain.Entities.User
        {
            UserName = request.UserName,
            UserFirstName = request.UserFirstName,
            UserLastName = request.UserLastName,
            UserPreferredName = request.UserPreferredName,
            UserPhone = request.UserPhone,
            UserEmail = request.Email ?? string.Empty,
            IsActive = request.IsActive,
            RoleId = request.RoleId,
        };

        var created = await _userRepo.CreateAsync(user, request.Password, ct);

        // Reload with role for DTO mapping
        var reloaded = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == created.Id, ct);

        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            ApiResponse<UserDto>.Ok(MapToDto(reloaded!), "User created"));
    }

    /// <summary>
    /// PUT /api/users/{id} — Update a user.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(int id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null) return NotFound(ApiResponse<UserDto>.Fail("User not found"));

        if (request.UserFirstName is not null) user.UserFirstName = request.UserFirstName;
        if (request.UserLastName is not null) user.UserLastName = request.UserLastName;
        if (request.UserPreferredName is not null) user.UserPreferredName = request.UserPreferredName;
        if (request.UserPhone is not null) user.UserPhone = request.UserPhone;
        if (request.Email is not null) user.UserEmail = request.Email;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
        if (request.RoleId.HasValue) user.RoleId = request.RoleId.Value;

        await _userRepo.UpdateAsync(user, ct);

        // Reload with role
        var reloaded = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        return Ok(ApiResponse<UserDto>.Ok(MapToDto(reloaded!), "User updated"));
    }

    /// <summary>
    /// DELETE /api/users/{id} — Delete a user.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null) return NotFound(ApiResponse<object>.Fail("User not found"));

        await _userRepo.DeleteAsync(id, ct);

        return Ok(ApiResponse<object>.Ok(null, "User deleted"));
    }

    // ── Mapping Helper ──────────────────────────────────────────
    private static UserDto MapToDto(Domain.Entities.User u) => new()
    {
        UserId = u.Id,
        UserFirstName = u.UserFirstName,
        UserLastName = u.UserLastName,
        UserPreferredName = u.UserPreferredName,
        UserPhone = u.UserPhone,
        UserEmail = u.UserEmail,
        IsActive = u.IsActive,
        RoleId = u.RoleId,
        RoleName = u.Role?.RoleName,
        RolePermissions = u.Role?.RolePermissions,
    };
}

/// <summary>
/// Request body for creating a user.
/// </summary>
public class CreateUserRequest
{
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? UserFirstName { get; set; }
    public string? UserLastName { get; set; }
    public string? UserPreferredName { get; set; }
    public string? UserPhone { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public int RoleId { get; set; } = 2; // Default to Operator
}

/// <summary>
/// Request body for updating a user.
/// </summary>
public class UpdateUserRequest
{
    public string? UserFirstName { get; set; }
    public string? UserLastName { get; set; }
    public string? UserPreferredName { get; set; }
    public string? UserPhone { get; set; }
    public string? Email { get; set; }
    public bool? IsActive { get; set; }
    public int? RoleId { get; set; }
}
