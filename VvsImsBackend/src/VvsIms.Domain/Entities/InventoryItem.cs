namespace VvsIms.Domain.Entities;

/// <summary>
/// Inventory-IMEI linkage entity — links aggregate Inventory records
/// to individual IMEI-tracked Stock items for detailed tracking.
/// </summary>
public class InventoryItem : BaseEntity
{
    /// <summary>
    /// Foreign key to the aggregate Inventory record.
    /// </summary>
    public int InventoryId { get; set; }

    /// <summary>
    /// Navigation property to the parent Inventory record.
    /// </summary>
    public virtual Inventory? Inventory { get; set; }

    /// <summary>
    /// Date this linkage was created.
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// SKU of the linked item.
    /// </summary>
    public string? Sku { get; set; }

    /// <summary>
    /// Model name of the linked item.
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Storage capacity of the linked item.
    /// </summary>
    public string? Storage { get; set; }

    /// <summary>
    /// Color of the linked item.
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Grade of the linked item.
    /// </summary>
    public string? Grade { get; set; }

    /// <summary>
    /// Cost of the linked item.
    /// </summary>
    public decimal? Cost { get; set; }

    /// <summary>
    /// Invoice number for the linked item.
    /// </summary>
    public string? InvoiceNo { get; set; }

    /// <summary>
    /// IMEI of the linked device.
    /// </summary>
    public string? Imei { get; set; }

    /// <summary>
    /// Order number associated with the linked item.
    /// </summary>
    public string? Order { get; set; }

    /// <summary>
    /// Ship date for the linked item.
    /// </summary>
    public DateTime? DateShip { get; set; }

    /// <summary>
    /// RMA status of the linked item.
    /// </summary>
    public string? Rma { get; set; }

    /// <summary>
    /// Vendor/source of the linked item.
    /// </summary>
    public string? Vendor { get; set; }
}
