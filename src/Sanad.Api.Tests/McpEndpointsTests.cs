using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class McpEndpointsTests
{
    private static SanadDbContext CreateDb() => TestDbContextFactory.CreateInMemorySanadDbContext();

    /// <summary>
    /// Builds an McpEndpoints wired to the real services backed by the given context.
    /// The tenant-scoped services that would touch the filesystem are stubbed; everything
    /// else is constructed from <paramref name="db"/> exactly like the DI container does.
    /// </summary>
    private static McpEndpoints CreateMcp(SanadDbContext db, AdminDbContext? adminDb = null)
    {
        var tenant = new TestTenantProvider();
        var fileManager = new FileManagerService(db, new NoOpFileStorageService(), new NoOpDiskQuotaService(adminDb), tenant);

        return new McpEndpoints(
            db,
            null!,
            fileManager,
            tenant,
            new NoOpDiskQuotaService(adminDb),
            adminDb!);
    }

    // ---------- Thoughts ----------

    [Fact]
    public async Task McpGetThoughts_SupportsPagingAndSearch()
    {
        using var db = CreateDb();
        for (var i = 1; i <= 5; i++)
        {
            db.Thoughts.Add(new Thought { Content = $"thought {i}", CreatedAt = DateTime.UtcNow.AddMinutes(i) });
        }
        db.Thoughts.Add(new Thought { Content = "needle", CreatedAt = DateTime.UtcNow.AddMinutes(99) });
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);

        var page = await mcp.GetThoughts(1, 2, null);
        Assert.Equal(2, page.Count);

        var secondPage = await mcp.GetThoughts(2, 2, null);
        Assert.Equal(2, secondPage.Count);
        Assert.Empty(page.Select(t => t.Id).Intersect(secondPage.Select(t => t.Id)));

        var searched = await mcp.GetThoughts(1, 20, "needle");
        var only = Assert.Single(searched);
        Assert.Equal("needle", only.Content);
    }

    // ---------- Transactions ----------

    [Fact]
    public async Task McpGetTransactions_SupportsMonthYearPagingSearchAndCategory()
    {
        using var db = CreateDb();
        var food = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
        var rent = new TransactionCategory { Name = "Rent", MonthlyBudget = 900 };
        db.TransactionCategories.AddRange(food, rent);

        var targetMonth = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc);
        db.Transactions.AddRange(
            new Transaction { Amount = 10, Description = "Coffee", CategoryId = food.Id, Type = "Expense", Date = targetMonth },
            new Transaction { Amount = 20, Description = "Groceries", CategoryId = food.Id, Type = "Expense", Date = targetMonth.AddDays(1) },
            new Transaction { Amount = 30, Description = "Takeaway", CategoryId = food.Id, Type = "Expense", Date = targetMonth.AddDays(2) },
            new Transaction { Amount = 40, Description = "Coffee elsewhere", CategoryId = rent.Id, Type = "Expense", Date = targetMonth.AddDays(3) },
            // Different month - must not leak into the filtered result
            new Transaction { Amount = 50, Description = "Coffee last month", CategoryId = food.Id, Type = "Expense", Date = new DateTime(2026, 2, 20, 0, 0, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);

        // Serialized the way the MCP SDK returns tool results (camelCase)
        var result = await mcp.GetTransactions(3, 2026, 1, 10, null, null);
        var json = JsonSerializer.SerializeToElement(result, WireJson.Mcp);
        Assert.Equal(4, json.GetProperty("totalCount").GetInt32());
        Assert.False(json.GetProperty("hasMore").GetBoolean());
        Assert.Equal(4, json.GetProperty("items").GetArrayLength());

        // paging
        var firstPage = JsonSerializer.SerializeToElement(await mcp.GetTransactions(3, 2026, 1, 2, null, null), WireJson.Mcp);
        Assert.Equal(2, firstPage.GetProperty("items").GetArrayLength());
        Assert.True(firstPage.GetProperty("hasMore").GetBoolean());

        // search
        var searched = JsonSerializer.SerializeToElement(await mcp.GetTransactions(3, 2026, 1, 20, "Coffee", null), WireJson.Mcp);
        Assert.Equal(2, searched.GetProperty("totalCount").GetInt32());

        // category filter
        var byCategory = JsonSerializer.SerializeToElement(await mcp.GetTransactions(3, 2026, 1, 20, null, rent.Id), WireJson.Mcp);
        Assert.Equal(1, byCategory.GetProperty("totalCount").GetInt32());
        Assert.Equal(rent.Id, byCategory.GetProperty("items")[0].GetProperty("categoryId").GetGuid());
    }

    [Fact]
    public async Task McpCreateTransaction_HonoursExplicitDate()
    {
        using var db = CreateDb();
        var category = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
        db.TransactionCategories.Add(category);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        var date = new DateTime(2025, 12, 24, 8, 30, 0, DateTimeKind.Utc);

        var created = await mcp.CreateTransaction(12.5m, "Christmas lunch", "Expense", category.Id, date);

        Assert.Equal(date, created.Date);
        var stored = await db.Transactions.SingleAsync();
        Assert.Equal(date, stored.Date);
    }

    [Fact]
    public async Task McpCreateTransaction_DefaultsDateToNow()
    {
        using var db = CreateDb();
        var category = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
        db.TransactionCategories.Add(category);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        var before = DateTime.UtcNow.AddSeconds(-5);
        var created = await mcp.CreateTransaction(1m, "Snack", "Expense", category.Id);
        var after = DateTime.UtcNow.AddSeconds(5);

        Assert.InRange(created.Date, before, after);
    }

    [Fact]
    public async Task McpCreateTransaction_ThrowsForUnknownCategory()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            mcp.CreateTransaction(1m, "Nope", "Expense", Guid.NewGuid()));
    }

    // ---------- Tasks ----------

    [Fact]
    public async Task McpCreateTask_ExposesAllTaskItemFields()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);
        var start = new DateTime(2026, 4, 1, 9, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(2);

        var created = await mcp.CreateTask(
            "Write report",
            "Quarterly numbers",
            "Work",
            "urgent,finance",
            Sanad.Api.Models.TaskStatus.InProgress,
            90,
            3,
            start,
            end);

        Assert.Equal("Write report", created.Title);
        Assert.Equal("Quarterly numbers", created.Content);
        Assert.Equal("Work", created.Project);
        Assert.Equal("urgent,finance", created.Tags);
        Assert.Equal(Sanad.Api.Models.TaskStatus.InProgress, created.Status);
        Assert.Equal(90, created.EstimatedMinutes);
        Assert.Equal(3, created.Order);
        Assert.Equal(start, created.StartDate);
        Assert.Equal(end, created.EndDate);

        var stored = await db.TaskItems.SingleAsync();
        Assert.Equal(Sanad.Api.Models.TaskStatus.InProgress, stored.Status);
        Assert.Equal(90, stored.EstimatedMinutes);
        Assert.Equal(start, stored.StartDate);
    }

    [Fact]
    public async Task McpCreateTask_StillDefaultsToTodoStatus()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var created = await mcp.CreateTask("Simple task");

        Assert.Equal(Sanad.Api.Models.TaskStatus.ToDo, created.Status);
        Assert.Equal(0, created.Order);
        Assert.Null(created.StartDate);
        Assert.Null(created.EstimatedMinutes);
    }

    // ---------- Goals ----------

    [Fact]
    public async Task McpGoalTools_GetAndSetArbitraryDate()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var missing = await mcp.GetGoal("2026-01-01");
        Assert.Null(missing);

        var set = await mcp.SetGoal("2026-01-01", "Ship the parity work");
        Assert.Equal("2026-01-01", set.DateStr);
        Assert.Equal("Ship the parity work", set.Goal);

        var fetched = await mcp.GetGoal("2026-01-01");
        Assert.NotNull(fetched);
        Assert.Equal("Ship the parity work", fetched!.Goal);

        // Updating the same date replaces the text rather than duplicating.
        var updated = await mcp.SetGoal("2026-01-01", "Ship it faster");
        Assert.Equal("Ship it faster", updated.Goal);
        Assert.Equal(1, await db.DailyGoals.CountAsync());
    }

    [Fact]
    public async Task McpTodaysGoal_UsesTodaysDate()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        // "Today" is the server's local date (DateTime.Now), not the UTC date. Sample it on both sides of
        // the call so a run that crosses local midnight still passes.
        var localDateBefore = DateTime.Now.ToString("yyyy-MM-dd");
        var goal = await mcp.SetTodaysGoal("Today only");
        var localDateAfter = DateTime.Now.ToString("yyyy-MM-dd");
        Assert.Contains(goal.DateStr, new[] { localDateBefore, localDateAfter });

        var fetched = await mcp.GetTodaysGoal();
        Assert.NotNull(fetched);
        Assert.Equal("Today only", fetched!.Goal);
    }

    // ---------- Notes ----------

    [Fact]
    public async Task McpGetNotes_RespectsLimit()
    {
        using var db = CreateDb();
        var notebook = new Notebook { Name = "Inbox" };
        db.Notebooks.Add(notebook);
        for (var i = 1; i <= 6; i++)
        {
            db.Notes.Add(new Note
            {
                NotebookId = notebook.Id,
                Title = $"note {i}",
                Content = "body",
                UpdatedAt = DateTime.UtcNow.AddMinutes(i)
            });
        }
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);

        Assert.Equal(2, (await mcp.GetNotes(2)).Count);
        Assert.Equal(6, (await mcp.GetNotes(10)).Count);
    }

    // ---------- Phase 2: thoughts ----------

    [Fact]
    public async Task McpUpdateThought_UpdatesContent()
    {
        using var db = CreateDb();
        var thought = new Thought { Content = "original" };
        db.Thoughts.Add(thought);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        var updated = await mcp.UpdateThought(thought.Id, "revised");

        Assert.NotNull(updated);
        Assert.Equal("revised", updated!.Content);
        db.ChangeTracker.Clear();
        Assert.Equal("revised", (await db.Thoughts.FindAsync(thought.Id))!.Content);
    }

    [Fact]
    public async Task McpUpdateThought_ReturnsNullForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.Null(await mcp.UpdateThought(Guid.NewGuid().ToString(), "nope"));
    }

    // ---------- Phase 2: tasks ----------

    [Fact]
    public async Task McpUpdateTask_ReplacesEveryField()
    {
        using var db = CreateDb();
        var task = new TaskItem { Title = "Old title", Project = "Old project", Status = Sanad.Api.Models.TaskStatus.ToDo };
        db.TaskItems.Add(task);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        var end = DateTime.UtcNow.AddDays(3);

        var ok = await mcp.UpdateTask(
            task.Id, "New title", "New content", "New project", "a,b",
            Sanad.Api.Models.TaskStatus.Done, 45, 7, null, end);

        Assert.True(ok);
        // Read back from the store, not the tracked instance, to prove the update was saved
        db.ChangeTracker.Clear();
        var stored = await db.TaskItems.FindAsync(task.Id);
        Assert.NotNull(stored);
        Assert.Equal("New title", stored!.Title);
        Assert.Equal("New content", stored.Content);
        Assert.Equal("New project", stored.Project);
        Assert.Equal("a,b", stored.Tags);
        Assert.Equal(Sanad.Api.Models.TaskStatus.Done, stored.Status);
        Assert.Equal(45, stored.EstimatedMinutes);
        Assert.Equal(7, stored.Order);
        Assert.Equal(end, stored.EndDate);
    }

    [Fact]
    public async Task McpUpdateTask_ReturnsFalseForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.False(await mcp.UpdateTask(Guid.NewGuid(), "title"));
    }

    [Fact]
    public async Task McpReorderTasks_AppliesOrderAndStatus()
    {
        using var db = CreateDb();
        var a = new TaskItem { Title = "A", Order = 0 };
        var b = new TaskItem { Title = "B", Order = 1 };
        var c = new TaskItem { Title = "C", Order = 2 };
        db.TaskItems.AddRange(a, b, c);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        var ok = await mcp.ReorderTasks(new List<TaskUpdateDto>
        {
            new(c.Id, Sanad.Api.Models.TaskStatus.Done, 0),
            new(b.Id, Sanad.Api.Models.TaskStatus.InProgress, 1),
            new(a.Id, Sanad.Api.Models.TaskStatus.ToDo, 2)
        });

        Assert.True(ok);
        db.ChangeTracker.Clear();
        var ordered = await db.TaskItems.OrderBy(t => t.Order).ToListAsync();
        Assert.Equal(new[] { "C", "B", "A" }, ordered.Select(t => t.Title));
        Assert.Equal(Sanad.Api.Models.TaskStatus.Done, ordered[0].Status);
        Assert.Equal(Sanad.Api.Models.TaskStatus.InProgress, ordered[1].Status);
        Assert.Equal(Sanad.Api.Models.TaskStatus.ToDo, ordered[2].Status);
    }

    [Fact]
    public async Task McpRenameTaskProject_MovesAllTasks()
    {
        using var db = CreateDb();
        db.TaskItems.AddRange(
            new TaskItem { Title = "1", Project = "Alpha" },
            new TaskItem { Title = "2", Project = "Alpha" },
            new TaskItem { Title = "3", Project = "Beta" });
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        Assert.True(await mcp.RenameTaskProject("Alpha", "Gamma"));

        Assert.Equal(2, await db.TaskItems.CountAsync(t => t.Project == "Gamma"));
        Assert.Equal(1, await db.TaskItems.CountAsync(t => t.Project == "Beta"));
        Assert.Equal(0, await db.TaskItems.CountAsync(t => t.Project == "Alpha"));
    }

    [Fact]
    public async Task McpDeleteTaskProject_UnassignsTasks()
    {
        using var db = CreateDb();
        db.TaskItems.AddRange(
            new TaskItem { Title = "1", Project = "Alpha" },
            new TaskItem { Title = "2", Project = "Alpha" },
            new TaskItem { Title = "3", Project = "Beta" });
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        Assert.True(await mcp.DeleteTaskProject("Alpha"));

        var alphas = await db.TaskItems.Where(t => t.Project == null).ToListAsync();
        Assert.Equal(2, alphas.Count);
        Assert.Equal(1, await db.TaskItems.CountAsync(t => t.Project == "Beta"));
    }

    // ---------- Phase 2: finance ----------

    [Fact]
    public async Task McpUpdateCategory_AppliesAllFields()
    {
        using var db = CreateDb();
        var category = new TransactionCategory { Name = "Food", MonthlyBudget = 100, ColorHex = "#111111" };
        db.TransactionCategories.Add(category);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        var updated = await mcp.UpdateCategory(category.Id, "Dining", 250, "#ff0000");

        Assert.NotNull(updated);
        Assert.Equal("Dining", updated!.Name);
        Assert.Equal(250, updated.MonthlyBudget);
        Assert.Equal("#ff0000", updated.ColorHex);
    }

    [Fact]
    public async Task McpUpdateCategory_ReturnsNullForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.Null(await mcp.UpdateCategory(Guid.NewGuid(), "x", 1, "#000000"));
    }

    [Fact]
    public async Task McpUpdateTransaction_AppliesOnlyProvidedFields()
    {
        using var db = CreateDb();
        var food = new TransactionCategory { Name = "Food", MonthlyBudget = 100 };
        var rent = new TransactionCategory { Name = "Rent", MonthlyBudget = 900 };
        db.TransactionCategories.AddRange(food, rent);
        var original = new DateTime(2026, 5, 5, 0, 0, 0, DateTimeKind.Utc);
        var tx = new Transaction { Amount = 10, Description = "Lunch", Type = "Expense", CategoryId = food.Id, Date = original };
        db.Transactions.Add(tx);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        var updated = await mcp.UpdateTransaction(tx.Id, amount: 42, categoryId: rent.Id);

        Assert.NotNull(updated);
        Assert.Equal(42, updated!.Amount);
        Assert.Equal(rent.Id, updated.CategoryId);
        // untouched fields survive
        Assert.Equal("Lunch", updated.Description);
        Assert.Equal("Expense", updated.Type);
        Assert.Equal(original, updated.Date);

        db.ChangeTracker.Clear();
        var stored = await db.Transactions.SingleAsync();
        Assert.Equal(42, stored.Amount);
        Assert.Equal(rent.Id, stored.CategoryId);
        Assert.Equal("Lunch", stored.Description);
    }

    [Fact]
    public async Task McpUpdateTransaction_ReturnsNullForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.Null(await mcp.UpdateTransaction(Guid.NewGuid(), amount: 1));
    }

    [Fact]
    public async Task McpFinanceSummary_MatchesRestShapeAndNumbers()
    {
        using var db = CreateDb();
        var food = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
        db.TransactionCategories.Add(food);
        await db.SaveChangesAsync();

        var mcp = CreateMcp(db);
        await mcp.SetMonthlyBudget(1000, 6, 2026);

        db.Transactions.AddRange(
            new Transaction { Amount = 100, CategoryId = food.Id, Type = "Expense", Date = new DateTime(2026, 6, 3, 0, 0, 0, DateTimeKind.Utc) },
            new Transaction { Amount = 50, CategoryId = food.Id, Type = "Expense", Date = new DateTime(2026, 6, 9, 0, 0, 0, DateTimeKind.Utc) },
            new Transaction { Amount = 999, CategoryId = food.Id, Type = "Income", Date = new DateTime(2026, 6, 9, 0, 0, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();

        var summary = JsonSerializer.SerializeToElement(await mcp.GetFinanceSummary(6, 2026), WireJson.Mcp);

        Assert.Equal(1000m, summary.GetProperty("monthlyBudget").GetDecimal());
        Assert.Equal(150m, summary.GetProperty("totalSpent").GetDecimal());
        var categoryEntry = summary.GetProperty("categories")[0];
        Assert.Equal("Food", categoryEntry.GetProperty("category").GetProperty("name").GetString());
        Assert.Equal(150m, categoryEntry.GetProperty("spent").GetDecimal());
        Assert.Equal(350m, categoryEntry.GetProperty("remaining").GetDecimal());
    }

    [Fact]
    public async Task McpMonthlyBudget_RoundTripsAndDefaultsToCurrentMonth()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        await mcp.SetMonthlyBudget(750, 2, 2026);
        var budget = JsonSerializer.SerializeToElement(await mcp.GetMonthlyBudget(2, 2026), WireJson.Mcp);
        Assert.Equal(750m, budget.GetProperty("amount").GetDecimal());
        Assert.Equal(2, budget.GetProperty("month").GetInt32());
        Assert.Equal(2026, budget.GetProperty("year").GetInt32());

        // No explicit month/year → current month, and an unset budget reads as 0.
        var current = JsonSerializer.SerializeToElement(await mcp.GetMonthlyBudget(), WireJson.Mcp);
        Assert.Equal(DateTime.UtcNow.Month, current.GetProperty("month").GetInt32());
        Assert.Equal(0m, current.GetProperty("amount").GetDecimal());

        // Setting it twice updates rather than duplicating.
        await mcp.SetMonthlyBudget(900, 2, 2026);
        Assert.Equal(1, await db.MonthlyBudgets.CountAsync(b => b.Year == 2026 && b.Month == 2));
        var updated = JsonSerializer.SerializeToElement(await mcp.GetMonthlyBudget(2, 2026), WireJson.Mcp);
        Assert.Equal(900m, updated.GetProperty("amount").GetDecimal());
    }

    // ---------- Phase 2: currencies ----------

    [Fact]
    public async Task McpCurrencyTools_Crud()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var usd = await mcp.CreateCurrency("USD", "US Dollar", "$");
        Assert.True(usd.IsDefault);
        Assert.Equal(1.0m, usd.ExchangeRateToDefault);

        var eur = await mcp.CreateCurrency("EUR", "Euro", "€", 0.9m);
        Assert.False(eur.IsDefault);

        var all = await mcp.GetCurrencies();
        Assert.Equal(2, all.Count);

        var renamed = await mcp.UpdateCurrency(eur.Id, "EUR", "Euro (updated)", "€", 0.85m);
        Assert.NotNull(renamed);
        Assert.Equal("Euro (updated)", renamed!.Name);
        Assert.Equal(0.85m, renamed.ExchangeRateToDefault);

        Assert.True(await mcp.DeleteCurrency(eur.Id));
        var remaining = await mcp.GetCurrencies();
        Assert.Single(remaining);
    }

    [Fact]
    public async Task McpDeleteCurrency_RefusesDefaultCurrency()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var usd = await mcp.CreateCurrency("USD", "US Dollar", "$");
        Assert.False(await mcp.DeleteCurrency(usd.Id));
        Assert.Single(await mcp.GetCurrencies());
    }

    [Fact]
    public async Task McpSetDefaultCurrency_RebasesOtherRates()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var usd = await mcp.CreateCurrency("USD", "US Dollar", "$");
        // 1 EUR = 2 USD, so 1 USD = 0.5 EUR.
        var eur = await mcp.CreateCurrency("EUR", "Euro", "€", 2.0m);

        Assert.True(await mcp.SetDefaultCurrency(eur.Id));

        db.ChangeTracker.Clear();
        var currencies = await mcp.GetCurrencies();
        var newDefault = currencies.Single(c => c.Id == eur.Id);
        var oldDefault = currencies.Single(c => c.Id == usd.Id);
        Assert.True(newDefault.IsDefault);
        Assert.Equal(1.0m, newDefault.ExchangeRateToDefault);
        Assert.False(oldDefault.IsDefault);
        Assert.Equal(0.5m, oldDefault.ExchangeRateToDefault);
    }

    [Fact]
    public async Task McpSetDefaultCurrency_ReturnsFalseForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.False(await mcp.SetDefaultCurrency(Guid.NewGuid()));
    }

    // ---------- Phase 2: debts ----------

    [Fact]
    public async Task McpReorderDebts_AppliesOrder()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var a = await mcp.CreateDebt("A", "Loan", 100);
        var b = await mcp.CreateDebt("B", "Loan", 200);
        var c = await mcp.CreateDebt("C", "Loan", 300);

        Assert.True(await mcp.ReorderDebts(new List<Guid> { c.Id, a.Id, b.Id }));

        var debts = await mcp.GetDebts();
        Assert.Equal(new[] { "C", "A", "B" }, debts.Select(d => d.Name));
    }

    [Fact]
    public async Task McpGetDebtsHistory_ReturnsSnapshotsPerAmountChange()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var debt = await mcp.CreateDebt("Car loan", "Loan", 10000);
        await mcp.UpdateDebt(debt.Id, "Car loan", "Loan", 8000);
        // Same amount → no extra snapshot.
        await mcp.UpdateDebt(debt.Id, "Car loan", "Loan", 8000);

        var history = JsonSerializer.SerializeToElement(await mcp.GetDebtsHistory(), WireJson.Mcp);
        Assert.Equal(2, history.GetArrayLength());
        Assert.Equal("Car loan", history[0].GetProperty("debtName").GetString());
        Assert.Equal(10000m, history[0].GetProperty("amount").GetDecimal());
        Assert.Equal(8000m, history[1].GetProperty("amount").GetDecimal());
    }

    // ---------- Phase 2: calendar ----------

    [Fact]
    public async Task McpGetEventCategoryEventCount_CountsOnlyThatCategory()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var work = await mcp.CreateEventCategory("Work", "#3B82F6");
        var personal = await mcp.CreateEventCategory("Personal", "#10B981");

        await mcp.CreateCalendarEvent("M1", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, work.Id, null);
        await mcp.CreateCalendarEvent("M2", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, work.Id, null);
        await mcp.CreateCalendarEvent("Gym", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, personal.Id, null);
        await mcp.CreateCalendarEvent("Walk", null, DateTime.UtcNow, DateTime.UtcNow.AddHours(1), false, null, null, null, null);

        Assert.Equal(2, await mcp.GetEventCategoryEventCount(work.Id));
        Assert.Equal(1, await mcp.GetEventCategoryEventCount(personal.Id));
        Assert.Equal(0, await mcp.GetEventCategoryEventCount(Guid.NewGuid()));
    }

    // ---------- Phase 2: storage ----------

    [Fact]
    public async Task McpGetStorageHistory_ReturnsTierHistoryForCurrentUser()
    {
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var adminDb = adminDbFixture.Context;

        // StorageTier is created first so its generated Id can back the user and history rows.
        var tier = new StorageTier { Name = "Pro", DiskLimitBytes = 10L * Constants.GigaByte };
        adminDb.Tiers.Add(tier);
        await adminDb.SaveChangesAsync();

        var user = new AppUser { Id = Guid.NewGuid(), Username = "testuser", IsAdmin = false, TierId = tier.Id };
        adminDb.Users.Add(user);
        adminDb.SubscriptionHistories.AddRange(
            new SubscriptionHistory { UserId = user.Id, TierId = tier.Id, StartedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), EndedAt = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc) },
            new SubscriptionHistory { UserId = user.Id, TierId = tier.Id, StartedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc) });
        await adminDb.SaveChangesAsync();

        using var db = CreateDb();
        var mcp = CreateMcp(db, adminDb);

        var history = await mcp.GetStorageHistory();

        Assert.Equal(2, history.Count);
        // Ordered by StartedAt descending, newest first.
        Assert.Equal(new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc), history[0].StartedAt);
        Assert.Null(history[0].EndedAt);
        Assert.Equal("Pro", history[0].TierName);
        Assert.Equal(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), history[1].StartedAt);
    }

    [Fact]
    public async Task McpGetStorageHistory_ReturnsEmptyWhenUserHasNoHistory()
    {
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var adminDb = adminDbFixture.Context;
        adminDb.Users.Add(new AppUser { Id = Guid.NewGuid(), Username = "testuser" });
        await adminDb.SaveChangesAsync();

        using var db = CreateDb();
        var mcp = CreateMcp(db, adminDb);

        Assert.Empty(await mcp.GetStorageHistory());
    }

    // ---------- Phase 3: assets ----------

    [Fact]
    public async Task McpGetAssets_IncludesCurrencyAndOrdersByOrder()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var usd = await mcp.CreateCurrency("USD", "US Dollar", "$");
        var a = await mcp.CreateAsset("Wallet", "Cash", 100, usd.Id);
        var b = await mcp.CreateAsset("Bank", "Bank Account", 5000, usd.Id);

        var assets = await mcp.GetAssets();
        Assert.Equal(2, assets.Count);
        Assert.Equal(new[] { "Wallet", "Bank" }, assets.Select(x => x.Name));
        Assert.NotNull(assets[0].Currency);
        Assert.Equal("USD", assets[0].Currency!.Code);
    }

    [Fact]
    public async Task McpCreateAsset_SetsOrderAndSnapshot()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var first = await mcp.CreateAsset("Cash", "Cash", 250);
        var second = await mcp.CreateAsset("Gold", "Commodity", 1000);

        Assert.Equal(1, first.Order);
        Assert.Equal(2, second.Order);
        Assert.Equal(2, await db.AssetSnapshots.CountAsync());
        Assert.Equal(250, await db.AssetSnapshots.Where(s => s.AssetId == first.Id).Select(s => s.Amount).SingleAsync());
    }

    [Fact]
    public async Task McpUpdateAsset_SnapshotsOnlyOnAmountChange()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var asset = await mcp.CreateAsset("Cash", "Cash", 500);

        var sameAmount = await mcp.UpdateAsset(asset.Id, "Cash wallet", "Cash", 500);
        Assert.NotNull(sameAmount);
        Assert.Equal("Cash wallet", sameAmount!.Name);
        Assert.Equal(1, await db.AssetSnapshots.CountAsync());

        var changed = await mcp.UpdateAsset(asset.Id, "Cash wallet", "Cash", 750);
        Assert.NotNull(changed);
        Assert.Equal(750, changed!.CurrentAmount);
        Assert.Equal(2, await db.AssetSnapshots.CountAsync());
    }

    [Fact]
    public async Task McpUpdateAsset_ReturnsNullForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.Null(await mcp.UpdateAsset(Guid.NewGuid(), "x", "Cash", 1));
    }

    [Fact]
    public async Task McpDeleteAsset_RemovesSnapshotsToo()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var asset = await mcp.CreateAsset("Cash", "Cash", 500);
        await mcp.UpdateAsset(asset.Id, "Cash", "Cash", 600);
        Assert.Equal(2, await db.AssetSnapshots.CountAsync());

        Assert.True(await mcp.DeleteAsset(asset.Id));
        Assert.Empty(await mcp.GetAssets());
        Assert.Equal(0, await db.AssetSnapshots.CountAsync());

        Assert.False(await mcp.DeleteAsset(asset.Id));
    }

    [Fact]
    public async Task McpReorderAssets_AppliesOrder()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var a = await mcp.CreateAsset("A", "Cash", 1);
        var b = await mcp.CreateAsset("B", "Cash", 2);
        var c = await mcp.CreateAsset("C", "Cash", 3);

        Assert.True(await mcp.ReorderAssets(new List<Guid> { c.Id, a.Id, b.Id }));

        var assets = await mcp.GetAssets();
        Assert.Equal(new[] { "C", "A", "B" }, assets.Select(x => x.Name));
    }

    [Fact]
    public async Task McpGetAssetsHistory_ReturnsSnapshotPerChange()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var asset = await mcp.CreateAsset("Cash", "Cash", 100);
        await mcp.UpdateAsset(asset.Id, "Cash", "Cash", 400);

        var history = JsonSerializer.SerializeToElement(await mcp.GetAssetsHistory(), WireJson.Mcp);
        Assert.Equal(2, history.GetArrayLength());
        Assert.Equal("Cash", history[0].GetProperty("assetName").GetString());
        Assert.Equal(100m, history[0].GetProperty("amount").GetDecimal());
        Assert.Equal(400m, history[1].GetProperty("amount").GetDecimal());
    }

    // ---------- Phase 4: whiteboards ----------

    [Fact]
    public async Task McpWhiteboardTools_Crud()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var created = await mcp.CreateWhiteboard("Roadmap", "🚀", "{\"records\":[]}", 1.5, 2.5, 1.0, false);
        Assert.NotNull(created);
        Assert.Equal("Roadmap", created!.Name);
        Assert.Equal("🚀", created.Icon);
        Assert.Equal("{\"records\":[]}", created.DocumentJson);
        Assert.False(created.IsMinimapOpen);

        var fetched = await mcp.GetWhiteboard(created.Id);
        Assert.NotNull(fetched);
        Assert.Equal("Roadmap", fetched!.Name);

        var updated = await mcp.UpdateWhiteboard(created.Id, name: "Roadmap v2", documentJson: "{\"records\":[1]}");
        Assert.NotNull(updated);
        Assert.Equal("Roadmap v2", updated!.Name);
        Assert.Equal("{\"records\":[1]}", updated.DocumentJson);
        // Unspecified fields survive.
        Assert.Equal("🚀", updated.Icon);
        Assert.Equal(1.5, updated.CameraX);

        var list = await mcp.GetWhiteboards();
        var summary = Assert.Single(list);
        Assert.Equal("Roadmap v2", summary.Name);

        Assert.True(await mcp.DeleteWhiteboard(created.Id));
        Assert.Null(await mcp.GetWhiteboard(created.Id));
    }

    [Fact]
    public async Task McpCreateWhiteboard_ReturnsNullForBlankName()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.Null(await mcp.CreateWhiteboard("   "));
        Assert.Empty(await mcp.GetWhiteboards());
    }

    [Fact]
    public async Task McpGetWhiteboards_OrdersByUpdatedAtDescendingAndOmitsDocument()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var old = await mcp.CreateWhiteboard("Old", documentJson: "{\"a\":1}");
        var recent = await mcp.CreateWhiteboard("Recent", documentJson: "{\"b\":2}");
        Assert.NotNull(old);
        Assert.NotNull(recent);

        db.Whiteboards.Single(w => w.Id == old!.Id).UpdatedAt = DateTime.UtcNow.AddHours(-2);
        db.Whiteboards.Single(w => w.Id == recent!.Id).UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var list = await mcp.GetWhiteboards();
        Assert.Equal(new[] { "Recent", "Old" }, list.Select(w => w.Name));

        // The summary projection has no canvas payload at all.
        var json = JsonSerializer.SerializeToElement(list[0], WireJson.Mcp);
        Assert.Equal("Recent", json.GetProperty("name").GetString());
        Assert.False(json.TryGetProperty("documentJson", out _));
    }

    [Fact]
    public async Task McpUpdateWhiteboard_ReturnsNullForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.Null(await mcp.UpdateWhiteboard(Guid.NewGuid(), name: "nope"));
    }

    // ---------- Phase 4: folders ----------

    [Fact]
    public async Task McpFolderTools_CreateRenameMoveDelete()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var root = await mcp.CreateFolder("Documents");
        var nested = await mcp.CreateFolder("Invoices", root.Id);
        Assert.Equal(root.Id, nested.ParentId);

        var renamed = await mcp.UpdateFolder(nested.Id, name: "Invoices 2026");
        Assert.NotNull(renamed);
        Assert.Equal("Invoices 2026", renamed!.Name);

        var moved = await mcp.UpdateFolder(nested.Id, parentId: null);
        Assert.NotNull(moved);
        Assert.Null(moved!.ParentId);

        Assert.True(await mcp.DeleteFolder(nested.Id));
        Assert.Null(await db.Folders.FindAsync(nested.Id));
        Assert.Equal(1, await db.Folders.CountAsync());
    }

    [Fact]
    public async Task McpDeleteFolder_ReturnsFalseForUnknownId()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.False(await mcp.DeleteFolder(4242));
    }

    // ---------- Phase 4: files ----------

    [Fact]
    public async Task McpFileTools_GetRenameMoveDelete()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var folder = await mcp.CreateFolder("Archive");
        var file = new FileItem { Name = "report.pdf", FileName = "abc123.pdf", Extension = ".pdf", MimeType = "application/pdf", SizeBytes = 1024 };
        db.FileItems.Add(file);
        await db.SaveChangesAsync();

        var fetched = await mcp.GetFile(file.Id);
        Assert.NotNull(fetched);
        Assert.Equal("report.pdf", fetched!.Name);

        var renamed = await mcp.UpdateFile(file.Id, name: "report-final.pdf", folderId: folder.Id);
        Assert.NotNull(renamed);
        Assert.Equal("report-final.pdf", renamed!.Name);
        Assert.Equal(folder.Id, renamed.FolderId);

        Assert.Null(await mcp.GetFile(9999));
        Assert.Null(await mcp.UpdateFile(9999, name: "x"));
    }

    // ---------- Phase 4: settings ----------

    [Fact]
    public async Task McpSettingsTools_RoundTrip()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        Assert.Empty(await mcp.GetSettings());

        Assert.True(await mcp.UpdateSetting("theme", "dark"));
        Assert.True(await mcp.UpdateSetting("locale", "en"));

        var settings = await mcp.GetSettings();
        Assert.Equal(2, settings.Count);
        Assert.Equal("dark", settings["theme"]);

        // Updating an existing key overwrites instead of duplicating.
        Assert.True(await mcp.UpdateSetting("theme", "light"));
        var updated = await mcp.GetSettings();
        Assert.Equal("light", updated["theme"]);
        Assert.Equal(2, await db.UserSettings.CountAsync());
    }

    // ---------- Phase 4: global search ----------

    [Fact]
    public async Task McpGlobalSearch_FindsAcrossAreasAndHonoursFilters()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        const string term = "ZynqParity";
        db.Thoughts.Add(new Thought { Content = $"a thought about {term}" });
        db.TaskItems.Add(new TaskItem { Title = $"{term} task" });
        db.Habits.Add(new Habit { Name = $"{term} habit" });
        await db.SaveChangesAsync();

        var all = await mcp.GlobalSearch(term);
        Assert.Equal(3, all.TotalCount);
        Assert.Equal(3, all.Results.Count);
        Assert.Contains(all.Results, r => r.Type == "thought");
        Assert.Contains(all.Results, r => r.Type == "task");
        Assert.Contains(all.Results, r => r.Type == "habit");

        var tasksOnly = await mcp.GlobalSearch(term, "tasks");
        Assert.Single(tasksOnly.Results);
        Assert.Equal("task", tasksOnly.Results[0].Type);
    }

    [Fact]
    public async Task McpGlobalSearch_EmptyQueryReturnsNothing()
    {
        using var db = CreateDb();
        var mcp = CreateMcp(db);

        var response = await mcp.GlobalSearch("   ");
        Assert.Empty(response.Results);
        Assert.Equal(0, response.TotalCount);
    }

    // ---------- Phase 4: share links ----------

    [Fact]
    public async Task McpShareTools_CreateListUpdateRevoke()
    {
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var adminDb = adminDbFixture.Context;
        adminDb.Users.Add(new AppUser { Id = Guid.NewGuid(), Username = "testuser" });
        await adminDb.SaveChangesAsync();

        using var db = CreateDb();
        var mcp = CreateMcp(db, adminDb);

        var folder = await mcp.CreateFolder("Shared stuff");
        var file = new FileItem { Name = "shared.txt", FileName = "shared-guid.txt" };
        db.FileItems.Add(file);
        await db.SaveChangesAsync();

        var folderShare = await mcp.CreateFolderShare(folder.Id, SharePermission.View);
        Assert.NotNull(folderShare);
        Assert.Equal(SharePermission.View, folderShare!.Permission);

        var fileShare = await mcp.CreateFileShare(file.Id, SharePermission.Edit);
        Assert.NotNull(fileShare);

        var shares = await mcp.ListShares();
        Assert.Equal(2, shares.Count);
        var listedFolder = shares.Single(s => s.Type == "folder");
        Assert.Equal("Shared stuff", listedFolder.Name);
        Assert.Equal(folder.Id, listedFolder.TargetId);
        var listedFile = shares.Single(s => s.Type == "file");
        Assert.Equal("shared.txt", listedFile.Name);

        // Re-sharing the same folder updates the existing link rather than adding one.
        var reshared = await mcp.CreateFolderShare(folder.Id, SharePermission.Edit);
        Assert.NotNull(reshared);
        Assert.Equal(folderShare.Token, reshared!.Token);
        Assert.Single(await mcp.ListShares(), s => s.Type == "folder");

        var bumped = await mcp.UpdateSharePermission(fileShare!.Token, SharePermission.View);
        Assert.NotNull(bumped);
        Assert.Equal(SharePermission.View, bumped!.Permission);

        Assert.True(await mcp.RevokeShare(fileShare.Token));
        Assert.Single(await mcp.ListShares());

        // Unknown targets are reported rather than silently created.
        Assert.Null(await mcp.CreateFolderShare(9999, SharePermission.View));
        Assert.Null(await mcp.CreateFileShare(9999, SharePermission.View));
        Assert.Null(await mcp.UpdateSharePermission("nope", SharePermission.View));
    }
}
