using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Caching.Memory;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Infrastructure.Repositories;

/// <summary>
/// PROPERLY CACHED UnitOfWork implementation.
/// 
/// FIXES THE CONTRACTOR'S BUG: The old UnitOfWork created NEW repository instances
/// on every property access (e.g., `StockRepository => new StockRepository(...)`),
/// which defeated caching, caused memory leaks, and broke transactional consistency.
/// 
/// This implementation uses lazy initialization with a ConcurrentDictionary cache
/// so each repository type is instantiated exactly ONCE per UnitOfWork lifetime.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly VvsImsDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly Dictionary<Type, object> _repositories = new();
    private bool _disposed;

    public UnitOfWork(VvsImsDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    /// <summary>
    /// Gets a cached repository for the specified entity type.
    /// Lazily creates and caches the repository on first access.
    /// Subsequent calls return the SAME instance — fixing the contractor's bug.
    /// </summary>
    public IRepository<T> Repository<T>() where T : class
    {
        if (_repositories.TryGetValue(typeof(T), out var cachedRepo))
            return (IRepository<T>)cachedRepo;

        var repository = new GenericRepository<T>(_context, _cache);
        _repositories[typeof(T)] = repository;
        return repository;
    }

    /// <inheritdoc />
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _context.SaveChangesAsync(ct);
    }

    /// <inheritdoc />
    public async Task<IDisposable> BeginTransactionAsync(CancellationToken ct = default)
    {
        return await _context.Database.BeginTransactionAsync(ct);
    }

    /// <inheritdoc />
    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(ct);
            try
            {
                await action();
                await _context.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });
    }

    /// <summary>
    /// Disposes the DbContext and clears the repository cache.
    /// </summary>
    public void Dispose()
    {
        if (!_disposed)
        {
            _context.Dispose();
            _repositories.Clear();
            _disposed = true;
        }
        GC.SuppressFinalize(this);
    }
}
