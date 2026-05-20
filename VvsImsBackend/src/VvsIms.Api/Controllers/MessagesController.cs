using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Application.DTOs;
using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Messages controller — manages BestBuy marketplace thread messages.
/// Route: /api/messages (matches frontend API_ROUTES: GET_ALL_MESSAGES, THREAD_RESOLVED, SEND_THREAD_MESSAGE)
/// </summary>
[ApiController]
[Route("api/messages")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly VvsImsDbContext _dbContext;
    private readonly ILogger<MessagesController> _logger;

    public MessagesController(
        IUnitOfWork unitOfWork,
        VvsImsDbContext dbContext,
        ILogger<MessagesController> logger)
    {
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/messages — Get all thread messages.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ThreadMessageDto>>>> GetAll(CancellationToken ct)
    {
        var messages = await _dbContext.ThreadMessages
            .OrderByDescending(m => m.MessageDate)
            .ToListAsync(ct);

        var dtos = messages.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<ThreadMessageDto>>.Ok(dtos));
    }

    /// <summary>
    /// GET /api/messages/thread/{threadId} — Get all messages for a specific thread.
    /// </summary>
    [HttpGet("thread/{threadId}")]
    public async Task<ActionResult<ApiResponse<List<ThreadMessageDto>>>> GetByThread(string threadId, CancellationToken ct)
    {
        var messages = await _dbContext.ThreadMessages
            .Where(m => m.ThreadId == threadId)
            .OrderBy(m => m.MessageDate)
            .ToListAsync(ct);

        var dtos = messages.Select(MapToDto).ToList();
        return Ok(ApiResponse<List<ThreadMessageDto>>.Ok(dtos));
    }

    /// <summary>
    /// PUT /api/messages/resolve/{threadId} — Mark a thread as resolved.
    /// </summary>
    [HttpPut("resolve/{threadId}")]
    public async Task<ActionResult<ApiResponse<object>>> ResolveThread(string threadId, CancellationToken ct)
    {
        var threadStatus = await _dbContext.ThreadStatuses
            .FirstOrDefaultAsync(ts => ts.ThreadId == threadId, ct);

        if (threadStatus is not null)
        {
            threadStatus.Status = "Resolved";
            _dbContext.Entry(threadStatus).State = EntityState.Modified;
        }
        else
        {
            _dbContext.ThreadStatuses.Add(new ThreadStatus
            {
                ThreadId = threadId,
                Status = "Resolved",
                OrderId = ""
            });
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(null, "Thread resolved"));
    }

    /// <summary>
    /// POST /api/messages/send/{threadId} — Send a response to a thread.
    /// </summary>
    [HttpPost("send/{threadId}")]
    public async Task<ActionResult<ApiResponse<ThreadResponseDto>>> SendThreadMessage(
        string threadId, [FromBody] SendThreadMessageRequest request, CancellationToken ct)
    {
        var response = new ThreadResponse
        {
            ThreadId = threadId,
            OrderId = request.OrderId ?? "",
            RespondedBy = request.RespondedBy ?? User.Identity?.Name ?? "System",
            Response = request.Response,
            ResponseDate = DateTime.UtcNow,
            Tag = request.Tag,
        };

        _dbContext.ThreadResponses.Add(response);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<ThreadResponseDto>.Ok(new ThreadResponseDto
        {
            Id = response.Id,
            ThreadId = response.ThreadId,
            OrderId = response.OrderId,
            RespondedBy = response.RespondedBy,
            Response = response.Response,
            ResponseDate = response.ResponseDate,
            Tag = response.Tag,
        }, "Message sent"));
    }

    // ── Mapping Helper ──────────────────────────────────────────
    private static ThreadMessageDto MapToDto(ThreadMessage m) => new()
    {
        Id = m.Id,
        ThreadId = m.ThreadId,
        OrderId = m.OrderId,
        SenderName = m.SenderName,
        Message = m.Message,
        MessageDate = m.MessageDate,
    };
}

/// <summary>
/// DTO for thread messages.
/// </summary>
public class ThreadMessageDto
{
    public int Id { get; set; }
    public string ThreadId { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime MessageDate { get; set; }
}

/// <summary>
/// DTO for thread responses.
/// </summary>
public class ThreadResponseDto
{
    public int Id { get; set; }
    public string ThreadId { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string? RespondedBy { get; set; }
    public string? Response { get; set; }
    public DateTime? ResponseDate { get; set; }
    public string? Tag { get; set; }
}

/// <summary>
/// Request body for sending a thread message.
/// </summary>
public class SendThreadMessageRequest
{
    public string? OrderId { get; set; }
    public string? RespondedBy { get; set; }
    public string Response { get; set; } = string.Empty;
    public string? Tag { get; set; }
}
