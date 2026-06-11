using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Sanad.Api.Data;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

namespace Sanad.Api.Services;

public class ApiKeyAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string DefaultScheme = "ApiKey";
    public string Scheme => DefaultScheme;
    public string AuthenticationType = DefaultScheme;
}

public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    private readonly AdminDbContext _db;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AdminDbContext db)
        : base(options, logger, encoder)
    {
        _db = db;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var apiKey = string.Empty;

        // Try getting API Key from X-Api-Key header
        if (Request.Headers.TryGetValue("X-Api-Key", out var extractedApiKey))
        {
            apiKey = extractedApiKey;
        }
        // Try getting API Key from Authorization Bearer header
        else if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var authHeaderStr = authHeader.ToString();
            if (authHeaderStr.StartsWith("Bearer ", System.StringComparison.OrdinalIgnoreCase))
            {
                apiKey = authHeaderStr.Substring("Bearer ".Length).Trim();
            }
        }

        if (string.IsNullOrEmpty(apiKey))
        {
            return AuthenticateResult.NoResult();
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.ApiKey == apiKey);

        if (user == null || user.IsBlocked)
        {
            return AuthenticateResult.Fail("Invalid or blocked API Key.");
        }

        // Update last visit safely without full save cycle in auth handler if possible
        // Actually, we'll avoid saving DB here to prevent latency on every request.

        var claims = new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("IsAdmin", user.IsAdmin.ToString())
        };

        var identity = new ClaimsIdentity(claims, Options.AuthenticationType);
        var identities = new List<ClaimsIdentity> { identity };
        var principal = new ClaimsPrincipal(identities);
        var ticket = new AuthenticationTicket(principal, Options.Scheme);

        return AuthenticateResult.Success(ticket);
    }
}
