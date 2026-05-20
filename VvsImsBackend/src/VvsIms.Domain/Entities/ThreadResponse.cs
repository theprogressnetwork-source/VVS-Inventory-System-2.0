namespace VvsIms.Domain.Entities;

/// <summary>
/// BestBuy marketplace thread response — represents a reply to a customer
/// message thread, including tagging and topic classification.
/// </summary>
public class ThreadResponse : BaseEntity
{
    /// <summary>
    /// BestBuy thread identifier this response belongs to.
    /// </summary>
    public string ThreadId { get; set; } = string.Empty;

    /// <summary>
    /// BestBuy order identifier associated with this thread.
    /// </summary>
    public string OrderId { get; set; } = string.Empty;

    /// <summary>
    /// Who submitted the response (agent name or system).
    /// </summary>
    public string? RespondedBy { get; set; }

    /// <summary>
    /// Response body content.
    /// </summary>
    public string? Response { get; set; }

    /// <summary>
    /// Date the response was submitted.
    /// </summary>
    public DateTime? ResponseDate { get; set; }

    /// <summary>
    /// Tag/category for the response (e.g., "General", "Return", "Shipping").
    /// </summary>
    public string? Tag { get; set; }

    /// <summary>
    /// Type of recipient (e.g., "Customer", "Internal").
    /// </summary>
    public string? ToType { get; set; }

    /// <summary>
    /// Topic type classification (e.g., "OrderIssue", "ProductInquiry").
    /// </summary>
    public string? TopicType { get; set; }

    /// <summary>
    /// Topic value/detail.
    /// </summary>
    public string? TopicValue { get; set; }
}
