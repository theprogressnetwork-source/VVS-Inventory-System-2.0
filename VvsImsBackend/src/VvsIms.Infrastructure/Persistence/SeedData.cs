using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VvsIms.Domain.Entities;

namespace VvsIms.Infrastructure.Persistence;

/// <summary>
/// Database seed data initializer.
/// Creates the default admin user if it does not already exist.
/// Roles are seeded via Fluent API HasData (deterministic IDs in migration).
/// The admin user is seeded here because password hashing requires
/// runtime computation (HMACSHA512) which cannot be done in HasData.
/// </summary>
public static class SeedData
{
    /// <summary>
    /// Seeds the default admin user if no users exist in the database.
    /// Password: "Admin@2026!" — MUST be changed on first login.
    /// </summary>
    public static async Task SeedAsync(VvsImsDbContext context, ILogger logger, CancellationToken ct = default)
    {
        // ── Check if any users already exist ───────────────────────
        if (await context.Users.AnyAsync(ct))
        {
            logger.LogInformation("Seed data: Users already exist. Skipping admin seed.");
            return;
        }

        // ── Create HMACSHA512 password hash for admin ─────────────
        const string adminPassword = "Admin@2026!";
        CreatePasswordHash(adminPassword, out var passwordHash, out var passwordSalt);

        var adminUser = new User
        {
            UserName = "admin",
            UserEmail = "admin@vvs-ims.local",
            UserFirstName = "System",
            UserLastName = "Administrator",
            UserPreferredName = "Admin",
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            RoleId = 1, // Admin role (seeded via RoleConfiguration HasData)
            IsActive = true,
            CreatedBy = "System"
        };

        context.Users.Add(adminUser);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Seed data: Default admin user created (UserName=admin, RoleId=1). CHANGE THE DEFAULT PASSWORD IMMEDIATELY!");
    }

    /// <summary>
    /// Creates an HMACSHA512 password hash and salt.
    /// The salt is the HMAC key — generated randomly per user.
    /// The hash is the HMAC output of the UTF-8 encoded password.
    /// </summary>
    private static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
    {
        using var hmac = new HMACSHA512();
        passwordSalt = hmac.Key;
        passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
    }
}
