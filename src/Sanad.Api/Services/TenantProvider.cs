using System.Security.Claims;
using Sanad.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Sanad.Api.Services;

public interface ITenantProvider
{
    string GetUsername();
    string GetConnectionString();
    string GetTenantBasePath();
}

public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache? _cache;
    
    // Support an override for background tasks or initial setup
    private string? _overrideUsername;

    public TenantProvider(IHttpContextAccessor httpContextAccessor, IServiceScopeFactory scopeFactory, IMemoryCache? cache = null)
    {
        _httpContextAccessor = httpContextAccessor;
        _scopeFactory = scopeFactory;
        _cache = cache;
    }

    public void SetOverrideUsername(string username)
    {
        _overrideUsername = username;
    }

    public string GetUsername()
    {
        if (!string.IsNullOrEmpty(_overrideUsername))
            return _overrideUsername;

        var context = _httpContextAccessor.HttpContext;
        var user = context?.User;
        var username = user?.FindFirst(ClaimTypes.Name)?.Value;
        if (string.IsNullOrEmpty(username))
        {
            throw new UnauthorizedAccessException("Tenant username could not be determined. Ensure the user is authenticated.");
        }
        
        return username;
    }

    public string GetTenantBasePath()
    {
        var username = GetUsername();
        var cacheKey = $"tenant_dspath_{username}";

        if (_cache == null || !_cache.TryGetValue(cacheKey, out string? dsPath) || string.IsNullOrEmpty(dsPath))
        {
            // We use a separate scope to fetch the Datastore to avoid circular dependencies and scope issues.
            using var scope = _scopeFactory.CreateScope();
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            
            var user = adminDb.Users
                .AsNoTracking()
                .Include(u => u.Datastore)
                .FirstOrDefault(u => u.Username == username);

            dsPath = user?.Datastore?.Path;
            if (!string.IsNullOrEmpty(dsPath))
            {
                _cache?.Set(cacheKey, dsPath, TimeSpan.FromMinutes(5));
            }
            else
            {
                dsPath = "Data"; // "Data" covers extreme cases (e.g., deleted user still authenticated)
            }
        }

        if (!Path.IsPathRooted(dsPath))
        {
            dsPath = Path.Combine(Directory.GetCurrentDirectory(), dsPath);
        }

        // Not UnauthorizedAccessException: Program.cs maps that to the shared design-time database.
        return Utils.FileUtils.ResolveChildPath(dsPath, username)
            ?? throw new InvalidOperationException("Username cannot be used as a tenant folder name.");
    }

    public string GetConnectionString()
    {
        var basePath = GetTenantBasePath();
        Directory.CreateDirectory(basePath);
        return $"Data Source={Path.Combine(basePath, "sanad.db")}";
    }
}
