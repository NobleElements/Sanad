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

        group.MapGet("/users", async (AdminDbContext db, int page = 1, int pageSize = 10, string? sortBy = null, bool sortDesc = false, string? statusFilter = null, int? tierFilter = null) =>
        {
            var query = db.Users.Include(u => u.Tier).AsQueryable();
            
            if (statusFilter == "Active") query = query.Where(u => !u.IsBlocked);
            if (statusFilter == "Blocked") query = query.Where(u => u.IsBlocked);
            if (tierFilter.HasValue) query = query.Where(u => u.TierId == tierFilter.Value);
            
            query = sortBy switch
            {
                "Username" => sortDesc ? query.OrderByDescending(u => u.Username) : query.OrderBy(u => u.Username),
                "DiskUsed" => sortDesc ? query.OrderByDescending(u => u.DiskUsed) : query.OrderBy(u => u.DiskUsed),
                "Tier" => sortDesc ? query.OrderByDescending(u => u.Tier!.Name) : query.OrderBy(u => u.Tier!.Name),
                "CreatedAt" => sortDesc ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
                "LastVisitAt" => sortDesc ? query.OrderByDescending(u => u.LastVisitAt) : query.OrderBy(u => u.LastVisitAt),
                _ => query.OrderByDescending(u => u.CreatedAt)
            };
            
            var totalUsers = await query.CountAsync();
            var users = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            
            // Calculate Summaries
            var totalDiskUsage = await db.Users.SumAsync(u => (long?)u.DiskUsed) ?? 0;
            var monthlyRevenue = await db.Users.SumAsync(u => u.Tier != null ? (decimal?)u.Tier.Price : 0m) ?? 0m;
            var usersByTier = await db.Users.GroupBy(u => u.Tier != null ? u.Tier.Name : "Free")
                                             .Select(g => new { Name = g.Key, Count = g.Count() })
                                             .ToDictionaryAsync(g => g.Name, g => g.Count);
            
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
                DiskUsed = u.DiskUsed
            });
            return Results.Ok(new {
                Users = result,
                TotalCount = totalUsers,
                TotalDiskUsage = totalDiskUsage,
                MonthlyRevenue = monthlyRevenue,
                UsersByTier = usersByTier,
                Page = page,
                PageSize = pageSize
            });
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
