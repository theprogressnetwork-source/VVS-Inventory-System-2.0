using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VvsIms.Domain.Entities;

namespace VvsIms.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent API configuration for the Role entity.
/// Includes deterministic seed data for Admin (Id=1) and User (Id=2) roles.
/// Uses HasData for deterministic migration IDs.
/// </summary>
public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        // ── Table name ────────────────────────────────────────────
        builder.ToTable("role");

        // ── RoleName: required, max length, unique index ──────────
        builder.Property(r => r.RoleName)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(r => r.RoleName)
            .IsUnique()
            .HasDatabaseName("ix_role_role_name_unique");

        // ── Optional fields ───────────────────────────────────────
        builder.Property(r => r.RoleDescription).HasMaxLength(500);
        builder.Property(r => r.RolePermissions).HasMaxLength(2000);
        builder.Property(r => r.CreatedBy).HasMaxLength(100);
        builder.Property(r => r.UpdatedBy).HasMaxLength(100);

        // ── Seed Data: Deterministic IDs for migration ────────────
        builder.HasData(
            new Role
            {
                Id = 1,
                RoleName = "Admin",
                RoleDescription = "Full system administrator with all permissions.",
                RolePermissions = "stock:read,stock:write,inventory:read,inventory:write,product:read,product:write,user:read,user:write,report:read,report:write,settings:read,settings:write",
                CreatedBy = "System"
            },
            new Role
            {
                Id = 2,
                RoleName = "User",
                RoleDescription = "Standard user with read and limited write permissions.",
                RolePermissions = "stock:read,inventory:read,product:read,report:read",
                CreatedBy = "System"
            }
        );
    }
}
