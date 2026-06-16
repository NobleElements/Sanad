using System.Security.Claims;
using Sanad.Api.Data;
using Microsoft.EntityFrameworkCore;

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
    
    // Support an override for background tasks or initial setup
    private string? _overrideUsername;

    public TenantProvider(IHttpContextAccessor httpContextAccessor, IServiceScopeFactory scopeFactory)
    {
        _httpContextAccessor = httpContextAccessor;
        _scopeFactory = scopeFactory;
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
        
        // We use a separate scope to fetch the Datastore to avoid circular dependencies and scope issues.
        using var scope = _scopeFactory.CreateScope();
        var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        
        var user = adminDb.Users.Include(u => u.Datastore).FirstOrDefault(u => u.Username == username);
        if (user == null || user.Datastore == null)
        {
            // Fallback for extreme cases (e.g., deleted user still authenticated)
            return Path.Combine(Directory.GetCurrentDirectory(), "Data", username);
        }

        var dsPath = user.Datastore.Path;
        if (!Path.IsPathRooted(dsPath))
        {
            dsPath = Path.Combine(Directory.GetCurrentDirectory(), dsPath);
        }

        return Path.Combine(dsPath, username);
    }

    public string GetConnectionString()
    {
        var basePath = GetTenantBasePath();
        Directory.CreateDirectory(basePath);
        return $"Data Source={Path.Combine(basePath, "sanad.db")}";
    }
}
