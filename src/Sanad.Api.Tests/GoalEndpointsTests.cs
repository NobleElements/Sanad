using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class GoalEndpointsTests
{
    [Fact]
    public async Task GetGoal_ReturnsNoContent_WhenGoalDoesNotExist()
    {
        using var dbFixture = TestDbContextFactory.CreateSqliteSanadDb();
        var db = dbFixture.Context;

        var result = await GoalEndpoints.GetGoal(db, "2026-05-01");
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task UpdateGoal_CreatesAndUpdatesGoalCorrectly()
    {
        using var dbFixture = TestDbContextFactory.CreateSqliteSanadDb();
        var db = dbFixture.Context;
        var dateStr = "2026-05-01";

        // 1. Create initial goal
        var createResult = await GoalEndpoints.UpdateGoal(db, dateStr, new DailyGoal { Goal = "Finish test suite" });
        var okCreate = Assert.IsType<Ok<DailyGoal>>(createResult);
        Assert.NotNull(okCreate.Value);
        Assert.Equal(dateStr, okCreate.Value.DateStr);
        Assert.Equal("Finish test suite", okCreate.Value.Goal);

        // Verify persisted in DB
        db.ChangeTracker.Clear();
        var saved = await db.DailyGoals.FindAsync(dateStr);
        Assert.NotNull(saved);
        Assert.Equal("Finish test suite", saved.Goal);

        // 2. GetGoal now returns Ok
        var getResult = await GoalEndpoints.GetGoal(db, dateStr);
        var okGet = Assert.IsType<Ok<DailyGoal>>(getResult);
        Assert.NotNull(okGet.Value);
        Assert.Equal("Finish test suite", okGet.Value.Goal);

        // 3. Update existing goal in-place
        var updateResult = await GoalEndpoints.UpdateGoal(db, dateStr, new DailyGoal { Goal = "Review all PRs" });
        var okUpdate = Assert.IsType<Ok<DailyGoal>>(updateResult);
        Assert.NotNull(okUpdate.Value);
        Assert.Equal("Review all PRs", okUpdate.Value.Goal);

        // Verify only 1 row exists
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.DailyGoals.CountAsync());
        var updated = await db.DailyGoals.FindAsync(dateStr);
        Assert.NotNull(updated);
        Assert.Equal("Review all PRs", updated.Goal);
    }

    [Fact]
    public async Task GoalEndpoints_WorksWithGoalServiceDirectly()
    {
        using var dbFixture = TestDbContextFactory.CreateSqliteSanadDb();
        var db = dbFixture.Context;
        var service = new GoalService(db);
        var dateStr = "2026-06-15";

        var emptyResult = await GoalEndpoints.GetGoal(service, dateStr);
        Assert.IsType<NoContent>(emptyResult);

        var setResult = await GoalEndpoints.UpdateGoal(service, dateStr, new DailyGoal { Goal = "Deploy to production" });
        var okSet = Assert.IsType<Ok<DailyGoal>>(setResult);
        Assert.Equal("Deploy to production", okSet.Value?.Goal);

        var fetchResult = await GoalEndpoints.GetGoal(service, dateStr);
        var okFetch = Assert.IsType<Ok<DailyGoal>>(fetchResult);
        Assert.Equal("Deploy to production", okFetch.Value?.Goal);
    }
}
