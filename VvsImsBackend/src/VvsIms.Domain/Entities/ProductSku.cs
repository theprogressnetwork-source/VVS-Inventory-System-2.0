namespace VvsIms.Domain.Entities;

/// <summary>
/// Product SKU entity — defines the unique SKU code generated from
/// Model, Storage, Color, and Grade combinations.
/// </summary>
public class ProductSku : BaseEntity
{
    /// <summary>
    /// The generated SKU code (e.g., "45781296").
    /// </summary>
    public string Sku { get; set; } = string.Empty;

    /// <summary>
    /// Device model name (e.g., "iPhone 15 Pro Max").
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Storage capacity (e.g., "256 GB", "1 TB", "16/256 GB").
    /// </summary>
    public string Storage { get; set; } = string.Empty;

    /// <summary>
    /// Device color (e.g., "Natural", "Blue").
    /// </summary>
    public string Color { get; set; } = string.Empty;

    /// <summary>
    /// Grade identifier (numeric, e.g., 0 = Good, 1 = OpenBox, 2 = Excellent).
    /// </summary>
    public int Grade { get; set; }
}
