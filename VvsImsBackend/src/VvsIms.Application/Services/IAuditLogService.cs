namespace VvsIms.Application.Services;

/// <summary>
/// Audit log service interface for recording and querying system audit trails.
/// All entries are append-only — no updates or deletes permitted.
/// </summary>
public interface IAuditLogService
{
    /// <summary>
    /// Records an audit log entry.
    /// </summary>
    Task LogAsync(
        string correlationId,
        string module,
        string action,
        string status,
        string? entityType = null,
        string? entityKey = null,
        string? requestPayload = null,
        string? beforePayload = null,
        string? afterPayload = null,
        string? errorDetails = null,
        string? userId = null,
        string? userEmail = null,
        string? endpoint = null,
        string? httpMethod = null,
        string? clientIp = null,
        int? durationMs = null,
        CancellationToken ct = default);

    /// <summary>
    /// Gets audit logs filtered by correlation ID.
    /// </summary>
    Task<List<Domain.Entities.AuditLog>> GetByCorrelationIdAsync(string correlationId, CancellationToken ct = default);

    /// <summary>
    /// Gets audit logs filtered by entity type and key.
    /// </summary>
    Task<List<Domain.Entities.AuditLog>> GetByEntityAsync(string entityType, string entityKey, CancellationToken ct = default);

    /// <summary>
    /// Gets recent audit logs (most recent first).
    /// </summary>
    Task<List<Domain.Entities.AuditLog>> GetRecentAsync(int count = 100, CancellationToken ct = default);
}
