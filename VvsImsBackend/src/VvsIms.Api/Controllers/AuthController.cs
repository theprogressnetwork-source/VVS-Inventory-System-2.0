using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VvsIms.Application.DTOs;
using VvsIms.Application.Services;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Authentication controller — handles login, refresh, logout, and registration.
/// Access tokens are returned in the response body.
/// Refresh tokens are managed via httpOnly cookies for maximum security.
/// Cookie path is scoped to /api/auth to limit exposure.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly ILogger<AuthController> _logger;

    // ── Cookie constants ──────────────────────────────────────────
    private const string RefreshTokenCookieName = "refresh_token";
    private const string CookiePath = "/api/auth";

    public AuthController(AuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/auth/login — Authenticates user credentials.
    /// Returns access token in body, sets refresh token as httpOnly cookie.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        try
        {
            var (response, refreshToken) = await _authService.LoginAsync(request, ct);

            // ── Set httpOnly cookie for refresh token ──────────────
            Response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = CookiePath
            });

            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Login failed: {Message}", ex.Message);
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/auth/refresh — Renews access token using httpOnly refresh token cookie.
    /// Implements token rotation — old refresh token is replaced with a new one.
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(RefreshResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        // ── Read refresh token from httpOnly cookie ────────────────
        if (!Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken))
        {
            return Unauthorized(new { message = "Refresh token is missing." });
        }

        try
        {
            var (response, newRefreshToken) = await _authService.RefreshAsync(refreshToken, ct);

            // ── Set new httpOnly cookie (token rotation) ────────────
            Response.Cookies.Append(RefreshTokenCookieName, newRefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = CookiePath
            });

            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Token refresh failed: {Message}", ex.Message);

            // ── Clear invalid/expired cookie ────────────────────────
            Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions { Path = CookiePath });

            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/auth/logout — Clears refresh token cookie and revokes token in database.
    /// </summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        // ── Clear httpOnly cookie ──────────────────────────────────
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions { Path = CookiePath });

        // ── Attempt to revoke refresh token in database ────────────
        // Extract user ID from JWT claims if available
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim is not null && int.TryParse(userIdClaim.Value, out var userId))
        {
            await _authService.LogoutAsync(userId, ct);
        }

        _logger.LogInformation("User logged out.");
        return Ok(new { message = "Logged out successfully." });
    }

    /// <summary>
    /// POST /api/auth/register — Admin-only user registration.
    /// Creates a new user with HMACSHA512-hashed password.
    /// </summary>
    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        try
        {
            var response = await _authService.RegisterAsync(request, ct);
            return CreatedAtAction(nameof(Register), new { userName = request.UserName }, response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Registration failed: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }
}
