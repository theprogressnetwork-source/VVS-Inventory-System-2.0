namespace VvsIms.Domain.Entities;

/// <summary>
/// Pending entity — represents a product awaiting processing/fulfillment.
/// Tracks items that have been ordered but not yet moved to stock or outgoing.
/// R2 chain-of-custody fields enable full IMEI traceability from supplier
/// invoice through to order number.
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

	// ── R2 Chain-of-Custody Fields ──────────────────────────────────────

	/// <summary>
	/// System SKU identifier.
	/// </summary>
	public string? Sku { get; set; }

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
	/// Quantity ordered.
	/// </summary>
	public int Quantity { get; set; } = 1;
}
