using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;

namespace VvsIms.Application.Interfaces;

/// <summary>
/// Product-specific repository contract extending the generic repository
/// with product-domain query methods.
/// </summary>
public interface IProductRepository : IRepository<Product>
{
    /// <summary>
    /// Gets a product by its IMEI identifier.
    /// </summary>
    Task<Product?> GetByImeiAsync(string imei, CancellationToken ct = default);

    /// <summary>
    /// Gets all products matching a specific SKU.
    /// </summary>
    Task<List<Product>> GetBySkuAsync(string sku, CancellationToken ct = default);

    /// <summary>
    /// Gets products that have not yet been processed into stock.
    /// </summary>
    Task<List<Product>> GetUnprocessedAsync(CancellationToken ct = default);
}
