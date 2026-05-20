using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VvsIms.Domain.Entities;
using VvsIms.Domain.ValueObjects;

namespace VvsIms.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent API configuration for the Product entity.
/// </summary>
public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedOnAdd();
        builder.Property(p => p.Imei).IsRequired().HasMaxLength(17);
        builder.Property(p => p.Vendor).HasMaxLength(100);
        builder.Property(p => p.InvoiceNumber).HasMaxLength(50);
        builder.Property(p => p.PhoneCheck).HasDefaultValue(false);

        builder.OwnsOne(p => p.BaseProperties, bp =>
        {
            bp.Property(b => b.Model).IsRequired().HasMaxLength(100).HasColumnName("model");
            bp.Property(b => b.Storage).IsRequired().HasMaxLength(50).HasColumnName("storage");
            bp.Property(b => b.Color).IsRequired().HasMaxLength(50).HasColumnName("color");
            bp.Property(b => b.Grade).IsRequired().HasColumnName("grade");
            bp.Property(b => b.Sku).IsRequired().HasMaxLength(50).HasColumnName("sku");
            bp.Property(b => b.BuyingPlatform).IsRequired().HasColumnName("buying_platform");
            bp.OwnsOne(b => b.Cost, c =>
            {
                c.Property(m => m.Amount).IsRequired().HasPrecision(10, 2).HasColumnName("cost");
                c.Property(m => m.Currency).IsRequired().HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("cost_currency");
            });
        });

        builder.Property(p => p.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
        builder.Property(p => p.UpdatedAtUtc);
    }
}

/// <summary>
/// Fluent API configuration for the ProductSku entity.
/// </summary>
public class ProductSkuConfiguration : IEntityTypeConfiguration<ProductSku>
{
    public void Configure(EntityTypeBuilder<ProductSku> builder)
    {
        builder.ToTable("product_skus");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedOnAdd();
        builder.Property(p => p.Sku).IsRequired().HasMaxLength(50);
        builder.HasIndex(p => p.Sku).IsUnique();
        builder.Property(p => p.Model).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Storage).IsRequired().HasMaxLength(50);
        builder.Property(p => p.Color).IsRequired().HasMaxLength(50);
        builder.Property(p => p.Grade).IsRequired();
        builder.Property(p => p.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
        builder.Property(p => p.UpdatedAtUtc);
    }
}

/// <summary>
/// Fluent API configuration for the ChannelMapping entity.
/// </summary>
public class ChannelMappingConfiguration : IEntityTypeConfiguration<ChannelMapping>
{
    public void Configure(EntityTypeBuilder<ChannelMapping> builder)
    {
        builder.ToTable("channel_mappings");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedOnAdd();
        builder.Property(c => c.SystemSKU).IsRequired().HasMaxLength(50);
        builder.Property(c => c.ChannelName).IsRequired().HasMaxLength(50);
        builder.Property(c => c.ChannelSKU).IsRequired().HasMaxLength(100);
        builder.Property(c => c.ShopSKU).HasMaxLength(100);
        builder.HasIndex(c => new { c.SystemSKU, c.ChannelName });
        builder.Property(c => c.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
        builder.Property(c => c.UpdatedAtUtc);
    }
}

/// <summary>
/// Fluent API configuration for the AuditLog entity.
/// </summary>
public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedOnAdd();
        builder.Property(a => a.CorrelationId).IsRequired().HasMaxLength(64);
        builder.HasIndex(a => a.CorrelationId);
        builder.Property(a => a.Module).IsRequired().HasMaxLength(100);
        builder.Property(a => a.Action).IsRequired().HasMaxLength(100);
        builder.Property(a => a.Status).IsRequired().HasMaxLength(30);
        builder.Property(a => a.EntityType).HasMaxLength(100);
        builder.Property(a => a.EntityKey).HasMaxLength(200);
        builder.Property(a => a.RequestPayload);
        builder.Property(a => a.BeforePayload);
        builder.Property(a => a.AfterPayload);
        builder.Property(a => a.ErrorDetails);
        builder.Property(a => a.UserId).HasMaxLength(100);
        builder.Property(a => a.UserEmail).HasMaxLength(100);
        builder.Property(a => a.Endpoint).HasMaxLength(255);
        builder.Property(a => a.HttpMethod).HasMaxLength(10);
        builder.Property(a => a.ClientIp).HasMaxLength(100);
        builder.Property(a => a.DurationMs);
        builder.Property(a => a.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
    }
}

/// <summary>
/// Fluent API configuration for the ThreadStatus entity — unique ThreadId.
/// </summary>
public class ThreadStatusConfiguration : IEntityTypeConfiguration<ThreadStatus>
{
    public void Configure(EntityTypeBuilder<ThreadStatus> builder)
    {
        builder.ToTable("thread_statuses");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedOnAdd();
        builder.Property(t => t.ThreadId).IsRequired();
        builder.HasIndex(t => t.ThreadId).IsUnique();
        builder.Property(t => t.OrderId).IsRequired().HasMaxLength(100);
        builder.Property(t => t.Status).IsRequired().HasMaxLength(50);
        builder.Property(t => t.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
        builder.Property(t => t.UpdatedAtUtc);
    }
}

/// <summary>
/// Fluent API configuration for the InventoryItem entity.
/// </summary>
public class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    public void Configure(EntityTypeBuilder<InventoryItem> builder)
    {
        builder.ToTable("inventory_items");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).ValueGeneratedOnAdd();
        builder.Property(i => i.InventoryId).IsRequired();
        builder.Property(i => i.Date);
        builder.Property(i => i.Sku).HasMaxLength(50);
        builder.Property(i => i.Model).HasMaxLength(100);
        builder.Property(i => i.Storage).HasMaxLength(50);
        builder.Property(i => i.Color).HasMaxLength(50);
        builder.Property(i => i.Grade).HasMaxLength(20);
        builder.Property(i => i.Cost).HasPrecision(10, 2);
        builder.Property(i => i.InvoiceNo).HasMaxLength(50);
        builder.Property(i => i.Imei).HasMaxLength(17);
        builder.Property(i => i.Order).HasMaxLength(50);
        builder.Property(i => i.DateShip);
        builder.Property(i => i.Rma).HasMaxLength(10);
        builder.Property(i => i.Vendor).HasMaxLength(100);

        builder.HasOne(i => i.Inventory)
            .WithMany(inv => inv.InventoryItems)
            .HasForeignKey(i => i.InventoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(i => i.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
        builder.Property(i => i.UpdatedAtUtc);
    }
}
