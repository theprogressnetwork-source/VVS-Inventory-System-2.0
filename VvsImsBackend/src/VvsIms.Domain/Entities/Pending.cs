namespace VvsIms.Domain.Entities;

/// <summary>
/// Pending entity — represents a product awaiting processing/fulfillment.
/// Tracks items that have been ordered but not yet moved to stock or outgoing.
/// </summary>
public class Pending : BaseEntity
{
    /// <summary>
    /// Order number associated with this pending item.
    /// </summary>
    public string OrderNo { get; set; } = string.Empty;

    /// <summary>
    /// Date the pending item was added to the queue.
    /// </summary>
    public DateTime DateAdded { get; set; }

    /// <summary>
    /// Product title as listed on the order.
    /// </summary>
    public string ProductTitle { get; set; } = string.Empty;

    /// <summary>
    /// IMEI of the pending device.
    /// </summary>
    public string Imei { get; set; } = string.Empty;
}
