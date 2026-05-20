using VvsIms.Application.DTOs;

namespace VvsIms.Application.Services;

/// <summary>
/// Multi-channel platform service interface for marketplace integrations.
/// Each platform (Amazon, Shopify, BestBuy) implements this contract.
/// </summary>
public interface IPlatformService
{
    /// <summary>
    /// The platform name (e.g., "Amazon", "Shopify", "BestBuy").
    /// </summary>
    string PlatformName { get; }

    /// <summary>
    /// Fetches new orders from the platform since the last sync.
    /// </summary>
    Task<List<PlatformOrderDto>> FetchNewOrdersAsync(CancellationToken ct = default);

    /// <summary>
    /// Updates inventory quantities on the platform.
    /// </summary>
    Task<bool> UpdateInventoryAsync(string sku, int quantity, CancellationToken ct = default);

    /// <summary>
    /// Acknowledges an order to prevent re-processing.
    /// </summary>
    Task<bool> AcknowledgeOrderAsync(string orderId, CancellationToken ct = default);

    /// <summary>
    /// Gets the current listing price for a SKU on the platform.
    /// </summary>
    Task<decimal?> GetListingPriceAsync(string sku, CancellationToken ct = default);
}

/// <summary>
/// DTO representing a platform order for cross-channel normalization.
/// </summary>
public class PlatformOrderDto
{
    public string OrderId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? Imei { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public DateTime OrderDate { get; set; }
    public string? OrderStatus { get; set; }
}
