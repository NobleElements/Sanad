using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class WhiteboardEndpoints
{
    public static void MapWhiteboardEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/whiteboards")
            .RequireAuthorization();

        // GET /api/whiteboards - List all whiteboards (ordered by UpdatedAt desc)
        group.MapGet("/", async (SanadDbContext db) =>
        {
            var whiteboards = await db.Whiteboards
                .OrderByDescending(w => w.UpdatedAt)
                .Select(w => new WhiteboardSummaryDto(
                    w.Id,
                    w.Name,
                    w.Icon,
                    w.CameraX,
                    w.CameraY,
                    w.CameraZ,
                    w.IsMinimapOpen,
                    w.CreatedAt,
                    w.UpdatedAt
                ))
                .ToListAsync();

            return Results.Ok(whiteboards);
        });

        // GET /api/whiteboards/{id} - Get single whiteboard with full canvas data
        group.MapGet("/{id:guid}", async (Guid id, SanadDbContext db) =>
        {
            var whiteboard = await db.Whiteboards.FindAsync(id);
            return whiteboard != null ? Results.Ok(whiteboard) : Results.NotFound();
        });

        // POST /api/whiteboards - Create a new whiteboard
        group.MapPost("/", async (CreateWhiteboardRequest req, SanadDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
            {
                return Results.BadRequest(new { message = "Whiteboard name is required." });
            }

            var whiteboard = new Whiteboard
            {
                Id = Guid.NewGuid(),
                Name = req.Name.Trim(),
                Icon = string.IsNullOrWhiteSpace(req.Icon) ? "🎨" : req.Icon.Trim(),
                DocumentJson = req.DocumentJson ?? string.Empty,
                CameraX = req.CameraX,
                CameraY = req.CameraY,
                CameraZ = req.CameraZ,
                IsMinimapOpen = req.IsMinimapOpen ?? true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            db.Whiteboards.Add(whiteboard);
            await db.SaveChangesAsync();

            return Results.Created($"/api/whiteboards/{whiteboard.Id}", whiteboard);
        });

        // PUT /api/whiteboards/{id} - Update whiteboard metadata or canvas data
        group.MapPut("/{id:guid}", async (Guid id, UpdateWhiteboardRequest req, SanadDbContext db) =>
        {
            var whiteboard = await db.Whiteboards.FindAsync(id);
            if (whiteboard == null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(req.Name))
            {
                whiteboard.Name = req.Name.Trim();
            }

            if (req.Icon != null)
            {
                whiteboard.Icon = string.IsNullOrWhiteSpace(req.Icon) ? "🎨" : req.Icon.Trim();
            }

            if (req.DocumentJson != null)
            {
                whiteboard.DocumentJson = req.DocumentJson;
            }

            if (req.CameraX.HasValue)
            {
                whiteboard.CameraX = req.CameraX.Value;
            }

            if (req.CameraY.HasValue)
            {
                whiteboard.CameraY = req.CameraY.Value;
            }

            if (req.CameraZ.HasValue)
            {
                whiteboard.CameraZ = req.CameraZ.Value;
            }

            if (req.IsMinimapOpen.HasValue)
            {
                whiteboard.IsMinimapOpen = req.IsMinimapOpen.Value;
            }

            whiteboard.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(whiteboard);
        });

        // DELETE /api/whiteboards/{id} - Delete a whiteboard
        group.MapDelete("/{id:guid}", async (Guid id, SanadDbContext db) =>
        {
            var whiteboard = await db.Whiteboards.FindAsync(id);
            if (whiteboard == null) return Results.NotFound();

            db.Whiteboards.Remove(whiteboard);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}

public record WhiteboardSummaryDto(
    Guid Id,
    string Name,
    string Icon,
    double? CameraX,
    double? CameraY,
    double? CameraZ,
    bool IsMinimapOpen,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateWhiteboardRequest(
    string Name,
    string? Icon,
    string? DocumentJson,
    double? CameraX = null,
    double? CameraY = null,
    double? CameraZ = null,
    bool? IsMinimapOpen = null
);

public record UpdateWhiteboardRequest(
    string? Name = null,
    string? Icon = null,
    string? DocumentJson = null,
    double? CameraX = null,
    double? CameraY = null,
    double? CameraZ = null,
    bool? IsMinimapOpen = null
);
