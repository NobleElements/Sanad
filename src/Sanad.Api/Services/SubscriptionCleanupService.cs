using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public class SubscriptionCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SubscriptionCleanupService> _logger;

    public SubscriptionCleanupService(IServiceProvider serviceProvider, ILogger<SubscriptionCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SubscriptionCleanupService is starting.");

        // Wait 5 minute before the first run to allow the app to start up smoothly,
        // then run every 24 hours.
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

        // Run immediately on start, then every hour
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupExpiredSubscriptionsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing SubscriptionCleanupService.");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task CleanupExpiredSubscriptionsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();

        var expiredUsers = await db.Users
            .Where(u => u.TierId != 1 && u.TierExpiresAt.HasValue && u.TierExpiresAt.Value < DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        if (expiredUsers.Any())
        {
            _logger.LogInformation($"Found {expiredUsers.Count} expired subscriptions to clean up.");

            foreach (var user in expiredUsers)
            {
                // Log history
                db.SubscriptionHistories.Add(new SubscriptionHistory
                {
                    UserId = user.Id,
                    TierId = user.TierId,
                    StartedAt = user.TierStartedAt,
                    EndedAt = DateTime.UtcNow
                });

                // Revert to Free Tier (TierId = 1)
                user.TierId = 1;
                user.TierStartedAt = DateTime.UtcNow;
                user.TierExpiresAt = null;
                user.PaddleSubscriptionStatus = "expired";
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
