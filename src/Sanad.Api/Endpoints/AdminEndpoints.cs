using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Sanad.Api.Data;
using BCryptLib = BCrypt.Net.BCrypt;

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
            var query = db.Users.Include(u => u.Tier).Include(u => u.Datastore).AsQueryable();
            
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
            var monthlyRevenue = await db.Users.Where(u => !u.IsAdmin).SumAsync(u => u.Tier != null ? (decimal?)u.Tier.Price : 0m) ?? 0m;
            var usersByTier = await db.Users.GroupBy(u => u.Tier != null ? u.Tier.Name : "Free")
                                             .Select(g => new { Name = g.Key, Count = g.Count() })
                                             .ToDictionaryAsync(g => g.Name, g => g.Count);
            
            long hostTotalDiskSpace = 0;
            long hostFreeDiskSpace = 0;
            try
            {
                var driveInfo = GetDriveInfoForPath(Directory.GetCurrentDirectory());
                if (driveInfo != null)
                {
                    hostTotalDiskSpace = driveInfo.TotalSize;
                    hostFreeDiskSpace = driveInfo.AvailableFreeSpace;
                }
            }
            catch { }
            
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
                u.DatastoreId,
                DatastoreName = u.Datastore?.Name,
                u.IsMigrating,
                DiskUsed = u.DiskUsed
            });
            return Results.Ok(new {
                Users = result,
                TotalCount = totalUsers,
                TotalDiskUsage = totalDiskUsage,
                MonthlyRevenue = monthlyRevenue,
                UsersByTier = usersByTier,
                Page = page,
                PageSize = pageSize,
                HostTotalDiskSpace = hostTotalDiskSpace,
                HostFreeDiskSpace = hostFreeDiskSpace
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

        group.MapDelete("/users/{id}", async (Guid id, AdminDbContext db, System.Security.Claims.ClaimsPrincipal currentUser) =>
        {
            var currentUserIdStr = currentUser.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserIdStr == id.ToString())
            {
                return Results.BadRequest("Cannot delete your own account.");
            }

            var user = await db.Users.Include(u => u.Datastore).FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return Results.NotFound();

            db.Users.Remove(user);
            await db.SaveChangesAsync();

            // Delete user data from disk
            if (user.Datastore != null)
            {
                var dsPath = user.Datastore.Path;
                if (!Path.IsPathRooted(dsPath)) dsPath = Path.Combine(Directory.GetCurrentDirectory(), dsPath);

                var userPath = Path.Combine(dsPath, user.Username);
                if (Directory.Exists(userPath))
                {
                    Directory.Delete(userPath, true);
                }
            }

            return Results.Ok();
        });

        group.MapPost("/users/{id}/reset-password", async (Guid id, AdminDbContext db, AdminResetPasswordRequest req) =>
        {
            if (string.IsNullOrWhiteSpace(req.NewPassword)) return Results.BadRequest("New password cannot be empty.");
            
            var user = await db.Users.FindAsync(id);
            if (user == null) return Results.NotFound();

            user.PasswordHash = BCryptLib.HashPassword(req.NewPassword);
            await db.SaveChangesAsync();
            
            return Results.Ok(new { message = "Password reset successfully" });
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

        group.MapGet("/datastores", async (AdminDbContext db) =>
        {
            var datastores = await db.Datastores.ToListAsync();
            var userCounts = await db.Users.GroupBy(u => u.DatastoreId)
                                           .Select(g => new { DatastoreId = g.Key, Count = g.Count() })
                                           .ToListAsync();
            var countsDict = userCounts.ToDictionary(x => x.DatastoreId, x => x.Count);

            var result = datastores.Select(d =>
            {
                long totalDiskSpace = 0;
                long freeDiskSpace = 0;
                try
                {
                    var dsPath = d.Path;
                    if (!Path.IsPathRooted(dsPath)) dsPath = Path.Combine(Directory.GetCurrentDirectory(), dsPath);

                    if (Directory.Exists(dsPath))
                    {
                        var driveInfo = GetDriveInfoForPath(dsPath);
                        if (driveInfo != null)
                        {
                            totalDiskSpace = driveInfo.TotalSize;
                            freeDiskSpace = driveInfo.AvailableFreeSpace;
                        }
                    }
                }
                catch { }

                return new
                {
                    d.Id,
                    d.Name,
                    d.Path,
                    d.IsDefault,
                    d.CreatedAt,
                    TotalDiskSpace = totalDiskSpace,
                    FreeDiskSpace = freeDiskSpace,
                    UsersCount = countsDict.TryGetValue(d.Id, out var count) ? count : 0
                };
            });

            return Results.Ok(result);
        });

        group.MapPost("/datastores", async (AdminDbContext db, AdminDatastoreCreateRequest req) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Path))
                return Results.BadRequest("Name and Path are required.");

            if (!Directory.Exists(req.Path))
            {
                try
                {
                    Directory.CreateDirectory(req.Path);
                }
                catch
                {
                    return Results.BadRequest("Invalid path or missing permissions to create the directory.");
                }
            }

            var datastore = new Models.Datastore
            {
                Name = req.Name,
                Path = req.Path,
                IsDefault = req.IsDefault
            };

            if (req.IsDefault)
            {
                var defaults = await db.Datastores.Where(d => d.IsDefault).ToListAsync();
                foreach (var d in defaults) d.IsDefault = false;
            }

            db.Datastores.Add(datastore);
            await db.SaveChangesAsync();
            return Results.Ok(datastore);
        });

        group.MapPut("/datastores/{id}", async (int id, AdminDbContext db, AdminDatastoreUpdateRequest req) =>
        {
            var datastore = await db.Datastores.FindAsync(id);
            if (datastore == null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(req.Name)) datastore.Name = req.Name;
            
            if (!string.IsNullOrWhiteSpace(req.Path) && req.Path != datastore.Path)
            {
                var hasUsers = await db.Users.AnyAsync(u => u.DatastoreId == id);
                if (hasUsers) return Results.BadRequest("Cannot change the path of a datastore that has users assigned.");

                if (!Directory.Exists(req.Path))
                {
                    try { Directory.CreateDirectory(req.Path); }
                    catch { return Results.BadRequest("Invalid path or missing permissions to create the directory."); }
                }
                datastore.Path = req.Path;
            }

            if (req.IsDefault.HasValue && req.IsDefault.Value)
            {
                var defaults = await db.Datastores.Where(d => d.IsDefault && d.Id != id).ToListAsync();
                foreach (var d in defaults) d.IsDefault = false;
                datastore.IsDefault = true;
            }

            await db.SaveChangesAsync();
            return Results.Ok(datastore);
        });

        group.MapDelete("/datastores/{id}", async (int id, AdminDbContext db) =>
        {
            var datastore = await db.Datastores.FindAsync(id);
            if (datastore == null) return Results.NotFound();

            var hasUsers = await db.Users.AnyAsync(u => u.DatastoreId == id);
            if (hasUsers) return Results.BadRequest("Cannot delete a datastore that has users assigned.");

            if (datastore.IsDefault) return Results.BadRequest("Cannot delete the default datastore.");

            db.Datastores.Remove(datastore);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        group.MapPost("/users/{id}/migrate", async (Guid id, AdminDbContext db, Services.MigrationService migrationService, Microsoft.Extensions.Caching.Memory.IMemoryCache cache, AdminMigrateUserRequest req) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user == null) return Results.NotFound();

            if (user.IsMigrating) return Results.BadRequest("User is already migrating.");
            if (user.DatastoreId == req.TargetDatastoreId) return Results.BadRequest("User is already in this datastore.");

            var targetDs = await db.Datastores.FindAsync(req.TargetDatastoreId);
            if (targetDs == null) return Results.BadRequest("Target datastore not found.");

            user.IsMigrating = true;
            user.TargetDatastoreId = req.TargetDatastoreId;
            await db.SaveChangesAsync();

            cache.Set($"migrating_{user.Username}", true, TimeSpan.FromMinutes(5));

            migrationService.StartMigration(id, req.TargetDatastoreId);

            return Results.Ok(new { message = "Migration started" });
        });

        group.MapPost("/users/{username}/recalculate-storage", async (string username, Services.DiskQuotaService quotaService) =>
        {
            await quotaService.UpdateDiskUsageAsync(username);
            return Results.Ok(new { message = "Storage recalculated" });
        });

        group.MapPost("/recalculate-storage", async (AdminDbContext db, Services.DiskQuotaService quotaService) =>
        {
            var usernames = await db.Users.Select(u => u.Username).ToListAsync();
            foreach(var u in usernames)
            {
                await quotaService.UpdateDiskUsageAsync(u);
            }
            return Results.Ok(new { message = "Storage recalculated for all users" });
        });
    }

    private static DriveInfo? GetDriveInfoForPath(string path)
    {
        var fullPath = Path.GetFullPath(path);
        if (Environment.OSVersion.Platform == PlatformID.Win32NT)
        {
            return new DriveInfo(Path.GetPathRoot(fullPath) ?? fullPath);
        }

        return DriveInfo.GetDrives()
            .Where(d => d.IsReady && fullPath.StartsWith(d.RootDirectory.FullName, StringComparison.InvariantCultureIgnoreCase))
            .OrderByDescending(d => d.RootDirectory.FullName.Length)
            .FirstOrDefault();
    }
}

public record AdminUserUpdateRequest(bool? IsAdmin, bool? IsBlocked, int? TierId);
public record AdminTierUpdateRequest(decimal? Price, long? DiskLimitBytes);
public record AdminResetPasswordRequest(string NewPassword);
public record AdminDatastoreCreateRequest(string Name, string Path, bool IsDefault);
public record AdminDatastoreUpdateRequest(string? Name, string? Path, bool? IsDefault);
public record AdminMigrateUserRequest(int TargetDatastoreId);
