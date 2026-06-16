using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Sanad.Api.Data;

namespace Sanad.Api.Middleware;

public class MigrationCheckMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public MigrationCheckMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context, AdminDbContext db)
    {
        // Only check authenticated API requests, ignore auth endpoints so they can still check status
        if (context.User.Identity?.IsAuthenticated == true && 
            context.Request.Path.StartsWithSegments("/api") &&
            !context.Request.Path.StartsWithSegments("/api/auth/logout")) // Allow logout
        {
            var username = context.User.Identity.Name;
            if (!string.IsNullOrEmpty(username))
            {
                if (!_cache.TryGetValue($"migrating_{username}", out bool isMigrating))
                {
                    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
                    isMigrating = user != null && user.IsMigrating;
                    _cache.Set($"migrating_{username}", isMigrating, TimeSpan.FromMinutes(1));
                }

                if (isMigrating)
                {
                    context.Response.StatusCode = 503; // Service Unavailable
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { 
                        error = ErrorCodes.AccountMigrating, 
                        message = "Your account is currently being moved to a new datastore. Please check back in a few minutes." 
                    });
                    return; // Stop processing pipeline
                }
            }
        }

        await _next(context);
    }
}
