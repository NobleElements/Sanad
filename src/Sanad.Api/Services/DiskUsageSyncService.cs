using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;

namespace Sanad.Api.Services;

public class DiskUsageSyncService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DiskUsageSyncService> _logger;

    public DiskUsageSyncService(IServiceProvider services, ILogger<DiskUsageSyncService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DiskUsageSyncService is starting.");
        
        // Wait 1 minute before the first run to allow the app to start up smoothly,
        // then run every 24 hours.
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncDiskUsageAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing DiskUsageSyncService.");
            }

            // Wait 24 hours until the next run
            try
            {
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task SyncDiskUsageAsync(CancellationToken stoppingToken)
    {
        using var scope = _services.CreateScope();
        var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        var quotaService = scope.ServiceProvider.GetRequiredService<DiskQuotaService>();

        var usernames = await adminDb.Users.Select(u => u.Username).ToListAsync(stoppingToken);
        _logger.LogInformation($"Found {usernames.Count} users to sync disk usage for.");

        foreach (var username in usernames)
        {
            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                await quotaService.UpdateDiskUsageAsync(username);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to update disk usage for user {username}");
            }
        }
        
        _logger.LogInformation("Finished syncing disk usage for all users.");
    }
}
