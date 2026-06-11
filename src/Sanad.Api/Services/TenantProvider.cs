using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Sanad.Api.Services;

public interface ITenantProvider
{
    string GetUsername();
    string GetConnectionString();
}

public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    // Support an override for background tasks or initial setup
    private string? _overrideUsername;

    public TenantProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
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
        
        return username ?? "default";
    }

    public string GetConnectionString()
    {
        var username = GetUsername();
        var basePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", username);
        Directory.CreateDirectory(basePath);
        return $"Data Source={Path.Combine(basePath, "sanad.db")}";
    }
}
