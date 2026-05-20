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
    /// Stock repository implementation for IMEI-tracked inventory items.
    /// </summary>
    public class StockRepository : GenericRepository<Stock>, IStockRepository
    {
        private readonly VvsImsDbContext _context;

        public StockRepository(VvsImsDbContext context) : base(context, null)
        {
            _context = context;
        }

        /// <summary>
        /// Gets a stock item by its IMEI identifier.
        /// </summary>
        public async Task<Stock?> GetByImeiAsync(string imei, CancellationToken ct = default)
        {
            return await _context.Set<Stock>()
                .FirstOrDefaultAsync(s => s.Imei == imei, ct);
        }

        /// <summary>
        /// Gets all stock items matching a specific SKU.
        /// </summary>
        public async Task<List<Stock>> GetBySkuAsync(string sku, CancellationToken ct = default)
        {
            return await _context.Set<Stock>()
                .Where(s => s.BaseProperties.Sku == sku)
                .ToListAsync(ct);
        }

        /// <summary>
        /// Gets all unsold stock items (DateSold is null).
        /// </summary>
        public async Task<List<Stock>> GetUnsoldAsync(CancellationToken ct = default)
        {
            return await _context.Set<Stock>()
                .Where(s => s.DateSold == null)
                .ToListAsync(ct);
        }

        /// <summary>
        /// Gets stock items that have been shipped but not yet delivered.
        /// </summary>
        public async Task<List<Stock>> GetInTransitAsync(CancellationToken ct = default)
        {
            return await _context.Set<Stock>()
                .Where(s => s.ShippedDate != null && s.OrderLandingDate == null)
                .ToListAsync(ct);
        }

        /// <summary>
        /// Gets RMA-flagged stock items.
        /// </summary>
        public async Task<List<Stock>> GetRmaItemsAsync(CancellationToken ct = default)
        {
            return await _context.Set<Stock>()
                .Where(s => s.Rma)
                .ToListAsync(ct);
        }
        
        // Inherited methods from GenericRepository will handle the base IRepository methods
    }
}
