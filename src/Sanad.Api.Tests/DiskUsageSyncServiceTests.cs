using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class DiskUsageSyncServiceTests
{
    private class TrackingDiskQuotaService : DiskQuotaService
    {
        public List<string> UpdatedUsers { get; } = new();

        public TrackingDiskQuotaService(AdminDbContext adminDb) : base(adminDb) { }

        public override Task UpdateDiskUsageAsync(string username)
        {
            UpdatedUsers.Add(username);
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task SyncDiskUsageAsync_UpdatesAllUsersInAdminDb()
    {
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var adminDb = adminDbFixture.Context;

        adminDb.Users.AddRange(
            new AppUser { Id = Guid.NewGuid(), Username = "user1", PasswordHash = "h1", DatastoreId = 1, TierId = 1 },
            new AppUser { Id = Guid.NewGuid(), Username = "user2", PasswordHash = "h2", DatastoreId = 1, TierId = 1 }
        );
        await adminDb.SaveChangesAsync();

        var trackingQuota = new TrackingDiskQuotaService(adminDb);

        var services = new ServiceCollection();
        services.AddScoped<AdminDbContext>(_ =>
        {
            var options = new DbContextOptionsBuilder<AdminDbContext>()
                .UseSqlite(adminDbFixture.Connection)
                .Options;
            return new AdminDbContext(options);
        });
        services.AddScoped<DiskQuotaService>(_ => trackingQuota);
        using var serviceProvider = services.BuildServiceProvider();

        var service = new DiskUsageSyncService(
            serviceProvider,
            NullLogger<DiskUsageSyncService>.Instance);

        await service.SyncDiskUsageAsync(CancellationToken.None);

        Assert.Equal(2, trackingQuota.UpdatedUsers.Count);
        Assert.Contains("user1", trackingQuota.UpdatedUsers);
        Assert.Contains("user2", trackingQuota.UpdatedUsers);
    }
}
