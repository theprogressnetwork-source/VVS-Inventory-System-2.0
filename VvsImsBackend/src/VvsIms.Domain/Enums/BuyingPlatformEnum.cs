namespace VvsIms.Domain.Enums;

/// <summary>
/// Enumerates the supported buying/selling platforms for inventory channel mapping.
/// </summary>
public enum BuyingPlatformEnum
{
    /// <summary>BestBuy marketplace.</summary>
    BestBuy = 0,

    /// <summary>Amazon Seller Central / SP-API.</summary>
    Amazon = 1,

    /// <summary>eBay marketplace.</summary>
    EBay = 2
}
