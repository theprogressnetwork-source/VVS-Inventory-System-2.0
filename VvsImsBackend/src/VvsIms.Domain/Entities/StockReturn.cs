namespace VvsIms.Domain.Entities;

/// <summary>
/// Stock return entity — tracks product returns and cancellations
/// with full channel provenance and reason codes.
/// </summary>
public class StockReturn : BaseEntity
{
    /// <summary>
    /// Foreign key to the Stock entity being returned.
    /// </summary>
    public int StockId { get; set; }

    /// <summary>
    /// Navigation property to the associated Stock record.
    /// </summary>
    public virtual Stock? Stock { get; set; }

    /// <summary>
    /// Order number for this return transaction.
    /// </summary>
    public string ReturnOrderNo { get; set; } = string.Empty;

    /// <summary>
    /// Date the return was initiated (UTC).
    /// </summary>
    public DateTime ReturnDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Reason for the return (e.g., "RETURN", "CANCEL").
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// Channel that originated the return (e.g., "Amazon", "Shopify", "BestBuy").
    /// </summary>
    public string? Channel { get; set; }

    /// <summary>
    /// Quantity returned (typically one for IMEI-tracked items).
    /// </summary>
    public int? Quantity { get; set; } = 1;

    /// <summary>
    /// IMEI of the returned device.
    /// </summary>
    public string? Imei { get; set; }

    /// <summary>
    /// SKU of the returned item.
    /// </summary>
    public string Sku { get; set; } = string.Empty;
}
