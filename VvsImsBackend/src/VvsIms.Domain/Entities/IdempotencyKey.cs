namespace VvsIms.Domain.Entities;

/// <summary>
/// Idempotency key record — prevents duplicate processing of platform events.
/// Example key format: "amazon|event12345"
/// </summary>
public class IdempotencyKey : BaseEntity
{
    /// <summary>
    /// Composite idempotency key (e.g., "amazon|event12345").
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Whether the event was processed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Optional result payload from the processed event.
    /// </summary>
    public string? Result { get; set; }

    /// <summary>
    /// UTC timestamp when the event was processed.
    /// </summary>
    public DateTime ProcessedAtUtc { get; set; } = DateTime.UtcNow;
}
