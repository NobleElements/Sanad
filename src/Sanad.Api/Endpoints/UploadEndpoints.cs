using Microsoft.AspNetCore.Mvc;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class UploadEndpoints
{
    public static void MapUploadEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/upload/image", UploadImage);
        // Serve uploaded attachments dynamically based on authenticated user
        app.MapGet("/api/attachments/{fileName}", DownloadAttachment);
        app.MapDelete("/api/attachments/{fileName}", DeleteAttachment);
    }

    public static async Task<IResult> DownloadAttachment(
        string fileName,
        [FromServices] ITenantProvider tenantProvider)
    {
        var username = tenantProvider.GetUsername();
        if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..") || fileName.Contains('/') || fileName.Contains('\\') || Path.GetFileName(fileName) != fileName)
        {
            return Results.BadRequest("Invalid file name");
        }

        var attachmentsDir = Path.Combine(tenantProvider.GetTenantBasePath(), "attachments");
        var filePath = Path.GetFullPath(Path.Combine(attachmentsDir, fileName));
        var fullAttachmentsDir = Path.GetFullPath(attachmentsDir) + Path.DirectorySeparatorChar;

        if (!filePath.StartsWith(fullAttachmentsDir, StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest("Invalid file path");
        }

        if (!File.Exists(filePath)) return Results.NotFound();

        return Results.File(filePath);
    }

    public static async Task<IResult> DeleteAttachment(
        string fileName,
        [FromServices] ITenantProvider tenantProvider)
    {
        var username = tenantProvider.GetUsername();
        if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..") || fileName.Contains('/') || fileName.Contains('\\') || Path.GetFileName(fileName) != fileName)
        {
            return Results.BadRequest("Invalid file name");
        }

        var attachmentsDir = Path.Combine(tenantProvider.GetTenantBasePath(), "attachments");
        var filePath = Path.GetFullPath(Path.Combine(attachmentsDir, fileName));
        var fullAttachmentsDir = Path.GetFullPath(attachmentsDir) + Path.DirectorySeparatorChar;

        if (!filePath.StartsWith(fullAttachmentsDir, StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest("Invalid file path");
        }
        
        if (File.Exists(filePath))
        {
            try
            {
                File.Delete(filePath);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting file {filePath}: {ex.Message}");
                return Results.Problem("Error deleting file");
            }
        }

        return Results.NoContent();
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
