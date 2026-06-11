using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using System.IO;

namespace Sanad.Api.Endpoints;

public static class UploadEndpoints
{
    public static void MapUploadEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/upload/image", UploadImage);
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

        var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsDir, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return Results.Ok(new { url = $"/attachments/{uniqueFileName}" });
    }
}
