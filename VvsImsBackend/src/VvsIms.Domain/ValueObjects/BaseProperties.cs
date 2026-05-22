using VvsIms.Domain.Enums;

namespace VvsIms.Domain.ValueObjects;

/// <summary>
/// Composite value object encapsulating the core product classification properties
/// shared across Stock, Inventory, and Product entities.
/// Replaces the old abstract BaseProperties inheritance with composition.
/// </summary>
public class BaseProperties
{
    /// <summary>
    /// Device model name (e.g., "iPhone 15 Pro Max", "Galaxy S24 Ultra").
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Storage capacity (e.g., "256 GB", "1 TB", "16/256 GB", "N/A").
    /// </summary>
    public string Storage { get; set; } = string.Empty;

    /// <summary>
    /// Device color (e.g., "Natural", "Blue", "Midnight").
    /// </summary>
    public string Color { get; set; } = string.Empty;

	/// <summary>
	/// Grade identifier (numeric, e.g., 0 = BrandNew, 1 = Excellent, 2 = Good, 3 = Fair, 4 = OpenBox).
	/// </summary>
	public int Grade { get; set; }

    /// <summary>
    /// Generated SKU code derived from Model/Storage/Color/Grade combination.
    /// </summary>
    public string Sku { get; set; } = string.Empty;

    /// <summary>
    /// Cost value with currency safety via the Money value object.
    /// </summary>
    public Money Cost { get; set; } = new();

    /// <summary>
    /// The buying/selling platform this item was sourced from.
    /// </summary>
    public BuyingPlatformEnum BuyingPlatform { get; set; } = BuyingPlatformEnum.BestBuy;

    /// <summary>
    /// Human-readable grade name derived from the Grade integer.
    /// </summary>
	public string GradeName => Grade switch
	{
		0 => "BrandNew",
		1 => "Excellent",
		2 => "Good",
		3 => "Fair",
		4 => "OpenBox",
		_ => "N/A"
	};
}
