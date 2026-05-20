using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using VvsIms.Domain.Entities;

namespace VvsIms.Application.Services
{
    public interface IProductService
    {
        /// <summary>
        /// Adds products to stock and inventory with transactional safety.
        /// </summary>
        Task<bool> AddProductsToStockAndInventoryAsync(List<Product> products, string correlationId, CancellationToken ct = default);

        /// <summary>
        /// Processes outgoing products (sold items).
        /// </summary>
        Task<bool> ProcessOutgoingAsync(CancellationToken ct = default);

        /// <summary>
        /// Processes pending products.
        /// </summary>
        Task<bool> ProcessPendingAsync(CancellationToken ct = default);

        /// <summary>
        /// Imports winning sheet data to update inventory.
        /// </summary>
        Task<bool> ImportWinningSheetAsync(CancellationToken ct = default);

        /// <summary>
        /// Imports orders from Excel file.
        /// </summary>
        Task<bool> ImportOrdersExcelAsync(CancellationToken ct = default);
    }
}