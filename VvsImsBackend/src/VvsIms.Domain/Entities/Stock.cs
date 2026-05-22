using VvsIms.Domain.ValueObjects;

namespace VvsIms.Domain.Entities;

/// <summary>
/// IMEI-tracked stock item representing a physical device in inventory.
/// Inherits base properties (Model, Storage, Color, Grade, Sku, Cost, BuyingPlatform)
/// from the <see cref="BaseProperties"/> value object.
/// </summary>
public class Stock : BaseEntity
{
    /// <summary>
    /// Base properties composite value object: Model, Storage, Color, Grade, Sku, Cost, BuyingPlatform.
    /// </summary>
    public BaseProperties BaseProperties { get; set; } = new();

    /// <summary>
    /// International Mobile Equipment Identity — unique device identifier.
    /// </summary>
    public string Imei { get; set; } = string.Empty;

    /// <summary>
    /// Associated order number (nullable for walk-in/manual entries).
    /// </summary>
    public string? OrderNo { get; set; }

    /// <summary>
    /// Date the item was sold (null if unsold).
    /// </summary>
    public DateTime? DateSold { get; set; }

    /// <summary>
    /// Date the item was added to stock.
    /// </summary>
    public DateTime? DateAdded { get; set; }

    /// <summary>
    /// Whether the item is under Return Merchandise Authorization.
    /// </summary>
    public bool Rma { get; set; }

    /// <summary>
    /// Vendor/source of the item.
    /// </summary>
    public string? Vendor { get; set; }

    /// <summary>
    /// Invoice number from the purchase.
    /// </summary>
    public string? InvoiceNumber { get; set; }

    /// <summary>
    /// Whether the item passed PhoneCheck diagnostics.
    /// </summary>
    public bool? PhoneCheck { get; set; }

    /// <summary>
    /// Whether the IMEI was entered manually (vs. scanned).
    /// </summary>
    public bool IsManualImei { get; set; }

    /// <summary>
    /// Current order status (e.g., "Pending", "Shipped", "Delivered").
    /// </summary>
    public string? OrderStatus { get; set; }

    /// <summary>
    /// Whether the item has been shipped.
    /// </summary>
    public bool IsShipped { get; set; }

	/// <summary>
	/// Date the item was shipped.
	/// </summary>
	public DateTime? ShippedDate { get; set; }

	/// <summary>
	/// Expected landing/delivery date for the order.
	/// </summary>
	public DateTime? OrderLandingDate { get; set; }

	/// <summary>
	/// Sales channel (e.g., "eBay", "Amazon", "Swappa").
	/// </summary>
	public string? Channel { get; set; }

	/// <summary>
	/// Sale price of the item.
	/// </summary>
	public decimal? SalePrice { get; set; }

	/// <summary>
	/// Date the item was returned.
	/// </summary>
	public DateTime? ReturnDate { get; set; }

	/// <summary>
	/// Reason for the return.
	/// </summary>
	public string? ReturnReason { get; set; }

	/// <summary>
	/// Whether the item is flagged as FBA (Fulfilled by Amazon).
	/// </summary>
	public bool FbaFlag { get; set; }

    /// <summary>
    /// Validates that the stock item has all required base properties and a positive cost.
    /// </summary>
    public bool IsValid() =>
        BaseProperties.Sku != "string" &&
        BaseProperties.Color != "string" &&
        BaseProperties.Model != "string" &&
        !string.IsNullOrWhiteSpace(BaseProperties.Model) &&
        !string.IsNullOrWhiteSpace(BaseProperties.Sku) &&
        !string.IsNullOrWhiteSpace(BaseProperties.Storage) &&
        !string.IsNullOrWhiteSpace(BaseProperties.Color) &&
        BaseProperties.Cost.Amount > 0;

    /// <summary>
    /// Validates base properties without requiring a SKU.
    /// </summary>
    public bool IsValidNoSku() =>
        BaseProperties.Color != "string" &&
        BaseProperties.Model != "string" &&
        !string.IsNullOrWhiteSpace(BaseProperties.Model) &&
        !string.IsNullOrWhiteSpace(BaseProperties.Storage) &&
        !string.IsNullOrWhiteSpace(BaseProperties.Color) &&
        BaseProperties.Cost.Amount > 0;
}
