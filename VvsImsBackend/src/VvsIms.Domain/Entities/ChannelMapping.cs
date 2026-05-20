namespace VvsIms.Domain.Entities;

/// <summary>
/// Maps internal system SKUs to channel-specific SKUs (Amazon, Shopify, BestBuy).
/// Enables multi-channel listing with platform-specific identifiers.
/// </summary>
public class ChannelMapping : BaseEntity
{
    /// <summary>
    /// The internal VVS IMS system SKU.
    /// </summary>
    public string SystemSKU { get; set; } = string.Empty;

    /// <summary>
    /// The channel/platform name (e.g., "Amazon", "Shopify", "BestBuy").
    /// </summary>
    public string ChannelName { get; set; } = string.Empty;

    /// <summary>
    /// The SKU identifier used on the channel.
    /// </summary>
    public string ChannelSKU { get; set; } = string.Empty;

    /// <summary>
    /// Optional shop-specific SKU override.
    /// </summary>
    public string? ShopSKU { get; set; }
}
