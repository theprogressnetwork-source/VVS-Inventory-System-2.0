using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VvsIms.Domain.Entities;
using VvsIms.Domain.ValueObjects;

namespace VvsIms.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent API configuration for the Stock entity.
/// Replaces all data annotations with proper EF Core mappings.
/// </summary>
public class StockConfiguration : IEntityTypeConfiguration<Stock>
{
    public void Configure(EntityTypeBuilder<Stock> builder)
    {
        builder.ToTable("stocks");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedOnAdd();

        // IMEI — unique constraint, max length 17
        builder.Property(s => s.Imei)
            .IsRequired()
            .HasMaxLength(17);
        builder.HasIndex(s => s.Imei).IsUnique();

        // Order number
        builder.Property(s => s.OrderNo)
            .HasMaxLength(50);

        // Date fields
        builder.Property(s => s.DateSold);
        builder.Property(s => s.DateAdded);
        builder.Property(s => s.ShippedDate);
        builder.Property(s => s.OrderLandingDate);

        // Boolean fields
        builder.Property(s => s.Rma).HasDefaultValue(false);
        builder.Property(s => s.PhoneCheck).HasDefaultValue(false);
        builder.Property(s => s.IsManualImei).HasDefaultValue(false);
        builder.Property(s => s.IsShipped).HasDefaultValue(false);

        // String fields
        builder.Property(s => s.Vendor).HasMaxLength(100);
        builder.Property(s => s.InvoiceNumber).HasMaxLength(50);
        builder.Property(s => s.OrderStatus).HasMaxLength(50);

        // Owned value object: BaseProperties (stored as columns on stocks table)
        builder.OwnsOne(s => s.BaseProperties, bp =>
        {
            bp.Property(b => b.Model).IsRequired().HasMaxLength(100).HasColumnName("model");
            bp.Property(b => b.Storage).IsRequired().HasMaxLength(50).HasColumnName("storage");
            bp.Property(b => b.Color).IsRequired().HasMaxLength(50).HasColumnName("color");
            bp.Property(b => b.Grade).IsRequired().HasColumnName("grade");
            bp.Property(b => b.Sku).IsRequired().HasMaxLength(50).HasColumnName("sku");
            bp.Property(b => b.BuyingPlatform).IsRequired().HasColumnName("buying_platform");

            // Owned Money value object for Cost
            bp.OwnsOne(b => b.Cost, c =>
            {
                c.Property(m => m.Amount).IsRequired().HasPrecision(10, 2).HasColumnName("cost");
                c.Property(m => m.Currency).IsRequired().HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("cost_currency");
            });
        });

        // Audit fields from BaseEntity
        builder.Property(s => s.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
        builder.Property(s => s.UpdatedAtUtc);
    }
}
