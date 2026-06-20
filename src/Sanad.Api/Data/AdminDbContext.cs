using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Sanad.Api.Models;

namespace Sanad.Api.Data;

public class AdminDbContext : DbContext, IDataProtectionKeyContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<StorageTier> Tiers => Set<StorageTier>();
    public DbSet<Datastore> Datastores => Set<Datastore>();
    public DbSet<SubscriptionHistory> SubscriptionHistories => Set<SubscriptionHistory>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<DataProtectionKey> DataProtectionKeys { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<SystemSetting>()
            .HasKey(s => s.Key);

        modelBuilder.Entity<AppUser>()
            .Property(u => u.Username)
            .UseCollation("NOCASE");

        modelBuilder.Entity<AppUser>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<AppUser>()
            .HasOne(u => u.Tier)
            .WithMany()
            .HasForeignKey(u => u.TierId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AppUser>()
            .HasOne(u => u.Datastore)
            .WithMany()
            .HasForeignKey(u => u.DatastoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SubscriptionHistory>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SubscriptionHistory>()
            .HasOne(s => s.Tier)
            .WithMany()
            .HasForeignKey(s => s.TierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed default tiers
        modelBuilder.Entity<StorageTier>().HasData(
            new StorageTier { Id = 1, Name = "Free", Price = 0m, DiskLimitBytes = 1L * Constants.GigaByte },
            new StorageTier { Id = 2, Name = "Supporter", Price = 1m, DiskLimitBytes = 5L * Constants.GigaByte },
            new StorageTier { Id = 3, Name = "Individual", Price = 3m, DiskLimitBytes = 10L * Constants.GigaByte },
            new StorageTier { Id = 4, Name = "Data Hoarder", Price = 7m, DiskLimitBytes = 200L * Constants.GigaByte }
        );

        // Seed default datastore
        modelBuilder.Entity<Datastore>().HasData(
            new Datastore { 
                Id = 1, 
                Name = "Default", 
                Path = "Data", 
                IsDefault = true,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
