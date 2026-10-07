using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class AssetEndpoints
{
    public static void MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/finances/assets", (IAssetService svc) => GetAssets(svc));
        app.MapPost("/api/finances/assets", (IAssetService svc, Asset asset) => CreateAsset(svc, asset));
        app.MapPut("/api/finances/assets/{id}", (IAssetService svc, Guid id, Asset updated) => UpdateAsset(svc, id, updated));
        app.MapDelete("/api/finances/assets/{id}", (IAssetService svc, Guid id) => DeleteAsset(svc, id));
        app.MapPut("/api/finances/assets/reorder", (IAssetService svc, List<Guid> orderedIds) => ReorderAssets(svc, orderedIds));
        app.MapGet("/api/finances/assets/history", (IAssetService svc) => GetAssetsHistory(svc));
    }

    public static async Task<IResult> GetAssets(IAssetService svc) =>
        Results.Ok(await svc.GetAssetsAsync());

    public static Task<IResult> GetAssets(SanadDbContext db) =>
        GetAssets(new AssetService(db));

    public static async Task<IResult> CreateAsset(IAssetService svc, Asset asset)
    {
        var created = await svc.CreateAssetAsync(asset);
        return Results.Created($"/api/finances/assets/{created.Id}", created);
    }

    public static Task<IResult> CreateAsset(SanadDbContext db, Asset asset) =>
        CreateAsset(new AssetService(db), asset);

    public static async Task<IResult> UpdateAsset(IAssetService svc, Guid id, Asset updated)
    {
        var asset = await svc.UpdateAssetAsync(id, updated);
        if (asset is null) return Results.NotFound();
        return Results.Ok(asset);
    }

    public static Task<IResult> UpdateAsset(SanadDbContext db, Guid id, Asset updated) =>
        UpdateAsset(new AssetService(db), id, updated);

    public static async Task<IResult> DeleteAsset(IAssetService svc, Guid id)
    {
        var success = await svc.DeleteAssetAsync(id);
        if (!success) return Results.NotFound();
        return Results.NoContent();
    }

    public static Task<IResult> DeleteAsset(SanadDbContext db, Guid id) =>
        DeleteAsset(new AssetService(db), id);

    public static async Task<IResult> ReorderAssets(IAssetService svc, List<Guid> orderedIds)
    {
        await svc.ReorderAssetsAsync(orderedIds);
        return Results.Ok();
    }

    public static Task<IResult> ReorderAssets(SanadDbContext db, List<Guid> orderedIds) =>
        ReorderAssets(new AssetService(db), orderedIds);

    public static async Task<IResult> GetAssetsHistory(IAssetService svc) =>
        Results.Ok(await svc.GetAssetsHistoryAsync());

    public static Task<IResult> GetAssetsHistory(SanadDbContext db) =>
        GetAssetsHistory(new AssetService(db));
}