using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class CalendarCategoryTests : IDisposable
{
    private readonly SanadDbContext _db;
    private readonly SqliteConnection _conn;
    private readonly CalendarService _service;

    public CalendarCategoryTests()
    {
        (_db, _conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        _service = new CalendarService(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }

    [Fact]
    public async Task GetCategoryEventCount_ReturnsCorrectCount()
    {
        var catA = await _service.CreateCategoryAsync("Work", "#3B82F6");
        var catB = await _service.CreateCategoryAsync("Personal", "#10B981");

        // 3 events in catA
        await _service.CreateEventAsync("Meeting 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catA.Id, null);
        await _service.CreateEventAsync("Meeting 2", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catA.Id, null);
        await _service.CreateEventAsync("Meeting 3", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catA.Id, null);

        // 1 event in catB
        await _service.CreateEventAsync("Gym", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, catB.Id, null);

        // 1 uncategorised event
        await _service.CreateEventAsync("Walk", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, null, null);

        _db.ChangeTracker.Clear();

        var countA = await _service.GetCategoryEventCountAsync(catA.Id);
        var countB = await _service.GetCategoryEventCountAsync(catB.Id);
        var countRandom = await _service.GetCategoryEventCountAsync(Guid.NewGuid());

        Assert.Equal(3, countA);
        Assert.Equal(1, countB);
        Assert.Equal(0, countRandom);
    }

    [Fact]
    public async Task DeleteCategory_UncategorisesEvents_WhenNoMoveTargetSpecified()
    {
        var category = await _service.CreateCategoryAsync("Work", "#3B82F6");
        var evt1 = await _service.CreateEventAsync("Meeting 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, category.Id, null);
        var evt2 = await _service.CreateEventAsync("Meeting 2", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, category.Id, null);

        // Untrack the events so EF can't null their CategoryId on its own; the service has to do it
        _db.ChangeTracker.Clear();

        var deleted = await _service.DeleteCategoryAsync(category.Id);
        Assert.True(deleted);

        _db.ChangeTracker.Clear();

        // Category is removed
        var remainingCategory = await _db.EventCategories.FindAsync(category.Id);
        Assert.Null(remainingCategory);

        // Events still exist, but category is null (uncategorised)
        var updatedEvt1 = await _db.CalendarEvents.FindAsync(evt1.Id);
        var updatedEvt2 = await _db.CalendarEvents.FindAsync(evt2.Id);
        Assert.NotNull(updatedEvt1);
        Assert.NotNull(updatedEvt2);
        Assert.Null(updatedEvt1.CategoryId);
        Assert.Null(updatedEvt2.CategoryId);
    }

    [Fact]
    public async Task DeleteCategory_MovesEvents_WhenMoveTargetSpecified()
    {
        var categoryA = await _service.CreateCategoryAsync("Work", "#3B82F6");
        var categoryB = await _service.CreateCategoryAsync("Projects", "#10B981");

        var evt1 = await _service.CreateEventAsync("Work Task 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, categoryA.Id, null);
        var evt2 = await _service.CreateEventAsync("Work Task 2", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, categoryA.Id, null);
        var evt3 = await _service.CreateEventAsync("Project Task 1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, categoryB.Id, null);

        _db.ChangeTracker.Clear();

        var deleted = await _service.DeleteCategoryAsync(categoryA.Id, categoryB.Id);
        Assert.True(deleted);

        _db.ChangeTracker.Clear();

        // Category A is deleted, Category B remains
        Assert.Null(await _db.EventCategories.FindAsync(categoryA.Id));
        Assert.NotNull(await _db.EventCategories.FindAsync(categoryB.Id));

        // Events 1 and 2 now belong to Category B
        var updatedEvt1 = await _db.CalendarEvents.FindAsync(evt1.Id);
        var updatedEvt2 = await _db.CalendarEvents.FindAsync(evt2.Id);
        var updatedEvt3 = await _db.CalendarEvents.FindAsync(evt3.Id);

        Assert.Equal(categoryB.Id, updatedEvt1?.CategoryId);
        Assert.Equal(categoryB.Id, updatedEvt2?.CategoryId);
        Assert.Equal(categoryB.Id, updatedEvt3?.CategoryId);
    }

    [Fact]
    public async Task DeleteCategory_ReturnsFalse_WhenCategoryNotFound()
    {
        var result = await _service.DeleteCategoryAsync(Guid.NewGuid());
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteCategory_ReturnsFalse_WhenMoveTargetCategoryNotFound()
    {
        var categoryA = await _service.CreateCategoryAsync("Work", "#3B82F6");
        var nonExistentTargetId = Guid.NewGuid();

        var result = await _service.DeleteCategoryAsync(categoryA.Id, nonExistentTargetId);
        Assert.False(result);

        _db.ChangeTracker.Clear();

        // Category A should not have been deleted
        var stillExists = await _db.EventCategories.FindAsync(categoryA.Id);
        Assert.NotNull(stillExists);
    }

    [Fact]
    public async Task DeleteCategory_UncategorisesEvents_WhenMoveTargetIsSameAsCategoryBeingDeleted()
    {
        var category = await _service.CreateCategoryAsync("Work", "#3B82F6");
        var evt = await _service.CreateEventAsync("Meeting", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, category.Id, null);

        // Untrack the event so EF can't null its CategoryId on its own; the service has to do it
        _db.ChangeTracker.Clear();

        var result = await _service.DeleteCategoryAsync(category.Id, category.Id);
        Assert.True(result);

        _db.ChangeTracker.Clear();

        Assert.Null(await _db.EventCategories.FindAsync(category.Id));
        var updatedEvt = await _db.CalendarEvents.FindAsync(evt.Id);
        Assert.NotNull(updatedEvt);
        Assert.Null(updatedEvt.CategoryId);
    }
}
