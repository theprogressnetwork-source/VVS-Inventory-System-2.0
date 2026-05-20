namespace VvsIms.Domain.Entities;

/// <summary>
/// Role entity for role-based access control.
/// Defines permissions and access levels for users.
/// </summary>
public class Role : BaseEntity
{
    /// <summary>
    /// Name of the role (e.g., "Admin", "Manager", "Operator").
    /// </summary>
    public string RoleName { get; set; } = string.Empty;

    /// <summary>
    /// Description of the role's purpose and scope.
    /// </summary>
    public string? RoleDescription { get; set; }

    /// <summary>
    /// Comma-separated or JSON permission string (e.g., "stock:read,stock:write,inventory:read").
    /// </summary>
    public string? RolePermissions { get; set; }

    /// <summary>
    /// Who created this role record.
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// Who last updated this role record.
    /// </summary>
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// Navigation property to users assigned this role.
    /// </summary>
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
