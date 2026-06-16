using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Services;
using System.Collections.Concurrent;

namespace Sanad.Api.Middleware;

public class TenantDbMigrationMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly ConcurrentDictionary<string, bool> _migratedTenants = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _userLocks = new();

    public TenantDbMigrationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, SanadDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var username = context.User.Identity.Name;
            if (!string.IsNullOrEmpty(username))
            {
                if (!_migratedTenants.ContainsKey(username))
                {
                    var userLock = _userLocks.GetOrAdd(username, _ => new SemaphoreSlim(1, 1));
                    await userLock.WaitAsync();
                    try
                    {
                        if (!_migratedTenants.ContainsKey(username))
                        {
                            await db.Database.MigrateAsync();
                            await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
                            _migratedTenants.TryAdd(username, true);
                        }
                    }
                    finally
                    {
                        userLock.Release();
                    }
                }
            }
        }
        await _next(context);
    }
}
