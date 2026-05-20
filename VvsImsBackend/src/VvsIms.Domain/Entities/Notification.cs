namespace VvsIms.Domain.Entities;

/// <summary>
/// System notification entity for alerting users about orders, inventory changes,
/// and system events.
/// </summary>
public class Notification : BaseEntity
{
    /// <summary>
    /// Notification title/subject.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Full notification message body.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Notification type category (e.g., "Order", "Inventory", "System").
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Related entity identifier (e.g., OrderId, ProductId).
    /// </summary>
    public string? RelatedEntity { get; set; }

    /// <summary>
    /// Whether the notification has been read by the user.
    /// </summary>
    public bool IsRead { get; set; }

    /// <summary>
    /// Who created this notification.
    /// </summary>
    public string CreatedBy { get; set; } = string.Empty;
}
