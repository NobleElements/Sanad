using Microsoft.AspNetCore.Mvc;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class UploadEndpoints
{
    public static void MapUploadEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/upload/image", UploadImage);
        // Serve uploaded attachments dynamically based on authenticated user
        app.MapGet("/attachments/{fileName}", DownloadAttachment);
    }

    public static async Task<IResult> DownloadAttachment(
        string fileName,
        [FromServices] ITenantProvider tenantProvider)
    {
        var username = tenantProvider.GetUsername();
        if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", username, "attachments", fileName);
        if (!File.Exists(filePath)) return Results.NotFound();

        return Results.File(filePath);
    }


    public static async Task<IResult> UploadImage(
        HttpRequest request,
        [FromServices] ITenantProvider tenantProvider,
        [FromServices] DiskQuotaService quotaService)
    {
        if (!request.HasFormContentType) return Results.BadRequest("Invalid form data");

        var form = await request.ReadFormAsync();
        var file = form.Files.FirstOrDefault();
        if (file == null || file.Length == 0) return Results.BadRequest("No file uploaded");

        var username = tenantProvider.GetUsername();

        // Enforce quota
        var canUpload = await quotaService.CanUploadAsync(username, file.Length);
        if (!canUpload)
        {
            return Results.BadRequest("Disk quota exceeded. Please upgrade your tier or delete files.");
        }

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", username, "attachments");
        Directory.CreateDirectory(uploadsDir);

        var (uniqueFileName, filePath) = Sanad.Api.Utils.FileUtils.GenerateUniqueFile(uploadsDir, Path.GetExtension(file.FileName));

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        await quotaService.UpdateDiskUsageAsync(username);

        return Results.Ok(new { url = $"/attachments/{uniqueFileName}" });
    }
}
