using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace VvsIms.Infrastructure.Persistence;

/// <summary>
/// Design-time DbContext factory for EF Core migrations.
/// Provides a fallback MySQL connection string when environment variables
/// are not available (e.g., during `dotnet ef migrations add`).
/// The actual connection string at runtime comes from .env via EnvironmentSecretProvider.
/// </summary>
public class VvsImsDbContextFactory : IDesignTimeDbContextFactory<VvsImsDbContext>
{
    public VvsImsDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<VvsImsDbContext>();

        // ── Fallback connection string for design-time migration generation ──
        // This does NOT need a real database — migrations are generated from the model.
        var connectionString = "Server=localhost;Port=3306;Database=vvs_ims_pristine;" +
                               "User=design_time_user;Password=design_time_password;" +
                               "AllowPublicKeyRetrieval=True;";

        var serverVersion = new MySqlServerVersion(new Version(8, 0, 32));

        optionsBuilder.UseMySql(connectionString, serverVersion, mySqlOptions =>
        {
            mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 1,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null);
            mySqlOptions.MigrationsAssembly(
                typeof(VvsImsDbContext).Assembly.FullName);
        });

        return new VvsImsDbContext(optionsBuilder.Options);
    }
}
