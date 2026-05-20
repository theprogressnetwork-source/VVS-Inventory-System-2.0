using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VvsIms.Domain.Entities;

namespace VvsIms.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent API configuration for the User entity.
/// Configures column types, indexes, constraints, and relationships
/// for MySQL compatibility with snake_case naming.
/// </summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // ── Table name (snake_case applied globally, but explicit for clarity) ──
        builder.ToTable("user");

        // ── UserName: required, max length, unique index ──────────
        builder.Property(u => u.UserName)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(u => u.UserName)
            .IsUnique()
            .HasDatabaseName("ix_user_user_name_unique");

        // ── Email: required, max length ───────────────────────────
        builder.Property(u => u.UserEmail)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.UserEmail)
            .IsUnique()
            .HasDatabaseName("ix_user_user_email_unique");

        // ── Password (legacy): optional, max length ───────────────
        builder.Property(u => u.Password)
            .HasMaxLength(500);

        // ── PasswordHash: optional byte array ─────────────────────
        builder.Property(u => u.PasswordHash)
            .HasColumnType("longblob");

        // ── PasswordSalt: optional byte array ─────────────────────
        builder.Property(u => u.PasswordSalt)
            .HasColumnType("longblob");

        // ── RefreshToken: optional string ─────────────────────────
        builder.Property(u => u.RefreshToken)
            .HasMaxLength(500);

        // ── RefreshTokenExpiryTime: optional DateTime ─────────────
        builder.Property(u => u.RefreshTokenExpiryTime);

        // ── IsActive: defaults to true ────────────────────────────
        builder.Property(u => u.IsActive)
            .HasDefaultValue(true);

        // ── Optional fields ───────────────────────────────────────
        builder.Property(u => u.UserFirstName).HasMaxLength(100);
        builder.Property(u => u.UserLastName).HasMaxLength(100);
        builder.Property(u => u.UserPreferredName).HasMaxLength(150);
        builder.Property(u => u.UserPhone).HasMaxLength(30);
        builder.Property(u => u.CreatedBy).HasMaxLength(100);
        builder.Property(u => u.UpdatedBy).HasMaxLength(100);

        // ── Relationship to Role ──────────────────────────────────
        builder.HasOne(u => u.Role)
            .WithMany(r => r.Users)
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_user_role");
    }
}
