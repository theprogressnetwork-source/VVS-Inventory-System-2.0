namespace VvsIms.Domain.Entities;

/// <summary>
/// User entity for authentication and authorization.
/// Supports JWT refresh token flow, HMACSHA512 password hashing,
/// and role-based access control.
/// </summary>
public class User : BaseEntity
{
    /// <summary>
    /// User's login name — unique identifier for authentication.
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// User's first name.
    /// </summary>
    public string? UserFirstName { get; set; }

    /// <summary>
    /// User's last name.
    /// </summary>
    public string? UserLastName { get; set; }

    /// <summary>
    /// User's preferred display name.
    /// </summary>
    public string? UserPreferredName { get; set; }

    /// <summary>
    /// User's phone number.
    /// </summary>
    public string? UserPhone { get; set; }

    /// <summary>
    /// User's email address — used for JWT claims and communication.
    /// </summary>
    public string UserEmail { get; set; } = string.Empty;

    /// <summary>
    /// Legacy password field — kept for data migration compatibility.
    /// New auth uses PasswordHash + PasswordSalt (HMACSHA512).
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// HMACSHA512 password hash — computed with the PasswordSalt as the key.
    /// </summary>
    public byte[]? PasswordHash { get; set; }

    /// <summary>
    /// HMACSHA512 password salt — random key generated per user at creation.
    /// </summary>
    public byte[]? PasswordSalt { get; set; }

    /// <summary>
    /// JWT refresh token for token renewal flow.
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// Expiry time of the current refresh token.
    /// </summary>
    public DateTime? RefreshTokenExpiryTime { get; set; }

    /// <summary>
    /// Whether the user account is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Who created this user record.
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// Who last updated this user record.
    /// </summary>
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// Foreign key to the user's assigned role.
    /// Type must match Role.Id (int from BaseEntity).
    /// </summary>
    public int RoleId { get; set; }

    /// <summary>
    /// Navigation property to the user's role.
    /// </summary>
    public virtual Role? Role { get; set; }
}
