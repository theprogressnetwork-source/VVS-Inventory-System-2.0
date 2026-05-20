namespace VvsIms.Domain.Entities;

/// <summary>
/// Correlation-tracked audit trail record for all system operations.
/// Provides full before/after payload tracking for compliance and debugging.
/// </summary>
public class AuditLog
{
    /// <summary>
    /// Unique identifier for the audit log entry.
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// Correlation ID for tracing the request across services.
    /// </summary>
    public string CorrelationId { get; set; } = string.Empty;

    /// <summary>
    /// Module that generated the audit event (e.g., "Stock", "Inventory", "Auth").
    /// </summary>
    public string Module { get; set; } = string.Empty;

    /// <summary>
    /// Action performed (e.g., "Create", "Update", "Delete", "Sync").
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// Outcome status (e.g., "Success", "Failed", "Partial").
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// Type of entity affected (e.g., "Stock", "Inventory", "ProductSku").
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// Key/identifier of the affected entity.
    /// </summary>
    public string? EntityKey { get; set; }

    /// <summary>
    /// Original request payload (JSON).
    /// </summary>
    public string? RequestPayload { get; set; }

    /// <summary>
    /// Entity state before the operation (JSON).
    /// </summary>
    public string? BeforePayload { get; set; }

    /// <summary>
    /// Entity state after the operation (JSON).
    /// </summary>
    public string? AfterPayload { get; set; }

    /// <summary>
    /// Error details if the operation failed.
    /// </summary>
    public string? ErrorDetails { get; set; }

    /// <summary>
    /// ID of the user who performed the operation.
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// Email of the user who performed the operation.
    /// </summary>
    public string? UserEmail { get; set; }

    /// <summary>
    /// API endpoint that was called.
    /// </summary>
    public string? Endpoint { get; set; }

    /// <summary>
    /// HTTP method used (GET, POST, PUT, DELETE).
    /// </summary>
    public string? HttpMethod { get; set; }

    /// <summary>
    /// Client IP address.
    /// </summary>
    public string? ClientIp { get; set; }

    /// <summary>
    /// Request duration in milliseconds.
    /// </summary>
    public int? DurationMs { get; set; }

    /// <summary>
    /// UTC timestamp when the audit entry was created.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
