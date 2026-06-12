using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using System.Security.Claims;
using BCryptLib = BCrypt.Net.BCrypt;

namespace Sanad.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/status", async (AdminDbContext db, HttpContext context) =>
        {
            var authenticated = context.User.Identity?.IsAuthenticated ?? false;
            if (authenticated)
            {
                var username = context.User.Identity?.Name;
                var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (user != null)
                {
                    user.LastVisitAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                    return Results.Ok(new { 
                        authenticated = true, 
                        username = user.Username,
                        isAdmin = user.IsAdmin,
                        tierId = user.TierId,
                        apiKey = user.ApiKey
                    });
                }
            }

            return Results.Ok(new { authenticated = false });
        }).AllowAnonymous();

        group.MapPost("/signup", async (AdminDbContext db, HttpContext context, SetupRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest("Username and password are required.");
            }

            var existingUser = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (existingUser != null)
            {
                return Results.BadRequest("Username already exists.");
            }

            var usersExist = await db.Users.AnyAsync();
            var isAdmin = !usersExist; // First user is admin

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            var user = new AppUser
            {
                Username = request.Username,
                PasswordHash = BCryptLib.HashPassword(request.Password),
                IsAdmin = isAdmin,
                TierId = 1, // Default tier (Supporter)
                CreatedIpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow,
                LastVisitAt = DateTime.UtcNow
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            // Run migrations for the new user's tenant database
            EnsureTenantDbMigrated(request.Username, context.RequestServices);

            await SignInUser(context, user);

            return Results.Ok(new { message = "Signup completed successfully", username = user.Username, isAdmin = user.IsAdmin, apiKey = user.ApiKey });
        }).AllowAnonymous();

        group.MapPost("/login", async (AdminDbContext db, HttpContext context, LoginRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest("Username and password are required.");
            }

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (user == null || !BCryptLib.Verify(request.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            if (user.IsBlocked)
            {
                return Results.BadRequest("Account is blocked.");
            }

            user.LastVisitAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Ensure tenant db is migrated in case of updates
            EnsureTenantDbMigrated(request.Username, context.RequestServices);

            await SignInUser(context, user);

            return Results.Ok(new { message = "Logged in successfully", username = user.Username, isAdmin = user.IsAdmin, apiKey = user.ApiKey });
        }).AllowAnonymous();

        group.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok(new { message = "Logged out successfully" });
        });

        group.MapGet("/storage", async (AdminDbContext db, Services.DiskQuotaService quotaService, HttpContext context) =>
        {
            var username = context.User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

            var user = await db.Users.Include(u => u.Tier).FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Results.NotFound();

            var userPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", username);
            var diskUsed = quotaService.GetDirectorySize(userPath);
            var diskLimitBytes = user.Tier?.DiskLimitBytes ?? (1L * Constants.BytesPerKb * Constants.BytesPerKb * Constants.BytesPerKb);

            return Results.Ok(new { diskUsed, diskLimitBytes, isAdmin = user.IsAdmin });
        }).RequireAuthorization();

        group.MapPost("/api-key/reroll", async (AdminDbContext db, HttpContext context) =>
        {
            var username = context.User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Results.NotFound();

            user.ApiKey = Guid.NewGuid().ToString("N");
            await db.SaveChangesAsync();

            return Results.Ok(new { apiKey = user.ApiKey });
        }).RequireAuthorization();
    }

    private static void EnsureTenantDbMigrated(string username, IServiceProvider services)
    {
        // We override the username in the scoped TenantProvider to ensure SanadDbContext connects to the right DB
        using var scope = services.CreateScope();
        var tenantProvider = scope.ServiceProvider.GetRequiredService<Services.ITenantProvider>() as Services.TenantProvider;
        if (tenantProvider != null)
        {
            tenantProvider.SetOverrideUsername(username);
        }
        
        var tenantDb = scope.ServiceProvider.GetRequiredService<SanadDbContext>();
        tenantDb.Database.Migrate();
        tenantDb.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    }

    private static async Task SignInUser(HttpContext context, AppUser user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("IsAdmin", user.IsAdmin.ToString())
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        var authProperties = new AuthenticationProperties
        {
            IsPersistent = true,
        };

        await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, authProperties);
    }
}

public record SetupRequest(string Username, string Password);
public record LoginRequest(string Username, string Password);
