using System.Linq;
using VvsIms.Domain.ValueObjects;

namespace VvsIms.Domain.Entities;

/// <summary>
/// Incoming product entity — represents a device that has been purchased
/// but not yet processed into stock.
/// </summary>
public class Product : BaseEntity
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
    /// Vendor/source of the product.
    /// </summary>
	public string Vendor { get; set; } = string.Empty;

	/// <summary>
	/// Invoice number from the purchase.
	/// </summary>
	public string InvoiceNumber { get; set; } = string.Empty;

    /// <summary>
    /// Whether the item passed PhoneCheck diagnostics.
    /// </summary>
    public bool? PhoneCheck { get; set; }

    /// <summary>
    /// Whether the product has been processed into stock.
    /// Once processed, the product is converted to a Stock entity.
    /// </summary>
	public bool IsProcessed { get; set; }

	/// <summary>
	/// Validates whether a string is a valid 15-digit IMEI.
	/// </summary>
	public static bool IsValidImei(string imei) => !string.IsNullOrWhiteSpace(imei) && imei.Length == 15 && imei.All(char.IsDigit);

	/// <summary>
	/// Validates that the product has all required base properties and a positive cost.
	/// </summary>
	public bool IsValid() =>
		BaseProperties.Sku != "string" &&
		BaseProperties.Color != "string" &&
		BaseProperties.Model != "string" &&
		!string.IsNullOrWhiteSpace(BaseProperties.Model) &&
		!string.IsNullOrWhiteSpace(BaseProperties.Sku) &&
		!string.IsNullOrWhiteSpace(BaseProperties.Storage) &&
		!string.IsNullOrWhiteSpace(BaseProperties.Color) &&
		!string.IsNullOrWhiteSpace(Vendor) &&
		!string.IsNullOrWhiteSpace(InvoiceNumber) &&
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
		!string.IsNullOrWhiteSpace(Vendor) &&
		!string.IsNullOrWhiteSpace(InvoiceNumber) &&
		BaseProperties.Cost.Amount > 0;
}
