using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class CalendarCategoryTests
{
    private SanadDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new SanadDbContext(options);
    }

    [Fact]
    public async Task GetCategoryEventCount_ReturnsCorrectCount()
    {
        using var db = CreateInMemoryDbContext();
        var service = new CalendarService(db);

        var catA = await service.CreateCategoryAsync("Work", "#3B82F6");
        var catB = await service.CreateCategoryAsync("Personal", "#10B981");

        // 3 events in catA
        await service.CreateEventAsync("Meeting 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catA.Id, null);
        await service.CreateEventAsync("Meeting 2", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catA.Id, null);
        await service.CreateEventAsync("Meeting 3", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catA.Id, null);

        // 1 event in catB
        await service.CreateEventAsync("Gym", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catB.Id, null);

        // 1 uncategorised event
        await service.CreateEventAsync("Walk", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, null, null);

        var countA = await service.GetCategoryEventCountAsync(catA.Id);
        var countB = await service.GetCategoryEventCountAsync(catB.Id);
        var countRandom = await service.GetCategoryEventCountAsync(Guid.NewGuid());

        Assert.Equal(3, countA);
        Assert.Equal(1, countB);
        Assert.Equal(0, countRandom);
    }

    [Fact]
    public async Task DeleteCategory_UncategorisesEvents_WhenNoMoveTargetSpecified()
    {
        using var db = CreateInMemoryDbContext();
        var service = new CalendarService(db);

        var category = await service.CreateCategoryAsync("Work", "#3B82F6");
        var evt1 = await service.CreateEventAsync("Meeting 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, category.Id, null);
        var evt2 = await service.CreateEventAsync("Meeting 2", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, category.Id, null);

        var deleted = await service.DeleteCategoryAsync(category.Id);
        Assert.True(deleted);

        // Category is removed
        var remainingCategory = await db.EventCategories.FindAsync(category.Id);
        Assert.Null(remainingCategory);

        // Events still exist, but category is null (uncategorised)
        var updatedEvt1 = await db.CalendarEvents.FindAsync(evt1.Id);
        var updatedEvt2 = await db.CalendarEvents.FindAsync(evt2.Id);
        Assert.NotNull(updatedEvt1);
        Assert.NotNull(updatedEvt2);
        Assert.Null(updatedEvt1.CategoryId);
        Assert.Null(updatedEvt2.CategoryId);
    }

    [Fact]
    public async Task DeleteCategory_MovesEvents_WhenMoveTargetSpecified()
    {
        using var db = CreateInMemoryDbContext();
        var service = new CalendarService(db);

        var categoryA = await service.CreateCategoryAsync("Work", "#3B82F6");
        var categoryB = await service.CreateCategoryAsync("Projects", "#10B981");

        var evt1 = await service.CreateEventAsync("Work Task 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, categoryA.Id, null);
        var evt2 = await service.CreateEventAsync("Work Task 2", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, categoryA.Id, null);
        var evt3 = await service.CreateEventAsync("Project Task 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, categoryB.Id, null);

        var deleted = await service.DeleteCategoryAsync(categoryA.Id, categoryB.Id);
        Assert.True(deleted);

        // Category A is deleted, Category B remains
        Assert.Null(await db.EventCategories.FindAsync(categoryA.Id));
        Assert.NotNull(await db.EventCategories.FindAsync(categoryB.Id));

        // Events 1 and 2 now belong to Category B
        var updatedEvt1 = await db.CalendarEvents.FindAsync(evt1.Id);
        var updatedEvt2 = await db.CalendarEvents.FindAsync(evt2.Id);
        var updatedEvt3 = await db.CalendarEvents.FindAsync(evt3.Id);

        Assert.Equal(categoryB.Id, updatedEvt1?.CategoryId);
        Assert.Equal(categoryB.Id, updatedEvt2?.CategoryId);
        Assert.Equal(categoryB.Id, updatedEvt3?.CategoryId);
    }

    [Fact]
    public async Task DeleteCategory_ReturnsFalse_WhenCategoryNotFound()
    {
        using var db = CreateInMemoryDbContext();
        var service = new CalendarService(db);

        var result = await service.DeleteCategoryAsync(Guid.NewGuid());
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteCategory_ReturnsFalse_WhenMoveTargetCategoryNotFound()
    {
        using var db = CreateInMemoryDbContext();
        var service = new CalendarService(db);

        var categoryA = await service.CreateCategoryAsync("Work", "#3B82F6");
        var nonExistentTargetId = Guid.NewGuid();

        var result = await service.DeleteCategoryAsync(categoryA.Id, nonExistentTargetId);
        Assert.False(result);

        // Category A should not have been deleted
        var stillExists = await db.EventCategories.FindAsync(categoryA.Id);
        Assert.NotNull(stillExists);
    }

    [Fact]
    public async Task DeleteCategory_UncategorisesEvents_WhenMoveTargetIsSameAsCategoryBeingDeleted()
    {
        using var db = CreateInMemoryDbContext();
        var service = new CalendarService(db);

        var category = await service.CreateCategoryAsync("Work", "#3B82F6");
        var evt = await service.CreateEventAsync("Meeting", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, category.Id, null);

        var result = await service.DeleteCategoryAsync(category.Id, category.Id);
        Assert.True(result);

        var updatedEvt = await db.CalendarEvents.FindAsync(evt.Id);
        Assert.Null(updatedEvt?.CategoryId);
    }
}
