namespace VvsIms.Domain.Entities;

/// <summary>
/// Outgoing entity — represents a product being shipped out of inventory.
/// Tracks the order number, product title, IMEI, and shipment date.
/// </summary>
public class Outgoing : BaseEntity
{
    /// <summary>
    /// Order number associated with this outgoing shipment.
    /// </summary>
    public string OrderNo { get; set; } = string.Empty;

    /// <summary>
    /// Product title as listed on the order.
    /// </summary>
    public string ProductTitle { get; set; } = string.Empty;

    /// <summary>
    /// IMEI of the device being shipped.
    /// </summary>
    public string Imei { get; set; } = string.Empty;

    /// <summary>
    /// Date the item was shipped out.
    /// </summary>
    public DateTime? Date { get; set; }

    /// <summary>
    /// Current order status (e.g., "Pending", "Shipped", "Delivered").
    /// </summary>
    public string? OrderStatus { get; set; }
}
