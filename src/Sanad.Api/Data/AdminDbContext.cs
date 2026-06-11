using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;

namespace Sanad.Api.Data;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<StorageTier> Tiers => Set<StorageTier>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<AppUser>()
            .HasOne(u => u.Tier)
            .WithMany()
            .HasForeignKey(u => u.TierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed default tiers
        modelBuilder.Entity<StorageTier>().HasData(
            new StorageTier { Id = 1, Name = "Supporter", Price = 1m, DiskLimitBytes = 5L * Constants.BytesPerKb * Constants.BytesPerKb * Constants.BytesPerKb },
            new StorageTier { Id = 2, Name = "Individual", Price = 3m, DiskLimitBytes = 10L * Constants.BytesPerKb * Constants.BytesPerKb * Constants.BytesPerKb },
            new StorageTier { Id = 3, Name = "Family", Price = 7m, DiskLimitBytes = 50L * Constants.BytesPerKb * Constants.BytesPerKb * Constants.BytesPerKb },
            new StorageTier { Id = 4, Name = "Data Hoarder", Price = 12m, DiskLimitBytes = 200L * Constants.BytesPerKb * Constants.BytesPerKb * Constants.BytesPerKb }
        );
    }
}
