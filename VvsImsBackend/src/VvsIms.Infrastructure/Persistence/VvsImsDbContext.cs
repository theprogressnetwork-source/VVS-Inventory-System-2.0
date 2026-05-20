using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using VvsIms.Domain.Entities;

namespace VvsIms.Infrastructure.Persistence;

/// <summary>
/// EF Core DbContext for the VVS IMS database.
/// Supports both MySQL (Pomelo) and SQLite (local dev) providers.
/// All entity configurations are applied via Fluent API in the Configurations folder.
/// </summary>
public class VvsImsDbContext : DbContext
{
    /// <summary>
    /// Whether the current provider is SQLite (local dev mode).
    /// Set by Program.cs based on DB_USE_SQLITE env var.
    /// </summary>
    public static bool IsSqlite { get; set; } = false;

    /// <summary>
    /// Initializes a new instance of the <see cref="VvsImsDbContext"/> class.
    /// </summary>
    public VvsImsDbContext(DbContextOptions<VvsImsDbContext> options) : base(options)
    {
    }

    // ── DbSets ──────────────────────────────────────────────────────
    public DbSet<Stock> Stocks => Set<Stock>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductSku> ProductSkus => Set<ProductSku>();
    public DbSet<ChannelMapping> ChannelMappings => Set<ChannelMapping>();
    public DbSet<InventoryEvent> InventoryEvents => Set<InventoryEvent>();
    public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Outgoing> Outgoings => Set<Outgoing>();
    public DbSet<Pending> Pendings => Set<Pending>();
    public DbSet<StockReturn> StockReturns => Set<StockReturn>();
    public DbSet<ThreadMessage> ThreadMessages => Set<ThreadMessage>();
    public DbSet<ThreadResponse> ThreadResponses => Set<ThreadResponse>();
    public DbSet<ThreadStatus> ThreadStatuses => Set<ThreadStatus>();
    public DbSet<SystemSkuStockSnapshot> SystemSkuStockSnapshots => Set<SystemSkuStockSnapshot>();
    public DbSet<StockSyncLock> StockSyncLocks => Set<StockSyncLock>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();

    /// <summary>
    /// Applies all Fluent API configurations from the Configurations assembly.
    /// Uses snake_case naming convention for MySQL compatibility.
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from the assembly
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(VvsImsDbContext).Assembly);

        // Global: snake_case table naming
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            entity.SetTableName(entity.DisplayName().ToSnakeCase());
        }

        // ── SQLite Compatibility Layer ─────────────────────────────
        // Replace MySQL-specific defaults and column types for SQLite
        if (IsSqlite)
        {
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                // Replace UTC_TIMESTAMP() → CURRENT_TIMESTAMP (SQLite-compatible)
                foreach (var property in entity.GetDeclaredProperties())
                {
                    if (property.GetDefaultValueSql() == "UTC_TIMESTAMP()")
                    {
                        property.SetDefaultValueSql("CURRENT_TIMESTAMP");
                    }
                }

                // Replace MySQL "longblob" → SQLite "BLOB"
                foreach (var property in entity.GetDeclaredProperties())
                {
                    var columnType = property.GetColumnType();
                    if (columnType?.Equals("longblob", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        property.SetColumnType("BLOB");
                    }
                }

                // SQLite doesn't support HasPrecision — remove it
                foreach (var property in entity.GetDeclaredProperties())
                {
                    if (property.GetPrecision().HasValue)
                    {
                        property.SetPrecision(null);
                        property.SetScale(null);
                    }
                }
            }
        }
    }

    /// <summary>
    /// Configures audit fields automatically before saving.
    /// </summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAtUtc = DateTime.UtcNow;
                    entry.Entity.UpdatedAtUtc = null;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAtUtc = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// Extension method to convert PascalCase to snake_case for MySQL table names.
/// </summary>
public static class StringExtensions
{
    /// <summary>
    /// Converts PascalCase string to snake_case.
    /// </summary>
    public static string ToSnakeCase(this string text) =>
        string.Concat(text.Select((ch, i) =>
            i > 0 && char.IsUpper(ch) ? "_" + ch.ToString() : ch.ToString())).ToLowerInvariant();
}
