namespace VvsIms.Domain.Entities;

/// <summary>
/// Outgoing entity — represents a product being shipped out of inventory.
/// Tracks the order number, product title, IMEI, and shipment date.
/// R2 chain-of-custody fields enable full IMEI traceability from supplier
/// invoice through to order number.
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

	// ── R2 Chain-of-Custody Fields ──────────────────────────────────────

	/// <summary>
	/// Vendor / source of the device.
	/// </summary>
	public string? Vendor { get; set; }

	/// <summary>
	/// Supplier invoice number for traceability back to purchase.
	/// </summary>
	public string? InvoiceNumber { get; set; }

	/// <summary>
	/// Whether the device passed PhoneCheck diagnostics.
	/// </summary>
	public bool? PhoneCheck { get; set; }

	/// <summary>
	/// Sales channel (Amazon, Shopify, BestBuy, etc.).
	/// </summary>
	public string? Channel { get; set; }

	/// <summary>
	/// System SKU identifier.
	/// </summary>
	public string? Sku { get; set; }

	/// <summary>
	/// Price at which the device was sold.
	/// </summary>
	public decimal? SalePrice { get; set; }

	/// <summary>
	/// Actual ship date.
	/// </summary>
	public DateTime? DateShipped { get; set; }

	/// <summary>
	/// When the return was initiated (null if not returned).
	/// </summary>
	public DateTime? ReturnDate { get; set; }

	/// <summary>
	/// Reason code for return (null if not returned).
	/// </summary>
	public string? ReturnReason { get; set; }

	/// <summary>
	/// Date the item landed in the VVS system.
	/// </summary>
	public DateTime? SystemDateLanded { get; set; }

	/// <summary>
	/// Whether this is an FBA (Fulfilled by Amazon) order.
	/// </summary>
	public bool FbaFlag { get; set; } = false;
}
