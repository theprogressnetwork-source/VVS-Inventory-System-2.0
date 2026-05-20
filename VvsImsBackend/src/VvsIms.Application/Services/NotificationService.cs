using VvsIms.Application.DTOs;
using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;

namespace VvsIms.Application.Services;

/// <summary>
/// Notification service implementation for creating and managing system notifications.
/// Uses IRepository<Notification> via IUnitOfWork for data access.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IUnitOfWork _unitOfWork;

    public NotificationService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Creates a new notification.
    /// </summary>
    public async Task<NotificationDto> CreateAsync(string title, string message, string type, string createdBy, string? relatedEntity = null, CancellationToken ct = default)
    {
        var notification = new Notification
        {
            Title = title,
            Message = message,
            Type = type,
            RelatedEntity = relatedEntity,
            IsRead = false,
            CreatedBy = createdBy
        };

        var repo = _unitOfWork.Repository<Notification>();
        await repo.AddAsync(notification, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapToDto(notification);
    }

    /// <summary>
    /// Marks a notification as read.
    /// </summary>
    public async Task MarkAsReadAsync(int notificationId, CancellationToken ct = default)
    {
        var repo = _unitOfWork.Repository<Notification>();
        var notification = await repo.GetByIdAsync(notificationId, ct);
        if (notification != null)
        {
            notification.IsRead = true;
            repo.Update(notification);
            await _unitOfWork.SaveChangesAsync(ct);
        }
    }

    /// <summary>
    /// Gets all unread notifications.
    /// </summary>
    public async Task<List<NotificationDto>> GetUnreadAsync(CancellationToken ct = default)
    {
        var repo = _unitOfWork.Repository<Notification>();
        var notifications = await repo.ListAsync(
            filter: n => !n.IsRead,
            orderBy: n => n.OrderByDescending(x => x.CreatedAtUtc),
            ct: ct);
        return notifications.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Gets all notifications (read and unread).
    /// </summary>
    public async Task<List<NotificationDto>> GetAllAsync(CancellationToken ct = default)
    {
        var repo = _unitOfWork.Repository<Notification>();
        var notifications = await repo.ListAsync(
            filter: null,
            orderBy: n => n.OrderByDescending(x => x.CreatedAtUtc),
            ct: ct);
        return notifications.Select(MapToDto).ToList();
    }

    private static NotificationDto MapToDto(Notification n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Message = n.Message,
        Type = n.Type,
        RelatedEntity = n.RelatedEntity,
        IsRead = n.IsRead,
        CreatedBy = n.CreatedBy,
        CreatedAtUtc = n.CreatedAtUtc
    };
}
