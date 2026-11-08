using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class DomainServicesTests
{
    [Fact]
    public async Task ReadingService_CalculatesProgressAndAutoCompletes()
    {
        var (db, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (db)
        {
            var readingService = new ReadingService(db);

            var book = new Book { Title = "Atomic Habits", Author = "James Clear", TotalPages = 200 };
            db.Books.Add(book);
            await db.SaveChangesAsync();

            // 1. Start period with plans
            var plans = new List<PlanDto>
            {
                new PlanDto("Chapter 1", 1, 50),
                new PlanDto("Chapter 2", 50, 100),
                new PlanDto("Chapter 3", 100, 200)
            };
            var period = await readingService.StartReadingPeriodAsync(book.Id, plans);
            Assert.Equal("Reading", period.Status);

            // 2. Log reading: pages 1 to 40
            var log = await readingService.LogReadingAsync(period.Id, 1, 40);
            Assert.NotNull(log);
            Assert.Equal(40, log.EndPage);

            db.ChangeTracker.Clear();

            // Check progress
            var progress = await readingService.GetCurrentReadingAsync();
            Assert.NotNull(progress);
            Assert.Equal(40, progress.CurrentPage);
            Assert.Equal("Chapter 1", progress.CurrentChapter);
            Assert.Equal(10, progress.PagesLeftInChapter);

            // 3. Log reading to 200 (finishes book)
            await readingService.LogReadingAsync(period.Id, 40, 200);

            db.ChangeTracker.Clear();

            var finishedPeriod = await db.ReadingPeriods.FindAsync(period.Id);
            Assert.NotNull(finishedPeriod);
            Assert.Equal("Completed", finishedPeriod.Status);
            Assert.NotNull(finishedPeriod.EndDate);
        }
    }

    [Fact]
    public async Task DebtService_CreatesSnapshotsOnAmountChanges()
    {
        var (db, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (db)
        {
            var debtService = new DebtService(db);

            // Create debt -> initial snapshot
            var debt = await debtService.CreateDebtAsync("Student Loan", "Loan", 10000m);
            Assert.Equal(1, await db.DebtSnapshots.CountAsync());

            // Update with same amount -> no new snapshot
            await debtService.UpdateDebtAsync(debt.Id, "Student Loan", "Loan", 10000m);
            Assert.Equal(1, await db.DebtSnapshots.CountAsync());

            // Update with new amount -> new snapshot created
            await debtService.UpdateDebtAsync(debt.Id, "Student Loan", "Loan", 9000m);
            Assert.Equal(2, await db.DebtSnapshots.CountAsync());

            db.ChangeTracker.Clear();

            // Snapshots created in the same tick tie on RecordedAt, so compare the set of amounts instead of picking a "latest"
            var amounts = (await db.DebtSnapshots.Select(s => s.Amount).ToListAsync()).OrderBy(a => a);
            Assert.Equal(new[] { 9000m, 10000m }, amounts);

            // Delete debt -> cleans up debt and its snapshots
            var deleted = await debtService.DeleteDebtAsync(debt.Id);
            Assert.True(deleted);

            db.ChangeTracker.Clear();

            Assert.Equal(0, await db.Debts.CountAsync());
            Assert.Equal(0, await db.DebtSnapshots.CountAsync());
        }
    }

    [Fact]
    public async Task ThoughtService_CrudOperationsWork()
    {
        var (db, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (db)
        {
            var thoughtService = new ThoughtService(db);

            var thought = await thoughtService.CreateThoughtAsync("Deep thought about services");
            Assert.NotNull(thought);
            Assert.Equal("Deep thought about services", thought.Content);

            var list = await thoughtService.GetThoughtsAsync(1, 10, "services");
            Assert.Single(list);

            var updated = await thoughtService.UpdateThoughtAsync(thought.Id, "Updated thought");
            Assert.NotNull(updated);
            Assert.Equal("Updated thought", updated.Content);

            var deleted = await thoughtService.DeleteThoughtAsync(thought.Id);
            Assert.True(deleted);

            db.ChangeTracker.Clear();
            Assert.Empty(await thoughtService.GetThoughtsAsync());

            // Collections & Keep Features
            var col1 = await thoughtService.CreateCollectionAsync("Work", "#3B82F6");
            var col2 = await thoughtService.CreateCollectionAsync("Personal", "#10B981");
            Assert.NotNull(col1);
            Assert.Equal("Work", col1.Name);

            var t1 = await thoughtService.CreateThoughtAsync("Work note", col1.Id, "#FEF3C7", isPinned: true);
            var t2 = await thoughtService.CreateThoughtAsync("Uncategorized note");
            var t3 = await thoughtService.CreateThoughtAsync("Another work note", col1.Id);

            var collections = await thoughtService.GetCollectionsAsync();
            Assert.Equal(2, collections.Count);
            var workDto = collections.First(c => c.Id == col1.Id);
            Assert.Equal(2, workDto.ThoughtCount);

            // Filter by collection
            var workThoughts = await thoughtService.GetThoughtsAsync(collectionId: col1.Id);
            Assert.Equal(2, workThoughts.Count);
            Assert.True(workThoughts[0].IsPinned); // Pinned thought should come first

            // Filter by uncategorized
            var uncatThoughts = await thoughtService.GetThoughtsAsync(collectionId: "__UNCATEGORIZED__");
            Assert.Single(uncatThoughts);
            Assert.Equal("Uncategorized note", uncatThoughts[0].Content);

            // Move t1 to Personal (col2)
            var moved = await thoughtService.UpdateThoughtAsync(t1.Id, collectionId: col2.Id);
            Assert.NotNull(moved);
            Assert.Equal(col2.Id, moved.CollectionId);

            // Delete col2 without deleting thoughts (should unassign)
            var delCol2 = await thoughtService.DeleteCollectionAsync(col2.Id, deleteThoughts: false);
            Assert.True(delCol2);
            var t1After = (await thoughtService.GetThoughtsAsync()).First(t => t.Id == t1.Id);
            Assert.Null(t1After.CollectionId);

            // Delete col1 with deleting thoughts
            var delCol1 = await thoughtService.DeleteCollectionAsync(col1.Id, deleteThoughts: true);
            Assert.True(delCol1);
            var remaining = await thoughtService.GetThoughtsAsync();
            Assert.DoesNotContain(remaining, t => t.Id == t3.Id);
        }
    }

    [Fact]
    public async Task HabitService_TogglingAndReorderingWorks()
    {
        var (db, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (db)
        {
            var habitService = new HabitService(db);

            var h1 = await habitService.CreateHabitAsync("Workout", "dumbbell", "daily");
            var h2 = await habitService.CreateHabitAsync("Read", "book", "daily");

            var today = DateTime.UtcNow.Date;
            var log = await habitService.ToggleHabitLogAsync(h1.Id, today);
            Assert.NotNull(log);
            Assert.True(log.Completed);

            // Toggle again -> completed false
            var log2 = await habitService.ToggleHabitLogAsync(h1.Id, today);
            Assert.NotNull(log2);
            Assert.False(log2.Completed);

            // Reorder. New habits all start at Order 0 and tie-break newest first ([h2, h1]),
            // so ask for the opposite order to prove the reorder is what changed it.
            await habitService.ReorderHabitsAsync(new List<string> { h1.Id, h2.Id });

            db.ChangeTracker.Clear();

            var habits = await habitService.GetHabitsAsync();
            Assert.Equal(new[] { h1.Id, h2.Id }, habits.Select(h => h.Id));
            Assert.Equal(new[] { 0, 1 }, habits.Select(h => h.Order));
        }
    }
}
