namespace VvsIms.Domain.Entities;

/// <summary>
/// Stock sync snapshot — captures the last known available stock count
/// per system SKU for platform synchronization reconciliation.
/// </summary>
public class SystemSkuStockSnapshot : BaseEntity
{
    /// <summary>
    /// The internal VVS IMS system SKU.
    /// </summary>
    public string SystemSKU { get; set; } = string.Empty;

    /// <summary>
    /// Last known available stock count for this SKU.
    /// </summary>
    public int LastKnownAvailable { get; set; }

    /// <summary>
    /// UTC timestamp of the last successful sync.
    /// </summary>
    public DateTime LastSyncUtc { get; set; } = DateTime.UtcNow;
}
