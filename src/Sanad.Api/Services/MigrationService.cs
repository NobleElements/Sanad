using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Sanad.Api.Data;

namespace Sanad.Api.Services;

public class MigrationService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<MigrationService> _logger;

    public MigrationService(IServiceScopeFactory scopeFactory, IMemoryCache cache, ILogger<MigrationService> logger)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
        _logger = logger;
    }

    public void StartMigration(Guid userId, int targetDatastoreId)
    {
        _logger.LogInformation($"Starting background migration for user {userId} to datastore {targetDatastoreId}");

        Task.Run(async () =>
        {
            try
            {
                await MigrateUserAsync(userId, targetDatastoreId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to migrate user {userId} to datastore {targetDatastoreId}");
            }
        });
    }

    private async Task MigrateUserAsync(Guid userId, int targetDatastoreId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();

        var user = await db.Users.Include(u => u.Datastore).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || user.Datastore == null)
            return;

        var targetDatastore = await db.Datastores.FindAsync(targetDatastoreId);
        if (targetDatastore == null)
            return;

        var sourceDsPath = user.Datastore.Path;
        if (!Path.IsPathRooted(sourceDsPath)) sourceDsPath = Path.Combine(Directory.GetCurrentDirectory(), sourceDsPath);
        
        var targetDsPath = targetDatastore.Path;
        if (!Path.IsPathRooted(targetDsPath)) targetDsPath = Path.Combine(Directory.GetCurrentDirectory(), targetDsPath);

        var sourcePath = Path.Combine(sourceDsPath, user.Username);
        var targetPath = Path.Combine(targetDsPath, user.Username);

        _logger.LogInformation($"Copying data from {sourcePath} to {targetPath}");

        // Only copy if source and target are different
        if (sourcePath != targetPath)
        {
            CopyDirectory(sourcePath, targetPath);
        }

        // Update database
        user.DatastoreId = targetDatastoreId;
        user.IsMigrating = false;
        user.TargetDatastoreId = null;

        await db.SaveChangesAsync();

        _cache.Set($"migrating_{user.Username}", false, TimeSpan.FromMinutes(5));

        _logger.LogInformation($"Migration successful for user {userId}. Updated datastore mapping.");

        // Delete old directory after successful DB update
        if (sourcePath != targetPath && Directory.Exists(sourcePath))
        {
            try
            {
                Directory.Delete(sourcePath, true);
                _logger.LogInformation($"Deleted old data directory: {sourcePath}");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Could not delete old directory {sourcePath}");
            }
        }
    }

    private void CopyDirectory(string sourceDir, string destinationDir)
    {
        if (!Directory.Exists(sourceDir))
            return;

        Directory.CreateDirectory(destinationDir);

        foreach (var file in Directory.GetFiles(sourceDir))
        {
            var destFile = Path.Combine(destinationDir, Path.GetFileName(file));
            File.Copy(file, destFile, true);
        }

        foreach (var directory in Directory.GetDirectories(sourceDir))
        {
            var destDirectory = Path.Combine(destinationDir, Path.GetFileName(directory));
            CopyDirectory(directory, destDirectory);
        }
    }
}
