using System.Linq;
using System.Linq.Expressions;

namespace VvsIms.Domain.Interfaces;

/// <summary>
/// Generic repository interface for aggregate root entities.
/// Provides CRUD operations with cancellation support and eager loading.
/// </summary>
/// <typeparam name="T">The entity type.</typeparam>
public interface IRepository<T> where T : class
{
    /// <summary>
    /// Gets the raw IQueryable for custom LINQ projections and queries.
    /// </summary>
    IQueryable<T> Query { get; }

    /// <summary>
    /// Gets an entity by its primary key.
    /// </summary>
    Task<T?> GetByIdAsync(object id, CancellationToken ct = default);

    /// <summary>
    /// Lists entities with optional filtering, ordering, and eager loading.
    /// </summary>
    Task<List<T>> ListAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        CancellationToken ct = default,
        params Expression<Func<T, object>>[] includes);

    /// <summary>
    /// Projects entities to a DTO shape with optional filtering and ordering.
    /// </summary>
    Task<List<TResult>> QueryAsync<TResult>(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        Expression<Func<T, TResult>>? selector = null,
        CancellationToken ct = default,
        params Expression<Func<T, object>>[] includes);

    /// <summary>
    /// Gets all entities without filtering.
    /// </summary>
    Task<List<T>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Adds a new entity.
    /// </summary>
    Task<T> AddAsync(T entity, CancellationToken ct = default);

    /// <summary>
    /// Adds multiple entities in bulk.
    /// </summary>
    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default);

    /// <summary>
    /// Marks an entity as modified.
    /// </summary>
    void Update(T entity);

    /// <summary>
    /// Removes an entity.
    /// </summary>
    void Remove(T entity);

    /// <summary>
    /// Removes multiple entities in bulk.
    /// </summary>
    void RemoveRange(IEnumerable<T> entities);
}
