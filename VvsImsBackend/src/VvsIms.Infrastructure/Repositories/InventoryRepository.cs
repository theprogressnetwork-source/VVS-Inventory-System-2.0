using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VvsIms.Application.Interfaces;
using VvsIms.Domain.Entities;
using VvsIms.Domain.Enums;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Infrastructure.Repositories
{
    /// <summary>
    /// Inventory repository implementation for aggregate inventory operations.
    /// </summary>
    public class InventoryRepository : GenericRepository<Inventory>, IInventoryRepository
    {
        private readonly VvsImsDbContext _context;

        public InventoryRepository(VvsImsDbContext context) : base(context, null)
        {
            _context = context;
        }

        /// <summary>
        /// Gets an inventory aggregate by its SKU.
        /// </summary>
        public async Task<Inventory?> GetBySkuAsync(string sku, CancellationToken ct = default)
        {
            return await _context.Set<Inventory>()
                .Include(i => i.InventoryItems)
                .FirstOrDefaultAsync(i => i.BaseProperties.Sku == sku, ct);
        }

        /// <summary>
        /// Gets all inventory lines that have the winning price on their platform.
        /// </summary>
        public async Task<List<Inventory>> GetWinningItemsAsync(CancellationToken ct = default)
        {
            // This would need to be implemented based on business logic for determining "winning" items
            // For now, returning all items as a placeholder
            return await _context.Set<Inventory>().ToListAsync(ct);
        }

        /// <summary>
        /// Gets inventory lines for a specific platform.
        /// </summary>
        public async Task<List<Inventory>> GetByPlatformAsync(Domain.Enums.BuyingPlatformEnum platform, CancellationToken ct = default)
        {
            return await _context.Set<Inventory>()
                .Where(i => i.BaseProperties.BuyingPlatform == platform)
                .ToListAsync(ct);
        }

        /// <summary>
        /// Gets inventory with associated IMEI items included.
        /// </summary>
        public async Task<Inventory?> GetWithItemsAsync(int inventoryId, CancellationToken ct = default)
        {
            return await _context.Set<Inventory>()
                .Include(i => i.InventoryItems)
                .FirstOrDefaultAsync(i => i.Id == inventoryId, ct);
        }

        // Inherited methods from GenericRepository will handle the base IRepository methods
    }
}
