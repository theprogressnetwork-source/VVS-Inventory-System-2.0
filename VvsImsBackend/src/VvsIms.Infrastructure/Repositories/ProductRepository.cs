using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VvsIms.Application.Interfaces;
using VvsIms.Domain.Entities;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Infrastructure.Repositories
{
    /// <summary>
    /// Product repository implementation for product-specific operations.
    /// </summary>
    public class ProductRepository : GenericRepository<Product>, IProductRepository
    {
        private readonly VvsImsDbContext _context;

        public ProductRepository(VvsImsDbContext context) : base(context, null)
        {
            _context = context;
        }

        /// <summary>
        /// Gets a product by its IMEI identifier.
        /// </summary>
        public async Task<Product?> GetByImeiAsync(string imei, CancellationToken ct = default)
        {
            return await _context.Set<Product>()
                .FirstOrDefaultAsync(p => p.Imei == imei, ct);
        }

        /// <summary>
        /// Gets all products matching a specific SKU.
        /// </summary>
        public async Task<List<Product>> GetBySkuAsync(string sku, CancellationToken ct = default)
        {
            return await _context.Set<Product>()
                .Where(p => p.BaseProperties.Sku == sku)
                .ToListAsync(ct);
        }

        /// <summary>
        /// Gets products that have not yet been processed into stock.
        /// </summary>
        public async Task<List<Product>> GetUnprocessedAsync(CancellationToken ct = default)
        {
            return await _context.Set<Product>()
                .Where(p => !p.IsProcessed)
                .ToListAsync(ct);
        }

        // Inherited methods from GenericRepository will handle the base IRepository methods
    }
}
