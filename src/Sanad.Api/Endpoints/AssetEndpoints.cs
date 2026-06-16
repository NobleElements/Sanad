using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class AssetEndpoints
{
    public static void MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/finances/assets", GetAssets);
        app.MapPost("/api/finances/assets", CreateAsset);
        app.MapPut("/api/finances/assets/{id}", UpdateAsset);
        app.MapDelete("/api/finances/assets/{id}", DeleteAsset);
        app.MapPut("/api/finances/assets/reorder", ReorderAssets);
        app.MapGet("/api/finances/assets/history", GetAssetsHistory);
    }

    public static async Task<IResult> GetAssets(SanadDbContext db) => 
        Results.Ok(await db.Assets.Include(a => a.Currency).OrderBy(a => a.Order).ThenByDescending(a => a.CreatedAt).ToListAsync());

    public static async Task<IResult> CreateAsset(SanadDbContext db, Asset asset)
    {
        asset.Id = Guid.NewGuid();
        asset.CreatedAt = DateTime.UtcNow;
        asset.UpdatedAt = DateTime.UtcNow;
        asset.Order = (await db.Assets.MaxAsync(a => (int?)a.Order) ?? 0) + 1;
        
        db.Assets.Add(asset);
        
        var snapshot = new AssetSnapshot
        {
            AssetId = asset.Id,
            Amount = asset.CurrentAmount,
            RecordedAt = DateTime.UtcNow
        };
        db.AssetSnapshots.Add(snapshot);
        
        await db.SaveChangesAsync();
        return Results.Created($"/api/finances/assets/{asset.Id}", asset);
    }

    public static async Task<IResult> UpdateAsset(SanadDbContext db, Guid id, Asset updated)
    {
        var asset = await db.Assets.FindAsync(id);
        if (asset is null) return Results.NotFound();

        asset.Name = updated.Name;
        asset.Type = updated.Type;
        asset.CurrencyId = updated.CurrencyId;
        asset.Icon = updated.Icon;
        
        if (asset.CurrentAmount != updated.CurrentAmount)
        {
            asset.CurrentAmount = updated.CurrentAmount;
            
            var snapshot = new AssetSnapshot
            {
                AssetId = asset.Id,
                Amount = asset.CurrentAmount,
                RecordedAt = DateTime.UtcNow
            };
            db.AssetSnapshots.Add(snapshot);
        }

        asset.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(asset);
    }

    public static async Task<IResult> DeleteAsset(SanadDbContext db, Guid id)
    {
        var asset = await db.Assets.FindAsync(id);
        if (asset is null) return Results.NotFound();

        db.Assets.Remove(asset);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public static async Task<IResult> ReorderAssets(SanadDbContext db, List<Guid> orderedIds)
    {
        var assets = await db.Assets.Where(a => orderedIds.Contains(a.Id)).ToListAsync();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var asset = assets.FirstOrDefault(a => a.Id == orderedIds[i]);
            if (asset != null)
            {
                asset.Order = i;
            }
        }
        await db.SaveChangesAsync();
        return Results.Ok();
    }

    public static async Task<IResult> GetAssetsHistory(SanadDbContext db)
    {
        var snapshots = await db.AssetSnapshots
            .Include(s => s.Asset)
                .ThenInclude(a => a!.Currency)
            .OrderBy(s => s.RecordedAt)
            .ToListAsync();
            
        // Basic grouping by Day for simplicity.
        // If we want more advanced charting (like total net worth per day even if not updated), 
        // we'd do a more complex projection. Here we return raw points for the frontend to format.
        return Results.Ok(snapshots.Select(s => new {
            s.Id,
            s.AssetId,
            AssetName = s.Asset?.Name,
            AssetType = s.Asset?.Type,
            s.Amount,
            ExchangeRateToDefault = s.Asset?.Currency?.ExchangeRateToDefault ?? 1m,
            s.RecordedAt
        }));
    }
}
