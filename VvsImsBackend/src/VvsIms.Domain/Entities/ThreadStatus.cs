namespace VvsIms.Domain.Entities;

/// <summary>
/// BestBuy marketplace thread status — tracks the current status of a
/// customer messaging thread (unique per ThreadId).
/// </summary>
public class ThreadStatus : BaseEntity
{
    /// <summary>
    /// BestBuy thread identifier (unique constraint enforced).
    /// </summary>
    public string ThreadId { get; set; } = string.Empty;

    /// <summary>
    /// BestBuy order identifier associated with this thread.
    /// </summary>
    public string OrderId { get; set; } = string.Empty;

    /// <summary>
    /// Current status of the thread (e.g., "Open", "Closed", "Pending").
    /// </summary>
    public string Status { get; set; } = string.Empty;
}
