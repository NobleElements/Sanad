using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public record CreateThoughtRequest(string? Content, string? CollectionId = null, string? Color = null, bool IsPinned = false);
public record UpdateThoughtRequest(string? Content = null, string? CollectionId = null, string? Color = null, bool? IsPinned = null, bool ClearCollection = false);
public record MoveThoughtRequest(string? CollectionId);
public record TogglePinRequest(bool? IsPinned = null);
public record CreateCollectionRequest(string Name, string? Color = null);
public record UpdateCollectionRequest(string Name, string? Color = null);

public static class ThoughtEndpoints
{
    public static void MapThoughtEndpoints(this IEndpointRouteBuilder app)
    {
        // Thoughts
        app.MapPost("/api/thoughts", (IThoughtService svc, CreateThoughtRequest input) => CreateThought(svc, input));
        app.MapGet("/api/thoughts", (IThoughtService svc, int? page, int? pageSize, string? search, string? collectionId) => GetThoughts(svc, page, pageSize, search, collectionId));
        app.MapPut("/api/thoughts/{id}", (IThoughtService svc, string id, UpdateThoughtRequest updated) => UpdateThought(svc, id, updated));
        app.MapPatch("/api/thoughts/{id}/pin", (IThoughtService svc, string id, TogglePinRequest? req) => TogglePinThought(svc, id, req));
        app.MapPatch("/api/thoughts/{id}/move", (IThoughtService svc, string id, MoveThoughtRequest req) => MoveThought(svc, id, req));
        app.MapDelete("/api/thoughts/{id}", (IThoughtService svc, string id) => DeleteThought(svc, id));

        // Collections
        app.MapGet("/api/thought-collections", (IThoughtService svc) => GetCollections(svc));
        app.MapPost("/api/thought-collections", (IThoughtService svc, CreateCollectionRequest req) => CreateCollection(svc, req));
        app.MapPut("/api/thought-collections/{id}", (IThoughtService svc, string id, UpdateCollectionRequest req) => UpdateCollection(svc, id, req));
        app.MapDelete("/api/thought-collections/{id}", (IThoughtService svc, string id, bool? deleteThoughts) => DeleteCollection(svc, id, deleteThoughts ?? false));
    }

    public static async Task<IResult> CreateThought(IThoughtService svc, CreateThoughtRequest input)
    {
        var thought = await svc.CreateThoughtAsync(input.Content ?? string.Empty, input.CollectionId, input.Color, input.IsPinned);
        return Results.Ok(thought);
    }

    public static Task<IResult> CreateThought(SanadDbContext db, Thought input) =>
        CreateThought(new ThoughtService(db), new CreateThoughtRequest(input.Content, input.CollectionId, input.Color, input.IsPinned));

    public static async Task<IResult> GetThoughts(IThoughtService svc, int? page, int? pageSize, string? search, string? collectionId = null)
    {
        var thoughts = await svc.GetThoughtsAsync(page ?? 1, pageSize ?? 20, search, collectionId);
        return Results.Ok(thoughts);
    }

    public static Task<IResult> GetThoughts(SanadDbContext db, int? page, int? pageSize, string? search, string? collectionId = null) =>
        GetThoughts(new ThoughtService(db), page, pageSize, search, collectionId);

    public static async Task<IResult> UpdateThought(IThoughtService svc, string id, UpdateThoughtRequest updated)
    {
        var thought = await svc.UpdateThoughtAsync(id, updated.Content, updated.CollectionId, updated.Color, updated.IsPinned, updated.ClearCollection);
        if (thought == null) return Results.NotFound();
        return Results.Ok(thought);
    }

    public static Task<IResult> UpdateThought(SanadDbContext db, string id, Thought updated) =>
        UpdateThought(new ThoughtService(db), id, new UpdateThoughtRequest(updated.Content, updated.CollectionId, updated.Color, updated.IsPinned));

    public static async Task<IResult> TogglePinThought(IThoughtService svc, string id, TogglePinRequest? req)
    {
        bool newPin;
        if (req?.IsPinned != null)
        {
            newPin = req.IsPinned.Value;
        }
        else
        {
            var thoughts = await svc.GetThoughtsAsync(1, 100);
            var current = thoughts.FirstOrDefault(t => t.Id == id);
            newPin = current == null || !current.IsPinned;
        }

        var thought = await svc.UpdateThoughtAsync(id, isPinned: newPin);
        if (thought == null) return Results.NotFound();
        return Results.Ok(thought);
    }

    public static async Task<IResult> MoveThought(IThoughtService svc, string id, MoveThoughtRequest req)
    {
        var clearCollection = string.IsNullOrWhiteSpace(req.CollectionId) || req.CollectionId == "__UNCATEGORIZED__";
        var thought = await svc.UpdateThoughtAsync(id, collectionId: req.CollectionId, clearCollection: clearCollection);
        if (thought == null) return Results.NotFound();
        return Results.Ok(thought);
    }

    public static async Task<IResult> DeleteThought(IThoughtService svc, string id)
    {
        var success = await svc.DeleteThoughtAsync(id);
        if (!success) return Results.NotFound();
        return Results.NoContent();
    }

    public static Task<IResult> DeleteThought(SanadDbContext db, string id) =>
        DeleteThought(new ThoughtService(db), id);

    public static async Task<IResult> GetCollections(IThoughtService svc)
    {
        var collections = await svc.GetCollectionsAsync();
        return Results.Ok(collections);
    }

    public static async Task<IResult> CreateCollection(IThoughtService svc, CreateCollectionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Results.BadRequest(new { error = "Collection name is required" });

        var collection = await svc.CreateCollectionAsync(req.Name, req.Color);
        return Results.Ok(collection);
    }

    public static async Task<IResult> UpdateCollection(IThoughtService svc, string id, UpdateCollectionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Results.BadRequest(new { error = "Collection name is required" });

        var collection = await svc.UpdateCollectionAsync(id, req.Name, req.Color);
        if (collection == null) return Results.NotFound();
        return Results.Ok(collection);
    }

    public static async Task<IResult> DeleteCollection(IThoughtService svc, string id, bool deleteThoughts)
    {
        var success = await svc.DeleteCollectionAsync(id, deleteThoughts);
        if (!success) return Results.NotFound();
        return Results.NoContent();
    }
}
