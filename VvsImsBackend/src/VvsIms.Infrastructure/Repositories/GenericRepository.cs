using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Infrastructure.Repositories;

/// <summary>
/// Cached generic repository implementation.
/// Provides short-lived memory caching for frequently accessed entities
/// to reduce database round-trips.
/// </summary>
/// <typeparam name="T">The entity type.</typeparam>
public class GenericRepository<T> : IRepository<T> where T : class
{
    private readonly VvsImsDbContext _context;
    private readonly IMemoryCache? _cache;
    private readonly DbSet<T> _dbSet;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5);

    public GenericRepository(VvsImsDbContext context, IMemoryCache? cache)
    {
        _context = context;
        _cache = cache;
        _dbSet = context.Set<T>();
    }

    /// <inheritdoc />
    public async Task<T?> GetByIdAsync(object id, CancellationToken ct = default)
    {
        var cacheKey = $"{typeof(T).Name}_{id}";
        if (_cache is not null && _cache.TryGetValue(cacheKey, out T? cached))
            return cached;

        var entity = await _dbSet.FindAsync(new object[] { id }, ct);
        if (entity is not null && _cache is not null)
            _cache.Set(cacheKey, entity, _cacheDuration);

        return entity;
    }

    /// <inheritdoc />
    public async Task<List<T>> ListAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        CancellationToken ct = default,
        params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _dbSet;

        foreach (var include in includes)
            query = query.Include(include);

        if (filter is not null)
            query = query.Where(filter);

        if (orderBy is not null)
            query = orderBy(query);

        return await query.ToListAsync(ct);
    }

    /// <inheritdoc />
    public async Task<List<TResult>> QueryAsync<TResult>(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        Expression<Func<T, TResult>>? selector = null,
        CancellationToken ct = default,
        params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _dbSet;

        foreach (var include in includes)
            query = query.Include(include);

        if (filter is not null)
            query = query.Where(filter);

        if (orderBy is not null)
            query = orderBy(query);

        if (selector is null)
            throw new ArgumentNullException(nameof(selector), "Selector is required for QueryAsync");

        return await query.Select(selector).ToListAsync(ct);
    }

    /// <inheritdoc />
    public async Task<List<T>> GetAllAsync(CancellationToken ct = default)
    {
        return await _dbSet.ToListAsync(ct);
    }

    /// <inheritdoc />
    public async Task<T> AddAsync(T entity, CancellationToken ct = default)
    {
        var entry = await _dbSet.AddAsync(entity, ct);
        InvalidateCache(entity);
        return entry.Entity;
    }

    /// <inheritdoc />
    public async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default)
    {
        await _dbSet.AddRangeAsync(entities, ct);
        foreach (var entity in entities)
            InvalidateCache(entity);
    }

    /// <inheritdoc />
    public void Update(T entity)
    {
        _dbSet.Update(entity);
        InvalidateCache(entity);
    }

    /// <inheritdoc />
    public void Remove(T entity)
    {
        _dbSet.Remove(entity);
        InvalidateCache(entity);
    }

    /// <inheritdoc />
    public void RemoveRange(IEnumerable<T> entities)
    {
        _dbSet.RemoveRange(entities);
        foreach (var entity in entities)
            InvalidateCache(entity);
    }

    /// <summary>
    /// Invalidates the cache entry for a given entity.
    /// Uses reflection to get the primary key value for cache key construction.
    /// </summary>
    private void InvalidateCache(T entity)
    {
        if (_cache is null)
            return;

        var keyProperty = typeof(T).GetProperty("Id");
        if (keyProperty is not null)
        {
            var keyValue = keyProperty.GetValue(entity);
            if (keyValue is not null)
            {
                var cacheKey = $"{typeof(T).Name}_{keyValue}";
                _cache.Remove(cacheKey);
            }
        }
    }
}
