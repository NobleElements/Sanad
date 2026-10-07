using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public class AssetService : IAssetService
{
    private readonly SanadDbContext _db;

    public AssetService(SanadDbContext db)
    {
        _db = db;
    }

    public async Task<List<Asset>> GetAssetsAsync() =>
        await _db.Assets
            .Include(a => a.Currency)
            .OrderBy(a => a.Order)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();

    public async Task<Asset> CreateAssetAsync(Asset asset)
    {
        asset.Id = Guid.NewGuid();
        asset.CreatedAt = DateTime.UtcNow;
        asset.UpdatedAt = DateTime.UtcNow;
        asset.Order = (await _db.Assets.MaxAsync(a => (int?)a.Order) ?? 0) + 1;

        _db.Assets.Add(asset);

        var snapshot = new AssetSnapshot
        {
            AssetId = asset.Id,
            Amount = asset.CurrentAmount,
            RecordedAt = DateTime.UtcNow
        };
        _db.AssetSnapshots.Add(snapshot);

        await _db.SaveChangesAsync();
        return asset;
    }

    public async Task<Asset?> UpdateAssetAsync(Guid id, Asset updated)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset is null) return null;

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
            _db.AssetSnapshots.Add(snapshot);
        }

        asset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return asset;
    }

    public async Task<bool> DeleteAssetAsync(Guid id)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset is null) return false;

        var snapshots = await _db.AssetSnapshots.Where(s => s.AssetId == id).ToListAsync();
        _db.AssetSnapshots.RemoveRange(snapshots);

        _db.Assets.Remove(asset);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderAssetsAsync(List<Guid> orderedIds)
    {
        var assets = await _db.Assets.Where(a => orderedIds.Contains(a.Id)).ToListAsync();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var asset = assets.FirstOrDefault(a => a.Id == orderedIds[i]);
            if (asset != null)
            {
                asset.Order = i;
            }
        }
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<object> GetAssetsHistoryAsync()
    {
        var snapshots = await _db.AssetSnapshots
            .Include(s => s.Asset)
                .ThenInclude(a => a!.Currency)
            .OrderBy(s => s.RecordedAt)
            .ToListAsync();

        // Basic grouping by Day for simplicity.
        // If we want more advanced charting (like total net worth per day even if not updated),
        // we'd do a more complex projection. Here we return raw points for the frontend to format.
        return snapshots.Select(s => new
        {
            s.Id,
            s.AssetId,
            AssetName = s.Asset?.Name,
            AssetType = s.Asset?.Type,
            s.Amount,
            ExchangeRateToDefault = s.Asset?.Currency?.ExchangeRateToDefault ?? 1m,
            s.RecordedAt
        });
    }
}