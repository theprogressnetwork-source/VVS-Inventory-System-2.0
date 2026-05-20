using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VvsIms.Domain.Entities;
using VvsIms.Domain.ValueObjects;

namespace VvsIms.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent API configuration for the Inventory aggregate entity.
/// </summary>
public class InventoryConfiguration : IEntityTypeConfiguration<Inventory>
{
    public void Configure(EntityTypeBuilder<Inventory> builder)
    {
        builder.ToTable("inventories");

        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).ValueGeneratedOnAdd();

        builder.Property(i => i.Quantity).IsRequired();
        builder.Property(i => i.Winning).HasDefaultValue(false);
        builder.Property(i => i.Platform).IsRequired();

        // Owned value object: BaseProperties
        builder.OwnsOne(i => i.BaseProperties, bp =>
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

        // Owned Money value objects for pricing fields
        builder.OwnsOne(i => i.AdjustmentPrice, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("adjustment_price");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("adjustment_price_currency");
        });

        builder.OwnsOne(i => i.SellingPrice, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("selling_price");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("selling_price_currency");
        });

        builder.OwnsOne(i => i.Bought, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("bought");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("bought_currency");
        });

        builder.OwnsOne(i => i.ProductWinningPrice, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("product_winning_price");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("product_winning_price_currency");
        });

        builder.OwnsOne(i => i.PlatformPrice, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("platform_price");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("platform_price_currency");
        });

        builder.OwnsOne(i => i.PlatformDiscountPrice, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("platform_discount_price");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("platform_discount_price_currency");
        });

        builder.OwnsOne(i => i.PlatformWinnerPrice, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("platform_winner_price");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("platform_winner_price_currency");
        });

        builder.OwnsOne(i => i.PlatformWinnerShippingPrice, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("platform_winner_shipping_price");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("platform_winner_shipping_price_currency");
        });

        builder.OwnsOne(i => i.PlatformDifference, m =>
        {
            m.Property(p => p.Amount).HasPrecision(10, 2).HasColumnName("platform_difference");
            m.Property(p => p.Currency).HasMaxLength(3).HasDefaultValue("CAD").HasColumnName("platform_difference_currency");
        });

        // Platform fields
        builder.Property(i => i.PlatformDiscountStartDate);
        builder.Property(i => i.PlatformDiscountEndDate);
        builder.Property(i => i.PlatformQuantity);
        builder.Property(i => i.PlatformSkuTitle).HasMaxLength(200);
        builder.Property(i => i.PlatformWinningOffer);

        // Navigation: InventoryItems
        builder.HasMany(i => i.InventoryItems)
            .WithOne(ii => ii.Inventory)
            .HasForeignKey(ii => ii.InventoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(i => i.CreatedAtUtc).HasDefaultValueSql("UTC_TIMESTAMP()");
        builder.Property(i => i.UpdatedAtUtc);
    }
}
