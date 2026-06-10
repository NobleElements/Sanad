using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Sanad.Api.Data;
using Sanad.Api.Models;
using System.IO;

namespace Sanad.Api.Endpoints;

public static class UploadEndpoints
{
    public static void MapUploadEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/upload/image", UploadImage);
    }

    public static async Task<IResult> UploadImage(HttpRequest request)
    {
        if (!request.HasFormContentType) return Results.BadRequest("Invalid form data");

        var form = await request.ReadFormAsync();
        var file = form.Files.FirstOrDefault();
        if (file == null || file.Length == 0) return Results.BadRequest("No file uploaded");

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", "attachments");
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
