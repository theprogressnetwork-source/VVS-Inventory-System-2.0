using VvsIms.Application.DTOs;

namespace VvsIms.Application.Services;

/// <summary>
/// Notification service interface for creating and managing system notifications.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Creates a new notification.
    /// </summary>
    Task<NotificationDto> CreateAsync(string title, string message, string type, string createdBy, string? relatedEntity = null, CancellationToken ct = default);

    /// <summary>
    /// Marks a notification as read.
    /// </summary>
    Task MarkAsReadAsync(int notificationId, CancellationToken ct = default);

    /// <summary>
    /// Gets all unread notifications.
    /// </summary>
    Task<List<NotificationDto>> GetUnreadAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets all notifications (read and unread).
    /// </summary>
    Task<List<NotificationDto>> GetAllAsync(CancellationToken ct = default);
}
