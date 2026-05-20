using Microsoft.Extensions.Logging;
using VvsIms.Application.DTOs;
using VvsIms.Application.Interfaces;
using VvsIms.Domain.Entities;

namespace VvsIms.Application.Services;

/// <summary>
/// Authentication service — orchestrates login, refresh, logout, and registration.
/// Uses IUserRepository for data access and IJwtService for token generation.
/// All secrets come from environment variables via EnvironmentSecretProvider.
/// Clean Architecture compliant — no Infrastructure dependencies in Application layer.
/// </summary>
public class AuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IJwtService jwtService,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a user and returns access token + refresh token.
    /// Access token is returned in the response body.
    /// Refresh token is stored in the database and set as httpOnly cookie by the controller.
    /// </summary>
    public async Task<(LoginResponse Response, string RefreshToken)> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        // ── Validate credentials — email takes precedence over userName ──
        // Frontend sends { "email": "...", "password": "..." } via the login form.
        // Swagger/API clients can also send { "userName": "...", "password": "..." }.
        User? user;
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            user = await _userRepository.ValidateCredentialsByEmailAsync(request.Email, request.Password, ct);
            if (user is null)
            {
                _logger.LogWarning("Login failed for email: {Email}", request.Email);
                throw new UnauthorizedAccessException("Invalid email or password.");
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.UserName))
        {
            user = await _userRepository.ValidateCredentialsAsync(request.UserName, request.Password, ct);
            if (user is null)
            {
                _logger.LogWarning("Login failed for user: {UserName}", request.UserName);
                throw new UnauthorizedAccessException("Invalid username or password.");
            }
        }
        else
        {
            throw new ArgumentException("Either Email or UserName must be provided.");
        }

        // ── Generate tokens ──────────────────────────────────────
        var roleName = user.Role?.RoleName ?? await _userRepository.GetRoleNameAsync(user.RoleId, ct) ?? "Unknown";
        var accessToken = _jwtService.GenerateAccessToken(user.Id, user.UserEmail, roleName, user.RoleId);
        var refreshToken = _jwtService.GenerateRefreshToken();
        var refreshTokenExpiry = _jwtService.GetRefreshTokenExpiry();

        // ── Store refresh token in database ───────────────────────
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = refreshTokenExpiry;
        await _userRepository.UpdateAsync(user, ct);

        _logger.LogInformation("Login successful: {UserName} (Role={RoleName})", user.UserName, roleName);

        var response = new LoginResponse
        {
            AccessToken = accessToken,
            UserName = user.UserName ?? user.UserEmail,
            RoleName = roleName,
            RoleId = user.RoleId,
            Message = "Login successful."
        };

        return (response, refreshToken);
    }

    /// <summary>
    /// Validates a refresh token and issues a new access token + refresh token.
    /// Implements token rotation — old refresh token is replaced with a new one.
    /// </summary>
    public async Task<(RefreshResponse Response, string NewRefreshToken)> RefreshAsync(string? refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new UnauthorizedAccessException("Refresh token is missing.");
        }

        // ── Find user by refresh token ────────────────────────────
        var allUsers = await _userRepository.GetAllAsync(ct);
        var user = allUsers.FirstOrDefault(u => u.RefreshToken == refreshToken);

        if (user is null)
        {
            _logger.LogWarning("Refresh token not found in database.");
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        if (user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            _logger.LogWarning("Refresh token expired for user: {UserName}", user.UserName);
            // Clear expired token
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userRepository.UpdateAsync(user, ct);
            throw new UnauthorizedAccessException("Refresh token has expired. Please log in again.");
        }

        // ── Generate new tokens (rotation) ────────────────────────
        var roleName = user.Role?.RoleName ?? await _userRepository.GetRoleNameAsync(user.RoleId, ct) ?? "Unknown";
        var newAccessToken = _jwtService.GenerateAccessToken(user.Id, user.UserEmail, roleName, user.RoleId);
        var newRefreshToken = _jwtService.GenerateRefreshToken();
        var newRefreshTokenExpiry = _jwtService.GetRefreshTokenExpiry();

        // ── Store new refresh token (rotation) ─────────────────────
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = newRefreshTokenExpiry;
        await _userRepository.UpdateAsync(user, ct);

        _logger.LogInformation("Token refreshed for user: {UserName}", user.UserName);

        var response = new RefreshResponse
        {
            AccessToken = newAccessToken,
            Message = "Token refreshed successfully."
        };

        return (response, newRefreshToken);
    }

    /// <summary>
    /// Revokes the refresh token for a user, effectively logging them out.
    /// </summary>
    public async Task LogoutAsync(int userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user is not null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userRepository.UpdateAsync(user, ct);
            _logger.LogInformation("User logged out: Id={UserId}", userId);
        }
    }

    /// <summary>
    /// Registers a new user with HMACSHA512-hashed password.
    /// Should only be called by Admin users (enforced via [Authorize] on controller).
    /// </summary>
    public async Task<LoginResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        // ── Check for duplicate user name ──────────────────────────
        var existingUser = await _userRepository.GetByUserNameAsync(request.UserName, ct);
        if (existingUser is not null)
        {
            throw new InvalidOperationException($"Username '{request.UserName}' is already taken.");
        }

        // ── Check for duplicate email ──────────────────────────────
        var existingEmail = await _userRepository.GetByEmailAsync(request.Email, ct);
        if (existingEmail is not null)
        {
            throw new InvalidOperationException($"Email '{request.Email}' is already registered.");
        }

        // ── Create user with hashed password ──────────────────────
        var user = new User
        {
            UserName = request.UserName,
            UserEmail = request.Email,
            RoleId = request.RoleId,
            IsActive = true,
            CreatedBy = "Admin"
        };

        await _userRepository.CreateAsync(user, request.Password, ct);

        var roleName = await _userRepository.GetRoleNameAsync(request.RoleId, ct) ?? "Unknown";

        _logger.LogInformation("User registered: {UserName} (Role={RoleName})", user.UserName, roleName);

        return new LoginResponse
        {
            AccessToken = string.Empty, // No auto-login on registration
            UserName = user.UserName,
            RoleName = roleName,
            RoleId = request.RoleId,
            Message = "User registered successfully."
        };
    }
}
