using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;

namespace VvsIms.Application.Interfaces;

/// <summary>
/// SKU-specific repository contract extending the generic repository
/// with SKU generation and lookup methods.
/// </summary>
public interface ISkuRepository : IRepository<ProductSku>
{
    /// <summary>
    /// Gets a ProductSku by its SKU code.
    /// </summary>
    Task<ProductSku?> GetBySkuCodeAsync(string sku, CancellationToken ct = default);

    /// <summary>
    /// Finds or generates a SKU for the given Model/Storage/Color/Grade combination.
    /// </summary>
    Task<ProductSku> FindOrCreateAsync(string model, string storage, string color, int grade, CancellationToken ct = default);

    /// <summary>
    /// Gets all distinct models in the SKU registry.
    /// </summary>
    Task<List<string>> GetDistinctModelsAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets all distinct storage values in the SKU registry.
    /// </summary>
    Task<List<string>> GetDistinctStoragesAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets all distinct colors in the SKU registry.
    /// </summary>
    Task<List<string>> GetDistinctColorsAsync(CancellationToken ct = default);
}
