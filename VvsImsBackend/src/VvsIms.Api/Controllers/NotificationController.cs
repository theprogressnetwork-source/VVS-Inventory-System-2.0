using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Application.DTOs;
using VvsIms.Application.Services;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Notification controller — manages system notifications.
/// Route: /api/notifications (matches frontend API_ROUTES: GET_NOTIFICATION, unread-count, user)
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<NotificationController> _logger;

    public NotificationController(
        INotificationService notificationService,
        IUnitOfWork unitOfWork,
        VvsImsDbContext dbContext,
        ILogger<NotificationController> logger)
    {
        _notificationService = notificationService;
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/notifications/notify — Get all notifications for the current user.
    /// </summary>
    [HttpGet("notify")]
    public async Task<ActionResult<ApiResponse<List<NotificationDto>>>> GetAll(CancellationToken ct)
    {
        var notifications = await _notificationService.GetAllAsync(ct);
        return Ok(ApiResponse<List<NotificationDto>>.Ok(notifications));
    }

    /// <summary>
    /// GET /api/notifications/unread-count — Get count of unread notifications.
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<ApiResponse<int>>> GetUnreadCount(CancellationToken ct)
    {
        var unread = await _notificationService.GetUnreadAsync(ct);
        return Ok(ApiResponse<int>.Ok(unread.Count));
    }

    /// <summary>
    /// GET /api/notifications/user — Get notifications for the current user.
    /// </summary>
    [HttpGet("user")]
    public async Task<ActionResult<ApiResponse<List<NotificationDto>>>> GetUserNotifications(CancellationToken ct)
    {
        var notifications = await _notificationService.GetAllAsync(ct);
        return Ok(ApiResponse<List<NotificationDto>>.Ok(notifications));
    }

    /// <summary>
    /// PUT /api/notifications/{id}/read — Mark a notification as read.
    /// </summary>
    [HttpPut("{id:int}/read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAsRead(int id, CancellationToken ct)
    {
        await _notificationService.MarkAsReadAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(null, "Notification marked as read"));
    }

    /// <summary>
    /// POST /api/notifications — Create a new notification.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<NotificationDto>>> Create([FromBody] NotificationDto dto, CancellationToken ct)
    {
        var notification = await _notificationService.CreateAsync(
            dto.Title, dto.Message, dto.Type, dto.CreatedBy, dto.RelatedEntity, ct);

        return Ok(ApiResponse<NotificationDto>.Ok(notification, "Notification created"));
    }
}
