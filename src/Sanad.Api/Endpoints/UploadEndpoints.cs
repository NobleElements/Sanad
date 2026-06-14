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
        var (errorResult, _, fileUrl) = await Utils.UploadHelper.HandleUploadAsync(request, tenantProvider, quotaService);
        if (errorResult != null) return errorResult;

        return Results.Ok(new { url = fileUrl });
    }
}
