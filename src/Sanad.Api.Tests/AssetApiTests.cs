using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class AssetApiTests
{
    [Fact]
    public async Task CanCreateAssetAndSnapshot()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var svc = new AssetService(context);
            var asset = new Asset { Name = "My Bank", Type = "Bank Account", CurrentAmount = 1000 };
            var result = await AssetEndpoints.CreateAsset(svc, asset);

            Assert.IsType<Created<Asset>>(result);

            context.ChangeTracker.Clear();

            Assert.Equal(1, await context.Assets.CountAsync());
            Assert.Equal(1, await context.AssetSnapshots.CountAsync());

            var snapshot = await context.AssetSnapshots.FirstAsync();
            Assert.Equal(1000, snapshot.Amount);
            Assert.Equal(asset.Id, snapshot.AssetId);
        }
    }

    [Fact]
    public async Task CanUpdateAssetAndCreatesNewSnapshot()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var svc = new AssetService(context);
            var asset = new Asset { Name = "Cash", Type = "Cash", CurrentAmount = 500 };
            await AssetEndpoints.CreateAsset(svc, asset);

            var updated = new Asset { Name = "Cash", Type = "Cash", CurrentAmount = 750 };
            var result = await AssetEndpoints.UpdateAsset(svc, asset.Id, updated);

            Assert.IsType<Ok<Asset>>(result);

            context.ChangeTracker.Clear();

            var dbAsset = await context.Assets.FirstAsync();
            Assert.Equal(750, dbAsset.CurrentAmount);

            Assert.Equal(2, await context.AssetSnapshots.CountAsync());
            // Snapshots created in the same tick tie on RecordedAt, so compare the set of amounts instead of picking a "latest"
            var amounts = (await context.AssetSnapshots.Select(s => s.Amount).ToListAsync()).OrderBy(a => a);
            Assert.Equal(new[] { 500m, 750m }, amounts);
        }
    }
}
