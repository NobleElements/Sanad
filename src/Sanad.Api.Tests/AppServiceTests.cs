using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class AppServiceTests
{
    [Fact]
    public async Task CustomApps_CrudOperations_Work()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new AppService(db);

        // 1. Create app
        var app = await service.CreateAppAsync("Calculator", "<div>Calc UI</div>", "calc-icon", true, false);
        Assert.NotNull(app);
        Assert.Equal("Calculator", app.Name);
        Assert.Equal("<div>Calc UI</div>", app.HtmlContent);
        Assert.True(app.ShowInDashboard);
        Assert.False(app.IsStandalone);

        // 2. Get by ID
        var fetched = await service.GetAppByIdAsync(app.Id);
        Assert.NotNull(fetched);
        Assert.Equal("Calculator", fetched!.Name);

        // 3. Update app
        var updated = await service.UpdateAppAsync(app.Id, "Calculator Pro", "<div>New UI</div>", "pro-icon", false, true);
        Assert.NotNull(updated);
        Assert.Equal("Calculator Pro", updated!.Name);
        Assert.False(updated.ShowInDashboard);
        Assert.True(updated.IsStandalone);

        // Read back from the store, not the tracked instance, to prove the update was saved
        db.ChangeTracker.Clear();
        var persisted = await service.GetAppByIdAsync(app.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Calculator Pro", persisted!.Name);
        Assert.Equal("<div>New UI</div>", persisted.HtmlContent);
        Assert.Equal("pro-icon", persisted.Icon);
        Assert.False(persisted.ShowInDashboard);
        Assert.True(persisted.IsStandalone);

        // 4. Update non-existent app returns null
        Assert.Null(await service.UpdateAppAsync(Guid.NewGuid(), "Ghost", "<div></div>", "", false, false));

        // 5. Delete app
        Assert.True(await service.DeleteAppAsync(app.Id));
        db.ChangeTracker.Clear();
        Assert.Null(await service.GetAppByIdAsync(app.Id));
        Assert.False(await service.DeleteAppAsync(app.Id));
    }

    [Fact]
    public async Task GetApps_OrdersByCreatedAtDescending()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new AppService(db);

        var older = await service.CreateAppAsync("Old App", "<div>1</div>", "icon1", true, false);
        var newer = await service.CreateAppAsync("New App", "<div>2</div>", "icon2", true, false);

        // Explicitly set older date
        db.CustomApps.Single(a => a.Id == older.Id).CreatedAt = DateTime.UtcNow.AddHours(-5);
        db.CustomApps.Single(a => a.Id == newer.Id).CreatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var apps = await service.GetAppsAsync();
        Assert.Equal(2, apps.Count);
        Assert.Equal("New App", apps[0].Name);
        Assert.Equal("Old App", apps[1].Name);
    }
}
