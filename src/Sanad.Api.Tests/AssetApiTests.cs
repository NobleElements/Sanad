using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Xunit;

namespace Sanad.Api.Tests;

public class AssetApiTests
{
    [Fact]
    public async Task CanCreateAssetAndSnapshot()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
        var asset = new Asset { Name = "My Bank", Type = "Bank Account", CurrentAmount = 1000 };
        var result = await AssetEndpoints.CreateAsset(context, asset);
        
        Assert.IsType<Created<Asset>>(result);
        Assert.Equal(1, await context.Assets.CountAsync());
        Assert.Equal(1, await context.AssetSnapshots.CountAsync());
        
        var snapshot = await context.AssetSnapshots.FirstAsync();
        Assert.Equal(1000, snapshot.Amount);
        Assert.Equal(asset.Id, snapshot.AssetId);
    }

    [Fact]
    public async Task CanUpdateAssetAndCreatesNewSnapshot()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
        var asset = new Asset { Name = "Cash", Type = "Cash", CurrentAmount = 500 };
        await AssetEndpoints.CreateAsset(context, asset);
        
        var updated = new Asset { Name = "Cash", Type = "Cash", CurrentAmount = 750 };
        var result = await AssetEndpoints.UpdateAsset(context, asset.Id, updated);
        
        Assert.IsType<Ok<Asset>>(result);
        
        var dbAsset = await context.Assets.FirstAsync();
        Assert.Equal(750, dbAsset.CurrentAmount);
        
        Assert.Equal(2, await context.AssetSnapshots.CountAsync());
        var latestSnapshot = await context.AssetSnapshots.OrderByDescending(s => s.RecordedAt).FirstAsync();
        Assert.Equal(750, latestSnapshot.Amount);
    }
}
