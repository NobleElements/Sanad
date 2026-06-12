using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class FolderEndpoints
{
    public static void MapFolderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/folders").WithTags("Folders");

        group.MapGet("/{id?}", async (
            Services.FileManagerService fileManager,
            int? id, 
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? search = null,
            [FromQuery] string sortBy = "name",
            [FromQuery] string sortOrder = "asc") =>
        {
            var result = await fileManager.GetFolderContentsPaginatedAsync(id, page, pageSize, search, sortBy, sortOrder);
            return Results.Ok(result);
        });

        group.MapPost("/", async ([FromBody] CreateFolderRequest req, SanadDbContext db) =>
        {
            var folder = new Folder
            {
                Name = req.Name,
                ParentId = req.ParentId
            };
            db.Folders.Add(folder);
            await db.SaveChangesAsync();
            return Results.Created($"/api/folders/{folder.Id}", folder);
        });

        group.MapPut("/{id}", async (int id, [FromBody] UpdateFolderRequest req, SanadDbContext db) =>
        {
            var folder = await db.Folders.FindAsync(id);
            if (folder == null) return Results.NotFound();

            if (!string.IsNullOrEmpty(req.Name)) folder.Name = req.Name;
            if (req.ParentId.HasValue) folder.ParentId = req.ParentId.Value;

            await db.SaveChangesAsync();
            return Results.Ok(folder);
        });

        group.MapDelete("/{id}", async (int id, Sanad.Api.Services.FileManagerService fileManager) =>
        {
            await fileManager.DeleteFolderRecursivelyAsync(id);
            return Results.NoContent();
        });
    }
}

public class CreateFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public int? ParentId { get; set; }
}

public class UpdateFolderRequest
{
    public string? Name { get; set; }
    public int? ParentId { get; set; }
}
