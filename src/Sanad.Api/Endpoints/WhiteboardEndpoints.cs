using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class WhiteboardEndpoints
{
    public static void MapWhiteboardEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/whiteboards")
            .RequireAuthorization();

        // GET /api/whiteboards - List all whiteboards (ordered by UpdatedAt desc)
        group.MapGet("/", async (IWhiteboardService svc) =>
        {
            var whiteboards = await svc.GetWhiteboardsAsync();
            return Results.Ok(whiteboards);
        });

        // GET /api/whiteboards/{id} - Get single whiteboard with full canvas data
        group.MapGet("/{id:guid}", async (System.Guid id, IWhiteboardService svc) =>
        {
            var whiteboard = await svc.GetWhiteboardAsync(id);
            return whiteboard != null ? Results.Ok(whiteboard) : Results.NotFound();
        });

        // POST /api/whiteboards - Create a new whiteboard
        group.MapPost("/", async (CreateWhiteboardRequest req, IWhiteboardService svc) =>
        {
            var whiteboard = await svc.CreateWhiteboardAsync(req);
            if (whiteboard == null)
            {
                return Results.BadRequest(new { message = "Whiteboard name is required." });
            }

            return Results.Created($"/api/whiteboards/{whiteboard.Id}", whiteboard);
        });

        // PUT /api/whiteboards/{id} - Update whiteboard metadata or canvas data
        group.MapPut("/{id:guid}", async (System.Guid id, UpdateWhiteboardRequest req, IWhiteboardService svc) =>
        {
            var whiteboard = await svc.UpdateWhiteboardAsync(id, req);
            if (whiteboard == null) return Results.NotFound();

            return Results.Ok(whiteboard);
        });

        // DELETE /api/whiteboards/{id} - Delete a whiteboard
        group.MapDelete("/{id:guid}", async (System.Guid id, IWhiteboardService svc) =>
        {
            var success = await svc.DeleteWhiteboardAsync(id);
            if (!success) return Results.NotFound();

            return Results.NoContent();
        });
    }
}