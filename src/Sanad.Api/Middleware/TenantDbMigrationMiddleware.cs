using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Services;
using System.Collections.Concurrent;

namespace Sanad.Api.Middleware;

public class TenantDbMigrationMiddleware
{
    private readonly RequestDelegate _next;
    // Keyed by connection string rather than username: the same username can point at a different
    // database file (after a datastore move, or in another app instance in the same process).
    private static readonly ConcurrentDictionary<string, bool> _migratedDatabases = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _databaseLocks = new();

    public TenantDbMigrationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, SanadDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true && !string.IsNullOrEmpty(context.User.Identity.Name))
        {
            var databaseKey = db.Database.GetConnectionString() ?? context.User.Identity.Name;
            if (!_migratedDatabases.ContainsKey(databaseKey))
            {
                var databaseLock = _databaseLocks.GetOrAdd(databaseKey, _ => new SemaphoreSlim(1, 1));
                await databaseLock.WaitAsync();
                try
                {
                    if (!_migratedDatabases.ContainsKey(databaseKey))
                    {
                        await db.Database.MigrateAsync();
                        await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
                        _migratedDatabases.TryAdd(databaseKey, true);
                    }
                }
                finally
                {
                    databaseLock.Release();
                }
            }
        }
        await _next(context);
    }
}
