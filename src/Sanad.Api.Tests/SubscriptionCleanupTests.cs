using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class SubscriptionCleanupTests
{
    [Fact]
    public async Task CleanupExpiredSubscriptionsAsync_RevertsExpiredUsersToFreeTier()
    {
        // Arrange
        var (adminDb, connection) = TestDbContextFactory.CreateSqliteInMemoryAdminDbContext();
        using (connection)
        using (adminDb)
        {
            var expiredUser = new AppUser
            {
                Id = Guid.NewGuid(),
                Username = "expired_user",
                PasswordHash = "hash",
                TierId = 2,
                DatastoreId = 1,
                TierStartedAt = DateTime.UtcNow.AddMonths(-1),
                TierExpiresAt = DateTime.UtcNow.AddDays(-2), // Expired 2 days ago
                PaddleSubscriptionStatus = "active"
            };

            var activeUser = new AppUser
            {
                Id = Guid.NewGuid(),
                Username = "active_pro_user",
                PasswordHash = "hash",
                TierId = 2,
                DatastoreId = 1,
                TierStartedAt = DateTime.UtcNow.AddMonths(-1),
                TierExpiresAt = DateTime.UtcNow.AddMonths(1), // Still active
                PaddleSubscriptionStatus = "active"
            };

            var freeUser = new AppUser
            {
                Id = Guid.NewGuid(),
                Username = "free_user",
                PasswordHash = "hash",
                TierId = 1,
                DatastoreId = 1,
                TierStartedAt = DateTime.UtcNow.AddMonths(-6),
                TierExpiresAt = null,
                PaddleSubscriptionStatus = null
            };

            adminDb.Users.AddRange(expiredUser, activeUser, freeUser);
            await adminDb.SaveChangesAsync();

            // Set up ServiceProvider to provide the same DbContext options / connection
            var services = new ServiceCollection();
            services.AddScoped<AdminDbContext>(_ =>
            {
                var options = new DbContextOptionsBuilder<AdminDbContext>()
                    .UseSqlite(connection)
                    .Options;
                return new AdminDbContext(options);
            });
            using var serviceProvider = services.BuildServiceProvider();

            var cleanupService = new SubscriptionCleanupService(
                serviceProvider,
                NullLogger<SubscriptionCleanupService>.Instance);

            // Act
            var before = DateTime.UtcNow;
            await cleanupService.CleanupExpiredSubscriptionsAsync();
            var after = DateTime.UtcNow;

            // Assert
            adminDb.ChangeTracker.Clear();

            var reloadedExpired = await adminDb.Users.FindAsync(expiredUser.Id);
            Assert.NotNull(reloadedExpired);
            Assert.Equal(1, reloadedExpired.TierId); // Reverted to free tier
            Assert.Null(reloadedExpired.TierExpiresAt);
            Assert.Equal("expired", reloadedExpired.PaddleSubscriptionStatus);
            Assert.InRange(reloadedExpired.TierStartedAt, before, after); // Free tier starts now

            // Verify SubscriptionHistory was recorded
            var history = await adminDb.SubscriptionHistories
                .FirstOrDefaultAsync(h => h.UserId == expiredUser.Id);
            Assert.NotNull(history);
            Assert.Equal(2, history.TierId);
            Assert.Equal(expiredUser.TierStartedAt, history.StartedAt);
            Assert.NotNull(history.EndedAt);
            Assert.InRange(history.EndedAt.Value, before, after);

            // Verify active user remained Pro
            var reloadedActive = await adminDb.Users.FindAsync(activeUser.Id);
            Assert.NotNull(reloadedActive);
            Assert.Equal(2, reloadedActive.TierId);
            Assert.Equal("active", reloadedActive.PaddleSubscriptionStatus);
            Assert.Equal(activeUser.TierStartedAt, reloadedActive.TierStartedAt);
            Assert.Equal(activeUser.TierExpiresAt, reloadedActive.TierExpiresAt);

            // Verify free user was untouched
            var reloadedFree = await adminDb.Users.FindAsync(freeUser.Id);
            Assert.NotNull(reloadedFree);
            Assert.Equal(1, reloadedFree.TierId);
            Assert.Equal(freeUser.TierStartedAt, reloadedFree.TierStartedAt);

            // Only the expired user gets a history row
            Assert.Equal(1, await adminDb.SubscriptionHistories.CountAsync());
        }
    }
}
