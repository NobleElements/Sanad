using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class FileEndpoints
{
    // In-memory store for upload sessions
    // In a real app with multiple instances, use Redis or a DB table
    private static readonly ConcurrentDictionary<string, UploadSession> UploadSessions = new();

    public static void MapFileEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/files").WithTags("Files");

        group.MapPost("/upload/init", async ([FromBody] InitUploadRequest req, DiskQuotaService quotaService, ITenantProvider tenantProvider, FileStorageService storage) =>
        {
            var username = tenantProvider.GetUsername();
            if (!await quotaService.CanUploadAsync(username, req.SizeBytes))
            {
                return Results.BadRequest("Disk quota exceeded. Please upgrade your tier or delete files.");
            }

            var uploadId = Guid.NewGuid().ToString();
            
            var (physicalName, destPath) = Sanad.Api.Utils.FileUtils.GenerateUniqueFile(storage.GetFilePath, Path.GetExtension(req.Name));

            UploadSessions[uploadId] = new UploadSession
            {
                UploadId = uploadId,
                FileName = req.Name,
                PhysicalName = physicalName,
                SizeBytes = req.SizeBytes,
                MimeType = req.MimeType,
                Extension = Path.GetExtension(req.Name),
                FolderId = req.FolderId,
                UploadedBytes = 0,
                Owner = username
            };

            return Results.Ok(new { UploadId = uploadId });
        });

        group.MapPost("/upload/{uploadId}/chunk", async (string uploadId, HttpRequest req, FileStorageService storage, ITenantProvider tenantProvider) =>
        {
            if (!UploadSessions.TryGetValue(uploadId, out var session) || session.Owner != tenantProvider.GetUsername())
                return Results.NotFound("Upload session not found");

            // Without Content-Length the size check below can't bound how much gets written.
            if (req.ContentLength is not { } chunkLength)
                return Results.StatusCode(StatusCodes.Status411LengthRequired);

            if (session.UploadedBytes + chunkLength > session.SizeBytes) 
            {
                return Results.BadRequest("Uploaded chunks exceed the declared file size.");
            }

            await storage.AppendChunkAsync(session.PhysicalName, req.Body);
            
            session.UploadedBytes += chunkLength;

            return Results.Ok(new { UploadedBytes = session.UploadedBytes });
        });

        group.MapPost("/upload/{uploadId}/complete", async (string uploadId, SanadDbContext db, DiskQuotaService quotaService, ITenantProvider tenantProvider) =>
        {
            if (!UploadSessions.TryGetValue(uploadId, out var session) || session.Owner != tenantProvider.GetUsername())
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

            db.FileItems.Add(fileItem);
            await db.SaveChangesAsync();

            UploadSessions.TryRemove(uploadId, out _);

            await quotaService.UpdateDiskUsageAsync(tenantProvider.GetUsername());

            return Results.Ok(fileItem);
        });

        group.MapDelete("/upload/{uploadId}", (string uploadId, FileStorageService storage, ITenantProvider tenantProvider) =>
        {
            if (UploadSessions.TryGetValue(uploadId, out var existing) && existing.Owner == tenantProvider.GetUsername()
                && UploadSessions.TryRemove(uploadId, out var session))
            {
                storage.DeleteFile(session.PhysicalName);
            }
            return Results.NoContent();
        });

        group.MapGet("/{id:int}", async (int id, FileManagerService fileManager) =>
        {
            var file = await fileManager.GetFileAsync(id);
            if (file == null) return Results.NotFound();
            return Results.Ok(file);
        });

        group.MapGet("/{id}/download", async (int id, [FromQuery] bool? inline, FileManagerService fileManager, FileStorageService storage, HttpContext ctx) =>
        {
            var file = await fileManager.GetFileAsync(id);
            if (file == null) return Results.NotFound();

            var filePath = storage.GetFilePath(file.FileName);
            if (!File.Exists(filePath)) return Results.NotFound();

            // Enable Range processing
            if (inline == true) 
            {
                return Results.File(filePath, file.MimeType, enableRangeProcessing: true);
            }
            
            return Results.File(filePath, file.MimeType, file.Name, enableRangeProcessing: true);
        });

        group.MapPut("/{id}", async (int id, [FromBody] UpdateFileRequest req, FileManagerService fileManager) =>
        {
            var file = await fileManager.UpdateFileAsync(id, req.Name, req.FolderId, req.FolderId.HasValue);
            if (file == null) return Results.NotFound();

            return Results.Ok(file);
        });

        group.MapDelete("/{id}", async (int id, FileManagerService fileManager) =>
        {
            var success = await fileManager.DeleteFileAsync(id);
            if (!success) return Results.NotFound();

            return Results.NoContent();
        });
    }
}

public class InitUploadRequest
{
    public string Name { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public int? FolderId { get; set; }
}

public class UpdateFileRequest
{
    public string? Name { get; set; }
    public int? FolderId { get; set; }
}

public class UploadSession
{
    public string UploadId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string PhysicalName { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public long UploadedBytes { get; set; }
    public int? FolderId { get; set; }
    // Who may continue this session: the username for private uploads, "share:{token}" for public ones.
    public string Owner { get; set; } = string.Empty;
}
