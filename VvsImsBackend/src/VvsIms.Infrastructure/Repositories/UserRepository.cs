using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Application.Interfaces;
using VvsIms.Domain.Entities;
using VvsIms.Infrastructure.Persistence;

namespace VvsIms.Infrastructure.Repositories;

/// <summary>
/// User repository implementation with HMACSHA512 password hashing.
/// Compatible with the existing contractor data migration pattern.
/// Uses VvsImsDbContext for all data access.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly VvsImsDbContext _context;
    private readonly ILogger<UserRepository> _logger;

    public UserRepository(VvsImsDbContext context, ILogger<UserRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<User?> GetByUserNameAsync(string userName, CancellationToken ct = default)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserName == userName, ct);
    }

    /// <inheritdoc />
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserEmail == email, ct);
    }

    /// <inheritdoc />
    public async Task<User?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Users
            .Include(u => u.Role)
            .OrderBy(u => u.UserName)
            .ToListAsync(ct);
    }

    /// <inheritdoc />
    public async Task<User> CreateAsync(User user, string password, CancellationToken ct = default)
    {
        CreatePasswordHash(password, out var passwordHash, out var passwordSalt);
        user.PasswordHash = passwordHash;
        user.PasswordSalt = passwordSalt;

        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("User created: {UserName} (Id={Id})", user.UserName, user.Id);
        return user;
    }

    /// <inheritdoc />
    public async Task UpdateAsync(User user, CancellationToken ct = default)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync(ct);
    }

    /// <inheritdoc />
    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var user = await _context.Users.FindAsync(new object[] { id }, ct);
        if (user is not null)
        {
            _context.Users.Remove(user);
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("User deleted: Id={Id}", id);
        }
    }

    /// <inheritdoc />
    public async Task<User?> ValidateCredentialsAsync(string userName, string password, CancellationToken ct = default)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserName == userName, ct);

        if (user is null || user.PasswordHash is null || user.PasswordSalt is null)
        {
            _logger.LogWarning("Credential validation failed: user not found or missing hash — {UserName}", userName);
            return null;
        }

        if (!VerifyPasswordHash(password, user.PasswordHash, user.PasswordSalt))
        {
            _logger.LogWarning("Credential validation failed: incorrect password — {UserName}", userName);
            return null;
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Credential validation failed: account inactive — {UserName}", userName);
            return null;
        }

        return user;
    }

    /// <inheritdoc />
    public async Task<User?> ValidateCredentialsByEmailAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserEmail == email, ct);

        if (user is null || user.PasswordHash is null || user.PasswordSalt is null)
        {
            _logger.LogWarning("Credential validation failed: user not found or missing hash — {Email}", email);
            return null;
        }

        if (!VerifyPasswordHash(password, user.PasswordHash, user.PasswordSalt))
        {
            _logger.LogWarning("Credential validation failed: incorrect password — {Email}", email);
            return null;
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Credential validation failed: account inactive — {Email}", email);
            return null;
        }

        return user;
    }

    /// <inheritdoc />
    public async Task<string?> GetRoleNameAsync(int roleId, CancellationToken ct = default)
    {
        var role = await _context.Roles.FindAsync(new object[] { roleId }, ct);
        return role?.RoleName;
    }

    /// <inheritdoc />
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _context.SaveChangesAsync(ct);
    }

    // ── HMACSHA512 Password Hashing ──────────────────────────────

    /// <summary>
    /// Creates an HMACSHA512 password hash and salt.
    /// The salt is generated randomly per password and stored alongside the hash.
    /// This is compatible with the existing contractor data migration pattern.
    /// </summary>
    private static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
    {
        using var hmac = new HMACSHA512();
        passwordSalt = hmac.Key;
        passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
    }

    /// <summary>
    /// Verifies a plaintext password against the stored HMACSHA512 hash and salt.
    /// </summary>
    private static bool VerifyPasswordHash(string password, byte[] storedHash, byte[] storedSalt)
    {
        using var hmac = new HMACSHA512(storedSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        return computedHash.SequenceEqual(storedHash);
    }
}
