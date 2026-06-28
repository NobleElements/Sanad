using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class ShareEndpoints
{
    public static void MapShareEndpoints(this IEndpointRouteBuilder app)
    {
        var authGroup = app.MapGroup("/api/share").RequireAuthorization();
        var publicGroup = app.MapGroup("/api/public/share").AllowAnonymous();

        authGroup.MapPost("/folder/{id}", CreateFolderShare);
        authGroup.MapPost("/file/{id}", CreateFileShare);
        authGroup.MapGet("/", GetShareLinks);
        authGroup.MapPut("/{token}", UpdateShareLinkPermission);
        authGroup.MapDelete("/{token}", RevokeShareLink);

        publicGroup.MapGet("/{token}", GetPublicShareDetails);
        publicGroup.MapGet("/{token}/download", DownloadPublicShare);
        publicGroup.MapGet("/{token}/folder/{fileId}/download", DownloadFileFromPublicFolder);
        publicGroup.MapPost("/{token}/upload/init", InitPublicUpload);
        publicGroup.MapPost("/{token}/upload/{uploadId}/chunk", ChunkPublicUpload);
        publicGroup.MapPost("/{token}/upload/{uploadId}/complete", CompletePublicUpload);
        publicGroup.MapDelete("/{token}/file/{fileId}", DeleteFileFromPublicFolder);
        publicGroup.MapDelete("/{token}", DeletePublicSharedFile);
    }

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, UploadSession> PublicUploadSessions = new();

    private static async Task<AppUser?> GetCurrentUserAsync(AdminDbContext adminDb, ITenantProvider tenantProvider)
    {
        var username = tenantProvider.GetUsername();
        return await adminDb.Users.FirstOrDefaultAsync(u => u.Username == username);
    }

    public static async Task<IResult> CreateFolderShare(int id, [FromBody] CreateShareRequest req, AdminDbContext adminDb, SanadDbContext sanadDb, ITenantProvider tenantProvider)
    {
        var user = await GetCurrentUserAsync(adminDb, tenantProvider);
        if (user == null) return Results.Unauthorized();

        var folder = await sanadDb.Folders.FindAsync(id);
        if (folder == null) return Results.NotFound("Folder not found");

        var existingLink = await adminDb.SharedLinks.FirstOrDefaultAsync(l => l.UserId == user.Id && l.FolderId == id);
        if (existingLink != null)
        {
            existingLink.Permission = req.Permission;
            await adminDb.SaveChangesAsync();
            return Results.Ok(existingLink);
        }

        var link = new SharedLink { UserId = user.Id, FolderId = id, Permission = req.Permission };
        adminDb.SharedLinks.Add(link);
        await adminDb.SaveChangesAsync();
        return Results.Ok(link);
    }

    public static async Task<IResult> CreateFileShare(int id, [FromBody] CreateShareRequest req, AdminDbContext adminDb, SanadDbContext sanadDb, ITenantProvider tenantProvider)
    {
        var user = await GetCurrentUserAsync(adminDb, tenantProvider);
        if (user == null) return Results.Unauthorized();

        var file = await sanadDb.FileItems.FindAsync(id);
        if (file == null) return Results.NotFound("File not found");

        var existingLink = await adminDb.SharedLinks.FirstOrDefaultAsync(l => l.UserId == user.Id && l.FileItemId == id);
        if (existingLink != null)
        {
            existingLink.Permission = req.Permission;
            await adminDb.SaveChangesAsync();
            return Results.Ok(existingLink);
        }

        var link = new SharedLink { UserId = user.Id, FileItemId = id, Permission = req.Permission };
        adminDb.SharedLinks.Add(link);
        await adminDb.SaveChangesAsync();
        return Results.Ok(link);
    }

    public static async Task<IResult> GetShareLinks(AdminDbContext adminDb, ITenantProvider tenantProvider, SanadDbContext sanadDb)
    {
        var user = await GetCurrentUserAsync(adminDb, tenantProvider);
        if (user == null) return Results.Unauthorized();

        var links = await adminDb.SharedLinks.Where(l => l.UserId == user.Id).ToListAsync();
        
        // Enrich with names
        var result = new List<object>();
        foreach (var link in links)
        {
            if (link.FolderId.HasValue)
            {
                var folder = await sanadDb.Folders.FindAsync(link.FolderId.Value);
                if (folder != null) result.Add(new { link.Token, link.Permission, Type = "folder", Name = folder.Name, TargetId = folder.Id });
            }
            else if (link.FileItemId.HasValue)
            {
                var file = await sanadDb.FileItems.FindAsync(link.FileItemId.Value);
                if (file != null) result.Add(new { link.Token, link.Permission, Type = "file", Name = file.Name, TargetId = file.Id });
            }
        }

        return Results.Ok(result);
    }

    public static async Task<IResult> RevokeShareLink(string token, AdminDbContext adminDb, ITenantProvider tenantProvider)
    {
        var user = await GetCurrentUserAsync(adminDb, tenantProvider);
        if (user == null) return Results.Unauthorized();

        var link = await adminDb.SharedLinks.FirstOrDefaultAsync(l => l.Token == token && l.UserId == user.Id);
        if (link != null)
        {
            adminDb.SharedLinks.Remove(link);
            await adminDb.SaveChangesAsync();
        }
        return Results.NoContent();
    }

    public static async Task<IResult> UpdateShareLinkPermission(string token, [FromBody] UpdateShareRequest req, AdminDbContext adminDb, ITenantProvider tenantProvider)
    {
        var user = await GetCurrentUserAsync(adminDb, tenantProvider);
        if (user == null) return Results.Unauthorized();

        var link = await adminDb.SharedLinks.FirstOrDefaultAsync(l => l.Token == token && l.UserId == user.Id);
        if (link == null) return Results.NotFound("Link not found");

        link.Permission = req.Permission;
        await adminDb.SaveChangesAsync();
        
        return Results.Ok(link);
    }

    private static async Task<(SharedLink? link, SanadDbContext? sanadDb, TenantProvider? tProv, IServiceScope? scope)> ResolvePublicShare(string token, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var link = await adminDb.SharedLinks.Include(l => l.User).FirstOrDefaultAsync(l => l.Token == token);
        if (link == null || link.User == null) return (null, null, null, null);

        var scope = scopeFactory.CreateScope();
        var tProv = scope.ServiceProvider.GetRequiredService<ITenantProvider>() as TenantProvider;
        tProv?.SetOverrideUsername(link.User.Username);

        var sanadDb = scope.ServiceProvider.GetRequiredService<SanadDbContext>();
        return (link, sanadDb, tProv, scope);
    }

    public static async Task<IResult> GetPublicShareDetails(string token, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, _, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null) return Results.NotFound();

            if (link.FileItemId.HasValue)
            {
                var file = await sanadDb.FileItems.FindAsync(link.FileItemId.Value);
                if (file == null) return Results.NotFound();
                return Results.Ok(new { type = "file", item = file, permission = link.Permission, owner = link.User!.Username });
            }
            else if (link.FolderId.HasValue)
            {
                var folder = await sanadDb.Folders.Include(f => f.Files).FirstOrDefaultAsync(f => f.Id == link.FolderId.Value);
                if (folder == null) return Results.NotFound();
                return Results.Ok(new { type = "folder", item = folder, permission = link.Permission, owner = link.User!.Username });
            }
            return Results.NotFound();
        }
    }

    public static async Task<IResult> DownloadPublicShare(string token, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, tProv, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null || tProv == null) return Results.NotFound();

            var storage = scope!.ServiceProvider.GetRequiredService<FileStorageService>();

            if (link.FileItemId.HasValue)
            {
                var file = await sanadDb.FileItems.FindAsync(link.FileItemId.Value);
                if (file == null) return Results.NotFound();
                
                var filePath = storage.GetFilePath(file.FileName);
                if (!File.Exists(filePath)) return Results.NotFound();

                return Results.File(filePath, file.MimeType, file.Name, enableRangeProcessing: true);
            }
            else if (link.FolderId.HasValue)
            {
                var folder = await sanadDb.Folders.Include(f => f.Files).FirstOrDefaultAsync(f => f.Id == link.FolderId.Value);
                if (folder == null) return Results.NotFound();

                var ms = new MemoryStream();
                using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
                {
                    foreach (var file in folder.Files)
                    {
                        var fp = storage.GetFilePath(file.FileName);
                        if (File.Exists(fp))
                        {
                            zip.CreateEntryFromFile(fp, file.Name);
                        }
                    }
                }
                ms.Position = 0;
                return Results.File(ms, "application/zip", $"{folder.Name}.zip");
            }
            return Results.NotFound();
        }
    }

    public static async Task<IResult> DownloadFileFromPublicFolder(string token, int fileId, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, tProv, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null || !link.FolderId.HasValue) return Results.NotFound();

            var file = await sanadDb.FileItems.FirstOrDefaultAsync(f => f.Id == fileId && f.FolderId == link.FolderId.Value);
            if (file == null) return Results.NotFound();

            var storage = scope!.ServiceProvider.GetRequiredService<FileStorageService>();
            var filePath = storage.GetFilePath(file.FileName);
            if (!File.Exists(filePath)) return Results.NotFound();

            return Results.File(filePath, file.MimeType, file.Name, enableRangeProcessing: true);
        }
    }

    public static async Task<IResult> DeleteFileFromPublicFolder(string token, int fileId, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, tProv, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null || !link.FolderId.HasValue) return Results.NotFound();
            if (link.Permission != SharePermission.Edit) return Results.Forbid();

            var file = await sanadDb.FileItems.FirstOrDefaultAsync(f => f.Id == fileId && f.FolderId == link.FolderId.Value);
            if (file == null) return Results.NotFound();

            var storage = scope!.ServiceProvider.GetRequiredService<FileStorageService>();
            var quotaService = scope.ServiceProvider.GetRequiredService<DiskQuotaService>();

            sanadDb.FileItems.Remove(file);
            await sanadDb.SaveChangesAsync();
            storage.DeleteFile(file.FileName);
            await quotaService.UpdateDiskUsageAsync(tProv!.GetUsername());

            return Results.NoContent();
        }
    }

    public static async Task<IResult> DeletePublicSharedFile(string token, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, tProv, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null || !link.FileItemId.HasValue) return Results.NotFound();
            if (link.Permission != SharePermission.Edit) return Results.Forbid();

            var file = await sanadDb.FileItems.FindAsync(link.FileItemId.Value);
            if (file != null)
            {
                var storage = scope!.ServiceProvider.GetRequiredService<FileStorageService>();
                var quotaService = scope.ServiceProvider.GetRequiredService<DiskQuotaService>();

                sanadDb.FileItems.Remove(file);
                await sanadDb.SaveChangesAsync();
                storage.DeleteFile(file.FileName);
                await quotaService.UpdateDiskUsageAsync(tProv!.GetUsername());
            }

            adminDb.SharedLinks.Remove(link);
            await adminDb.SaveChangesAsync();

            return Results.NoContent();
        }
    }

    public static async Task<IResult> InitPublicUpload(string token, [FromBody] InitUploadRequest req, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, tProv, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null || !link.FolderId.HasValue) return Results.NotFound();
            if (link.Permission != SharePermission.Edit) return Results.Forbid();

            var quotaService = scope!.ServiceProvider.GetRequiredService<DiskQuotaService>();
            var storage = scope.ServiceProvider.GetRequiredService<FileStorageService>();

            if (!await quotaService.CanUploadAsync(tProv!.GetUsername(), req.SizeBytes))
            {
                return Results.BadRequest("Disk quota exceeded. Owner must upgrade tier or delete files.");
            }

            var uploadId = Guid.NewGuid().ToString();
            var (physicalName, destPath) = Sanad.Api.Utils.FileUtils.GenerateUniqueFile(storage.GetFilePath, Path.GetExtension(req.Name));

            PublicUploadSessions[uploadId] = new UploadSession
            {
                UploadId = uploadId,
                FileName = req.Name,
                PhysicalName = physicalName,
                SizeBytes = req.SizeBytes,
                MimeType = req.MimeType,
                Extension = Path.GetExtension(req.Name),
                FolderId = link.FolderId.Value,
                UploadedBytes = 0
            };

            return Results.Ok(new { UploadId = uploadId });
        }
    }

    public static async Task<IResult> ChunkPublicUpload(string token, string uploadId, HttpRequest req, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, tProv, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null || !link.FolderId.HasValue) return Results.NotFound();
            if (link.Permission != SharePermission.Edit) return Results.Forbid();

            if (!PublicUploadSessions.TryGetValue(uploadId, out var session))
                return Results.NotFound("Upload session not found");

            if (session.UploadedBytes + (req.ContentLength ?? 0) > session.SizeBytes)
            {
                return Results.BadRequest("Uploaded chunks exceed the declared file size.");
            }

            var storage = scope!.ServiceProvider.GetRequiredService<FileStorageService>();
            await storage.AppendChunkAsync(session.PhysicalName, req.Body);
            
            session.UploadedBytes += req.ContentLength ?? 0;

            return Results.Ok(new { UploadedBytes = session.UploadedBytes });
        }
    }

    public static async Task<IResult> CompletePublicUpload(string token, string uploadId, AdminDbContext adminDb, IServiceScopeFactory scopeFactory)
    {
        var (link, sanadDb, tProv, scope) = await ResolvePublicShare(token, adminDb, scopeFactory);
        using (scope)
        {
            if (link == null || sanadDb == null || !link.FolderId.HasValue) return Results.NotFound();
            if (link.Permission != SharePermission.Edit) return Results.Forbid();

            if (!PublicUploadSessions.TryGetValue(uploadId, out var session))
                return Results.NotFound("Upload session not found");

            var fileItem = new FileItem
            {
                Name = session.FileName,
                FileName = session.PhysicalName,
                Extension = session.Extension,
                MimeType = session.MimeType,
                SizeBytes = session.SizeBytes,
                FolderId = session.FolderId,
                UploadDate = DateTime.UtcNow,
                LastModifiedDate = DateTime.UtcNow
            };

            sanadDb.FileItems.Add(fileItem);
            await sanadDb.SaveChangesAsync();

            PublicUploadSessions.TryRemove(uploadId, out _);

            var quotaService = scope!.ServiceProvider.GetRequiredService<DiskQuotaService>();
            await quotaService.UpdateDiskUsageAsync(tProv!.GetUsername());

            return Results.Ok(fileItem);
        }
    }
}

public class CreateShareRequest
{
    public SharePermission Permission { get; set; }
}

public class UpdateShareRequest
{
    public SharePermission Permission { get; set; }
}
