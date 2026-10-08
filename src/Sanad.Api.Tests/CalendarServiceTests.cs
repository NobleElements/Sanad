using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class CalendarServiceTests
{
    [Fact]
    public async Task Event_CreateUpdateDelete_Works()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new CalendarService(db);

        var start = new DateTime(2026, 7, 10, 10, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(2);

        // 1. Create event
        var evt = await service.CreateEventAsync(
            "Sprint Planning",
            "Planning for Q3",
            start,
            end,
            false,
            null,
            15, // 15 mins before
            null,
            null
        );

        Assert.NotNull(evt);
        Assert.Equal("Sprint Planning", evt.Title);
        Assert.Equal(15, evt.NotificationPreference);

        // 2. Update event
        var updatedDto = new CalendarEvent
        {
            Title = "Sprint Planning (Extended)",
            StartDate = start,
            EndDate = end.AddHours(1),
            IsAllDay = false,
            NotificationPreference = 30
        };
        var updated = await service.UpdateEventAsync(evt.Id, updatedDto);
        Assert.NotNull(updated);
        Assert.Equal("Sprint Planning (Extended)", updated!.Title);
        Assert.Equal(30, updated.NotificationPreference);
        Assert.Equal(end.AddHours(1), updated.EndDate);

        // Read back from the store, not the tracked instance, to prove the update was saved
        db.ChangeTracker.Clear();
        var persisted = await db.CalendarEvents.FindAsync(evt.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Sprint Planning (Extended)", persisted!.Title);
        Assert.Equal(30, persisted.NotificationPreference);
        Assert.Equal(end.AddHours(1), persisted.EndDate);

        // 3. Delete event
        var deleted = await service.DeleteEventAsync(evt.Id);
        Assert.True(deleted);
        db.ChangeTracker.Clear();
        Assert.Null(await db.CalendarEvents.FindAsync(evt.Id));

        // 4. Delete unknown event returns false
        Assert.False(await service.DeleteEventAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Event_WithTaskItem_SyncsDatesToTask()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new CalendarService(db);

        var task = new TaskItem { Title = "Feature A Development" };
        db.TaskItems.Add(task);
        await db.SaveChangesAsync();

        var start = new DateTime(2026, 8, 1, 9, 0, 0, DateTimeKind.Utc);
        var end = start.AddDays(3);

        // Creating event associated with task syncs start/end dates to task
        var evt = await service.CreateEventAsync(
            "Feature A Work",
            null,
            start,
            end,
            false,
            null,
            null,
            null,
            task.Id
        );

        // Read back from the store, not the tracked instance, to prove the task change was saved
        db.ChangeTracker.Clear();
        var dbTask = await db.TaskItems.FindAsync(task.Id);
        Assert.NotNull(dbTask);
        Assert.Equal(start, dbTask!.StartDate);
        Assert.Equal(end, dbTask.EndDate);

        // Updating event dates also syncs to task
        var newStart = start.AddDays(1);
        var newEnd = end.AddDays(2);
        await service.UpdateEventAsync(evt.Id, new CalendarEvent
        {
            Title = "Feature A Work",
            StartDate = newStart,
            EndDate = newEnd,
            TaskItemId = task.Id
        });

        db.ChangeTracker.Clear();
        dbTask = await db.TaskItems.FindAsync(task.Id);
        Assert.Equal(newStart, dbTask!.StartDate);
        Assert.Equal(newEnd, dbTask.EndDate);
    }

    [Fact]
    public async Task GetEvents_DateRangeFiltering_AndRecurringRules()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new CalendarService(db);

        var baseDate = new DateTime(2026, 5, 10, 0, 0, 0, DateTimeKind.Utc);

        // 1. Event before window
        await service.CreateEventAsync("Past Event", null, baseDate.AddDays(-10), baseDate.AddDays(-9), false, null, null, null, null);

        // 2. Event inside window (May 10 to May 20)
        await service.CreateEventAsync("In Window Event", null, baseDate.AddDays(2), baseDate.AddDays(3), false, null, null, null, null);

        // 3. Event after window
        await service.CreateEventAsync("Future Event", null, baseDate.AddDays(30), baseDate.AddDays(31), false, null, null, null, null);

        // 4. Recurring event outside window (must still be included because RecurrenceRule != null)
        await service.CreateEventAsync("Weekly Sync", null, baseDate.AddDays(-50), baseDate.AddDays(-50).AddHours(1), false, "FREQ=WEEKLY", null, null, null);

        var windowStart = baseDate;
        var windowEnd = baseDate.AddDays(20);

        var results = await service.GetEventsAsync(windowStart, windowEnd);

        // Should return "In Window Event" and "Weekly Sync" (recurring rule)
        Assert.Equal(2, results.Count);
        Assert.Contains(results, e => e.Title == "In Window Event");
        Assert.Contains(results, e => e.Title == "Weekly Sync");
        Assert.DoesNotContain(results, e => e.Title == "Past Event");
        Assert.DoesNotContain(results, e => e.Title == "Future Event");
    }
}
