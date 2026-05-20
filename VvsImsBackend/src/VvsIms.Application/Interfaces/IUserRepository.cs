using VvsIms.Domain.Entities;

namespace VvsIms.Application.Interfaces;

/// <summary>
/// User-specific repository contract for authentication and user management.
/// Extends the generic repository with domain-specific query methods.
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Gets a user by their login user name.
    /// </summary>
    Task<User?> GetByUserNameAsync(string userName, CancellationToken ct = default);

    /// <summary>
    /// Gets a user by their email address.
    /// </summary>
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);

    /// <summary>
    /// Gets a user by primary key with their Role navigation property loaded.
    /// </summary>
    Task<User?> GetByIdAsync(int id, CancellationToken ct = default);

    /// <summary>
    /// Gets all users with their Role navigation properties loaded.
    /// </summary>
    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Creates a new user with HMACSHA512-hashed password.
    /// Returns the created entity with Id assigned.
    /// </summary>
    Task<User> CreateAsync(User user, string password, CancellationToken ct = default);

    /// <summary>
    /// Marks a user as modified (for refresh token updates, etc.).
    /// </summary>
    Task UpdateAsync(User user, CancellationToken ct = default);

    /// <summary>
    /// Deletes a user by primary key.
    /// </summary>
    Task DeleteAsync(int id, CancellationToken ct = default);

    /// <summary>
    /// Validates user credentials using HMACSHA512 hash comparison.
    /// Returns the user if valid, null if invalid.
    /// </summary>
    Task<User?> ValidateCredentialsAsync(string userName, string password, CancellationToken ct = default);

    /// <summary>
    /// Validates user credentials by email using HMACSHA512 hash comparison.
    /// Returns the user if valid, null if invalid.
    /// </summary>
    Task<User?> ValidateCredentialsByEmailAsync(string email, string password, CancellationToken ct = default);

    /// <summary>
    /// Gets the role name for a given role ID.
    /// </summary>
    Task<string?> GetRoleNameAsync(int roleId, CancellationToken ct = default);

    /// <summary>
    /// Persists all pending changes to the database.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
