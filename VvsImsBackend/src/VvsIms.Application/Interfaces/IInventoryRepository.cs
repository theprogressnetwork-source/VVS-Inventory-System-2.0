using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;

namespace VvsIms.Application.Interfaces;

/// <summary>
/// Inventory-specific repository contract extending the generic repository
/// with aggregate inventory query methods.
/// </summary>
public interface IInventoryRepository : IRepository<Inventory>
{
    /// <summary>
    /// Gets an inventory aggregate by its SKU.
    /// </summary>
    Task<Inventory?> GetBySkuAsync(string sku, CancellationToken ct = default);

    /// <summary>
    /// Gets all inventory lines that have the winning price on their platform.
    /// </summary>
    Task<List<Inventory>> GetWinningItemsAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets inventory lines for a specific platform.
    /// </summary>
    Task<List<Inventory>> GetByPlatformAsync(Domain.Enums.BuyingPlatformEnum platform, CancellationToken ct = default);

    /// <summary>
    /// Gets inventory with associated IMEI items included.
    /// </summary>
    Task<Inventory?> GetWithItemsAsync(int inventoryId, CancellationToken ct = default);
}
