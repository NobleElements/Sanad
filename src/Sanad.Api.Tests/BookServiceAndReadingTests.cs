using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class BookServiceAndReadingTests
{
    [Fact]
    public async Task Book_CrudOperations_Work()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var bookService = new BookService(db);

        // 1. Create book
        var book = await bookService.CreateBookAsync("Clean Architecture", "Robert C. Martin", "https://cover.jpg", 432);
        Assert.NotNull(book);
        Assert.Equal("Clean Architecture", book.Title);
        Assert.Equal(432, book.TotalPages);

        // 2. Update book
        var updated = await bookService.UpdateBookAsync(book.Id, "Clean Architecture 2nd Ed", "Uncle Bob", "https://newcover.jpg", 450);
        Assert.NotNull(updated);
        Assert.Equal("Clean Architecture 2nd Ed", updated!.Title);
        Assert.Equal(450, updated.TotalPages);

        // Read back from the store, not the tracked instance, to prove the update was saved
        db.ChangeTracker.Clear();
        var persisted = await db.Books.FindAsync(book.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Clean Architecture 2nd Ed", persisted!.Title);
        Assert.Equal("Uncle Bob", persisted.Author);
        Assert.Equal("https://newcover.jpg", persisted.CoverUrl);
        Assert.Equal(450, persisted.TotalPages);

        // 3. Update non-existent book returns null
        Assert.Null(await bookService.UpdateBookAsync(9999, "Missing", "No author", null, 100));

        // 4. Delete book
        Assert.True(await bookService.DeleteBookAsync(book.Id));
        db.ChangeTracker.Clear();
        Assert.Null(await db.Books.FindAsync(book.Id));
        Assert.False(await bookService.DeleteBookAsync(book.Id));
    }

    [Fact]
    public async Task ReadingPeriod_SettingStatusToReading_PausesOtherActivePeriods()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var readingService = new ReadingService(db);
        var bookService = new BookService(db);

        var book1 = await bookService.CreateBookAsync("Book One", "Author 1", null, 200);
        var book2 = await bookService.CreateBookAsync("Book Two", "Author 2", null, 300);

        // 1. Start period for book1 -> Status is "Reading"
        var period1 = await readingService.StartReadingPeriodAsync(book1.Id);
        Assert.Equal("Reading", period1.Status);

        // 2. Start period for book2 -> Status is "Reading"
        var period2 = await readingService.StartReadingPeriodAsync(book2.Id);
        Assert.Equal("Reading", period2.Status);

        // 3. Activate period1 again -> period2 must be automatically paused!
        var updatedPeriod1 = await readingService.UpdateStatusAsync(period1.Id, "Reading");
        Assert.Equal("Reading", updatedPeriod1!.Status);

        // Read back from the store, not the tracked instances, to prove both changes were saved
        db.ChangeTracker.Clear();
        var refreshedPeriod1 = await db.ReadingPeriods.FindAsync(period1.Id);
        var refreshedPeriod2 = await db.ReadingPeriods.FindAsync(period2.Id);
        Assert.Equal("Reading", refreshedPeriod1!.Status);
        Assert.Equal("Paused", refreshedPeriod2!.Status);
    }

    [Fact]
    public async Task ReadingPeriod_UpdatePlansAndDeletion_Work()
    {
        // SQLite rather than EF InMemory: deleting a period relies on the database's cascade delete,
        // which InMemory only emulates for entities that happen to be tracked.
        var (db, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (db)
        {
            var readingService = new ReadingService(db);
            var bookService = new BookService(db);

            var book = await bookService.CreateBookAsync("Design Patterns", "GoF", null, 400);
            var period = await readingService.StartReadingPeriodAsync(book.Id, new List<PlanDto>
            {
                new("Part 1", 1, 100)
            });

            Assert.Single(period.Plans);
            await readingService.LogReadingAsync(period.Id, 1, 20);

            // 1. Update plans with multiple new chapters
            var newPlans = new List<PlanDto>
            {
                new("Creational", 1, 150),
                new("Structural", 150, 280),
                new("Behavioral", 280, 400)
            };
            var updatedPlans = await readingService.UpdatePlansAsync(period.Id, newPlans);
            Assert.NotNull(updatedPlans);
            Assert.Equal(3, updatedPlans!.Count);
            Assert.Equal("Creational", updatedPlans[0].Title);

            db.ChangeTracker.Clear();

            // The old "Part 1" row is replaced, not kept alongside the new plans
            var storedPlans = await db.ReadingPlans.OrderBy(p => p.OrderIndex).ToListAsync();
            Assert.Equal(new[] { "Creational", "Structural", "Behavioral" }, storedPlans.Select(p => p.Title));
            Assert.Equal(new[] { 0, 1, 2 }, storedPlans.Select(p => p.OrderIndex));
            Assert.All(storedPlans, p => Assert.Equal(period.Id, p.ReadingPeriodId));
            Assert.Equal(1, await db.ReadingLogs.CountAsync());

            // 2. Delete reading period -> its plans and logs go with it
            Assert.True(await readingService.DeleteReadingPeriodAsync(period.Id));

            db.ChangeTracker.Clear();

            Assert.Null(await db.ReadingPeriods.FindAsync(period.Id));
            Assert.Equal(0, await db.ReadingPlans.CountAsync());
            Assert.Equal(0, await db.ReadingLogs.CountAsync());
            Assert.NotNull(await db.Books.FindAsync(book.Id));
            Assert.False(await readingService.DeleteReadingPeriodAsync(period.Id));
        }
    }
}
