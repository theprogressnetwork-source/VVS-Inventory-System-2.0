using VvsIms.Domain.Enums;
using VvsIms.Domain.ValueObjects;

namespace VvsIms.Domain.Entities;

/// <summary>
/// Aggregate inventory record tracking quantity and channel-specific pricing
/// for a given SKU combination.
/// </summary>
public class Inventory : BaseEntity
{
    /// <summary>
    /// Base properties composite value object: Model, Storage, Color, Grade, Sku, Cost, BuyingPlatform.
    /// </summary>
    public BaseProperties BaseProperties { get; set; } = new();

    /// <summary>
    /// Total quantity available for this SKU aggregate.
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// Whether this inventory line has the winning (lowest competitive) price.
    /// </summary>
    public bool Winning { get; set; }

    /// <summary>
    /// Manual price adjustment override.
    /// </summary>
    public Money? AdjustmentPrice { get; set; }

    /// <summary>
    /// Current selling price on the platform.
    /// </summary>
    public Money? SellingPrice { get; set; }

    /// <summary>
    /// Price at which the item was bought.
    /// </summary>
    public Money? Bought { get; set; }

    /// <summary>
    /// Winning price from the product source platform.
    /// </summary>
    public Money? ProductWinningPrice { get; set; }

    /// <summary>
    /// The buying/selling platform this inventory line is associated with.
    /// </summary>
    public BuyingPlatformEnum Platform { get; set; } = BuyingPlatformEnum.BestBuy;

    /// <summary>
    /// Current platform listing price.
    /// </summary>
    public Money? PlatformPrice { get; set; }

    /// <summary>
    /// Platform discounted/sale price.
    /// </summary>
    public Money? PlatformDiscountPrice { get; set; }

    /// <summary>
    /// Start date of the platform discount period.
    /// </summary>
    public DateTime? PlatformDiscountStartDate { get; set; }

    /// <summary>
    /// End date of the platform discount period.
    /// </summary>
    public DateTime? PlatformDiscountEndDate { get; set; }

    /// <summary>
    /// Quantity listed on the platform.
    /// </summary>
    public short? PlatformQuantity { get; set; }

    /// <summary>
    /// SKU title as listed on the platform.
    /// </summary>
    public string? PlatformSkuTitle { get; set; }

    /// <summary>
    /// Whether this inventory has the winning offer on the platform.
    /// </summary>
    public bool? PlatformWinningOffer { get; set; }

    /// <summary>
    /// Price of the current winning offer on the platform.
    /// </summary>
    public Money? PlatformWinnerPrice { get; set; }

    /// <summary>
    /// Shipping price of the current winning offer.
    /// </summary>
    public Money? PlatformWinnerShippingPrice { get; set; }

    /// <summary>
    /// Price difference between our price and the winning offer.
    /// </summary>
    public Money? PlatformDifference { get; set; }

    /// <summary>
    /// Navigation collection to individual IMEI-linked inventory items.
    /// </summary>
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
