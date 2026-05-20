namespace VvsIms.Domain.Entities;

/// <summary>
/// BestBuy marketplace thread message — represents an incoming customer message
/// tied to an order thread.
/// </summary>
public class ThreadMessage : BaseEntity
{
    /// <summary>
    /// BestBuy thread identifier.
    /// </summary>
    public string ThreadId { get; set; } = string.Empty;

    /// <summary>
    /// BestBuy order identifier associated with this thread.
    /// </summary>
    public string OrderId { get; set; } = string.Empty;

    /// <summary>
    /// Name of the message sender (customer or support agent).
    /// </summary>
    public string SenderName { get; set; } = string.Empty;

    /// <summary>
    /// Message body content.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Date the message was sent.
    /// </summary>
    public DateTime MessageDate { get; set; }
}
