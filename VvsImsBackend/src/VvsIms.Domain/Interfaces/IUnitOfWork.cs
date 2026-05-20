namespace VvsIms.Domain.Interfaces;

/// <summary>
/// Unit of Work interface — coordinates repository access and transactional boundaries.
/// Implementations MUST use lazy initialization with cached repositories
/// to fix the contractor's bug where new instances were created on every property access.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    /// <summary>
    /// Gets the repository for the specified entity type.
    /// Repositories are lazily initialized and cached per lifetime scope.
    /// </summary>
    IRepository<T> Repository<T>() where T : class;

    /// <summary>
    /// Persists all pending changes to the database.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);

    /// <summary>
    /// Begins a database transaction.
    /// Returns an IDisposable that represents the transaction handle.
    /// The concrete type is infrastructure-specific (EF Core IDbContextTransaction).
    /// </summary>
    Task<IDisposable> BeginTransactionAsync(CancellationToken ct = default);

    /// <summary>
    /// Executes an action within a transactional boundary with automatic commit/rollback.
    /// Uses execution strategy for resilient database connections.
    /// </summary>
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);
}
