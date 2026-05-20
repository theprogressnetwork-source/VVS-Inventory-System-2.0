using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;

namespace VvsIms.Application.Interfaces;

/// <summary>
/// Stock-specific repository contract extending the generic repository
/// with IMEI-tracked stock query methods.
/// </summary>
public interface IStockRepository : IRepository<Stock>
{
    /// <summary>
    /// Gets a stock item by its IMEI identifier.
    /// </summary>
    Task<Stock?> GetByImeiAsync(string imei, CancellationToken ct = default);

    /// <summary>
    /// Gets all stock items matching a specific SKU.
    /// </summary>
    Task<List<Stock>> GetBySkuAsync(string sku, CancellationToken ct = default);

    /// <summary>
    /// Gets all unsold stock items (DateSold is null).
    /// </summary>
    Task<List<Stock>> GetUnsoldAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets stock items that have been shipped but not yet delivered.
    /// </summary>
    Task<List<Stock>> GetInTransitAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets RMA-flagged stock items.
    /// </summary>
    Task<List<Stock>> GetRmaItemsAsync(CancellationToken ct = default);
}
