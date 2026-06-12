using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;

namespace Sanad.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin").RequireAuthorization(policy => 
            policy.RequireAssertion(context => 
                context.User.HasClaim(c => c.Type == "IsAdmin" && c.Value == "True")));

        group.MapGet("/users", async (AdminDbContext db, Services.DiskQuotaService quotaService) =>
        {
            var users = await db.Users.Include(u => u.Tier).ToListAsync();
            var result = users.Select(u => new
            {
                u.Id,
                u.Username,
                u.IsAdmin,
                u.IsBlocked,
                u.CreatedAt,
                u.LastVisitAt,
                u.TierId,
                TierName = u.Tier?.Name,
                DiskUsed = quotaService.GetDirectorySize(Path.Combine(Directory.GetCurrentDirectory(), "Data", u.Username))
            });
            return Results.Ok(result);
        });

        group.MapPatch("/users/{id}", async (Guid id, AdminDbContext db, AdminUserUpdateRequest req) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user == null) return Results.NotFound();

            if (req.IsAdmin.HasValue) user.IsAdmin = req.IsAdmin.Value;
            if (req.IsBlocked.HasValue) user.IsBlocked = req.IsBlocked.Value;
            if (req.TierId.HasValue) user.TierId = req.TierId.Value;

            await db.SaveChangesAsync();
            return Results.Ok(user);
        });

        group.MapDelete("/users/{id}", async (Guid id, AdminDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user == null) return Results.NotFound();

            db.Users.Remove(user);
            await db.SaveChangesAsync();

            // Delete user data from disk
            var userPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", user.Username);
            if (Directory.Exists(userPath))
            {
                Directory.Delete(userPath, true);
            }

            return Results.Ok();
        });

        group.MapPut("/tiers/{id}", async (int id, AdminDbContext db, AdminTierUpdateRequest req) =>
        {
            var tier = await db.Tiers.FindAsync(id);
            if (tier == null) return Results.NotFound();

            if (req.Price.HasValue) tier.Price = req.Price.Value;
            if (req.DiskLimitBytes.HasValue) tier.DiskLimitBytes = req.DiskLimitBytes.Value;

            await db.SaveChangesAsync();
            return Results.Ok(tier);
        });

    }
}

public record AdminUserUpdateRequest(bool? IsAdmin, bool? IsBlocked, int? TierId);
public record AdminTierUpdateRequest(decimal? Price, long? DiskLimitBytes);
