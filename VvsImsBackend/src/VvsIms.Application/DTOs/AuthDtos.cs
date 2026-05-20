using System.Text.Json.Serialization;

namespace VvsIms.Application.DTOs;

/// <summary>
/// Login request DTO — accepts either Email or UserName + Password.
/// Frontend sends { "email": "...", "password": "..." } which maps here.
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// User's email address. Frontend sends this as the "email" JSON field.
    /// Used for email-based login (primary flow from the Angular UI).
    /// </summary>
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's login name. Optional — used for username-based login.
    /// If both Email and UserName are provided, Email takes precedence.
    /// </summary>
    [JsonPropertyName("userName")]
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// User's plaintext password (hashed server-side with HMACSHA512).
    /// </summary>
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Login response DTO — access token in body, refresh token in httpOnly cookie.
/// Matches the frontend AuthResponse interface exactly.
/// </summary>
public class LoginResponse
{
    /// <summary>
    /// JWT access token for API authorization.
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// User's display name.
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// Name of the user's assigned role.
    /// </summary>
    public string RoleName { get; set; } = string.Empty;

    /// <summary>
    /// Primary key of the user's assigned role.
    /// </summary>
    public int RoleId { get; set; }

    /// <summary>
    /// Human-readable status message.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Refresh response DTO — new access token in body, new refresh token in httpOnly cookie.
/// </summary>
public class RefreshResponse
{
    /// <summary>
    /// New JWT access token.
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable status message.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Register request DTO — Admin-only user creation.
/// </summary>
public class RegisterRequest
{
    /// <summary>
    /// New user's login name.
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// New user's email address.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// New user's plaintext password (hashed server-side with HMACSHA512).
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Role to assign — defaults to User (Id = two).
    /// </summary>
    public int RoleId { get; set; } = 2;
}
