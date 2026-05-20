namespace VvsIms.Domain.Entities;

/// <summary>
/// Append-only event log for inventory quantity changes.
/// Records every delta (sale, restock, adjustment) for audit and reconciliation.
/// </summary>
public class InventoryEvent : BaseEntity
{
    /// <summary>
    /// The channel that triggered this event (e.g., "Amazon", "Shopify", "BestBuy", "Manual").
    /// </summary>
    public string Channel { get; set; } = string.Empty;

    /// <summary>
    /// The channel's unique event identifier for idempotency.
    /// </summary>
    public string ChannelEventId { get; set; } = string.Empty;

    /// <summary>
    /// Foreign key to the affected Inventory record.
    /// </summary>
    public int InventoryId { get; set; }

    /// <summary>
    /// The system SKU affected by this event.
    /// </summary>
    public string SystemSKU { get; set; } = string.Empty;

    /// <summary>
    /// Quantity change delta. Negative for sales, positive for restocks.
    /// </summary>
    public int Delta { get; set; }

    /// <summary>
    /// Human-readable reason for the change (e.g., "Sale", "Restock", "Adjustment").
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// UTC timestamp when the event occurred.
    /// </summary>
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
