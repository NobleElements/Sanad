using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace Sanad.Api.Tests;

/// <summary>
/// End-to-end HTTP integration tests for Minimal API endpoints (Thoughts, Habits, Notebooks,
/// Finances, Goals). Exercises routing, model binding, auth middleware, and database persistence.
/// </summary>
public class HttpEndpointIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public HttpEndpointIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Thoughts_HttpCrud_LifecycleAndAuthorization()
    {
        // 1. Unauthenticated request rejected
        using var unauthClient = _factory.CreateCookielessClient();
        var unauthRes = await unauthClient.GetAsync("/api/thoughts");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthRes.StatusCode);

        // 2. Authenticated user
        const string user = "thought_tester";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        // Create thought
        var createRes = await client.PostAsJsonAsync("/api/thoughts", new { content = "Insight from HTTP test" });
        Assert.Equal(HttpStatusCode.OK, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var thoughtId = created.GetProperty("id").GetString()!;
        Assert.Equal("Insight from HTTP test", created.GetProperty("content").GetString());

        // List thoughts
        var listRes = await client.GetAsync("/api/thoughts");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var list = await listRes.Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.NotNull(list);
        Assert.Contains(list, t => t.GetProperty("id").GetString() == thoughtId);

        // Update thought
        var updateRes = await client.PutAsJsonAsync($"/api/thoughts/{thoughtId}", new { content = "Updated insight" });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updated = await updateRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Updated insight", updated.GetProperty("content").GetString());

        // Update non-existent thought returns 404
        var notFoundRes = await client.PutAsJsonAsync($"/api/thoughts/{Guid.NewGuid()}", new { content = "Ghost" });
        Assert.Equal(HttpStatusCode.NotFound, notFoundRes.StatusCode);

        // Delete thought
        var delRes = await client.DeleteAsync($"/api/thoughts/{thoughtId}");
        Assert.Equal(HttpStatusCode.NoContent, delRes.StatusCode);

        // Delete non-existent thought returns 404
        var delNotFound = await client.DeleteAsync($"/api/thoughts/{thoughtId}");
        Assert.Equal(HttpStatusCode.NotFound, delNotFound.StatusCode);
    }

    [Fact]
    public async Task Habits_HttpCrud_Lifecycle()
    {
        const string user = "habit_tester";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        // 1. Create habit
        var createRes = await client.PostAsJsonAsync("/api/habits", new
        {
            name = "Morning Stretch",
            icon = "activity",
            frequency = "daily"
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var habitId = created.GetProperty("id").GetString()!;
        Assert.Equal("Morning Stretch", created.GetProperty("name").GetString());

        // 2. List habits
        var listRes = await client.GetAsync("/api/habits");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var habits = await listRes.Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.NotNull(habits);
        Assert.Contains(habits, h => h.GetProperty("id").GetString() == habitId);

        // 3. Update habit
        var updateRes = await client.PutAsJsonAsync($"/api/habits/{habitId}", new
        {
            name = "Morning Yoga",
            icon = "sun",
            frequency = "daily"
        });
        Assert.Equal(HttpStatusCode.NoContent, updateRes.StatusCode);

        // 4. Toggle habit log
        var toggleRes = await client.PostAsJsonAsync($"/api/habits/{habitId}/toggle", new { date = "2026-10-08" });
        Assert.Equal(HttpStatusCode.OK, toggleRes.StatusCode);
        var log = await toggleRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.StartsWith("2026-10-08", log.GetProperty("date").GetString()!);

        // 5. Reorder habits
        var reorderRes = await client.PutAsJsonAsync("/api/habits/reorder", new { habitIds = new[] { habitId } });
        Assert.Equal(HttpStatusCode.NoContent, reorderRes.StatusCode);

        // 6. Delete habit
        var delRes = await client.DeleteAsync($"/api/habits/{habitId}");
        Assert.Equal(HttpStatusCode.NoContent, delRes.StatusCode);

        // 7. Delete non-existent returns 404
        var delMissing = await client.DeleteAsync($"/api/habits/{habitId}");
        Assert.Equal(HttpStatusCode.NotFound, delMissing.StatusCode);
    }

    [Fact]
    public async Task Notebooks_And_Notes_HttpCrud_Lifecycle()
    {
        const string user = "notebook_tester";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        // 1. Create notebook
        var nbRes = await client.PostAsJsonAsync("/api/notebooks", new { name = "Engineering", sortOrder = 1 });
        Assert.Equal(HttpStatusCode.Created, nbRes.StatusCode);
        var nb = await nbRes.Content.ReadFromJsonAsync<JsonElement>();
        var nbId = nb.GetProperty("id").GetGuid();
        Assert.Equal("Engineering", nb.GetProperty("name").GetString());

        // 2. List notebooks
        var listNbRes = await client.GetAsync("/api/notebooks");
        Assert.Equal(HttpStatusCode.OK, listNbRes.StatusCode);
        var notebooks = await listNbRes.Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.NotNull(notebooks);
        Assert.Contains(notebooks, n => n.GetProperty("id").GetGuid() == nbId);

        // 3. Rename notebook
        var renameRes = await client.PutAsJsonAsync($"/api/notebooks/{nbId}", new { name = "Software Engineering", sortOrder = 1 });
        Assert.Equal(HttpStatusCode.OK, renameRes.StatusCode);

        // 4. Create note in notebook
        var noteRes = await client.PostAsJsonAsync($"/api/notebooks/{nbId}/notes", new
        {
            title = "Architecture RFC",
            content = "<p>Clean Minimal APIs</p>"
        });
        Assert.Equal(HttpStatusCode.Created, noteRes.StatusCode);
        var note = await noteRes.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = note.GetProperty("id").GetGuid();
        Assert.Equal("Architecture RFC", note.GetProperty("title").GetString());

        // 5. Get notes for notebook
        var getNotesRes = await client.GetAsync($"/api/notebooks/{nbId}/notes");
        Assert.Equal(HttpStatusCode.OK, getNotesRes.StatusCode);
        var notesList = await getNotesRes.Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.NotNull(notesList);
        Assert.Contains(notesList, n => n.GetProperty("id").GetGuid() == noteId);

        // 6. Update note
        var updateNoteRes = await client.PutAsJsonAsync($"/api/notes/{noteId}", new
        {
            title = "Architecture RFC (Approved)",
            content = "<p>Ready for merge</p>"
        });
        Assert.Equal(HttpStatusCode.OK, updateNoteRes.StatusCode);

        // 7. Delete note
        var delNoteRes = await client.DeleteAsync($"/api/notes/{noteId}");
        Assert.Equal(HttpStatusCode.NoContent, delNoteRes.StatusCode);

        // 8. Delete notebook
        var delNbRes = await client.DeleteAsync($"/api/notebooks/{nbId}");
        Assert.Equal(HttpStatusCode.NoContent, delNbRes.StatusCode);
    }

    [Fact]
    public async Task Finances_HttpCrud_Lifecycle()
    {
        const string user = "finance_tester";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        // 1. Categories
        var catRes = await client.PostAsJsonAsync("/api/finances/categories", new
        {
            name = "Office Supplies",
            monthlyBudget = 250m,
            colorHex = "#336699"
        });
        Assert.Equal(HttpStatusCode.Created, catRes.StatusCode);
        var cat = await catRes.Content.ReadFromJsonAsync<JsonElement>();
        var catId = cat.GetProperty("id").GetGuid();

        // 2. Transactions
        var txDate = new DateTime(2026, 4, 10, 0, 0, 0, DateTimeKind.Utc);
        var txRes = await client.PostAsJsonAsync("/api/finances/transactions", new
        {
            amount = 75m,
            categoryId = catId,
            type = "Expense",
            date = txDate,
            description = "Desk lamp"
        });
        Assert.Equal(HttpStatusCode.Created, txRes.StatusCode);
        var tx = await txRes.Content.ReadFromJsonAsync<JsonElement>();
        var txId = tx.GetProperty("id").GetGuid();

        // 3. Finance Summary
        var sumRes = await client.GetAsync("/api/finances/summary?month=4&year=2026");
        Assert.Equal(HttpStatusCode.OK, sumRes.StatusCode);
        var summary = await sumRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(75m, summary.GetProperty("totalSpent").GetDecimal());

        // 4. Delete transaction
        var delTxRes = await client.DeleteAsync($"/api/finances/transactions/{txId}");
        Assert.Equal(HttpStatusCode.NoContent, delTxRes.StatusCode);

        // 5. Assets CRUD
        var assetRes = await client.PostAsJsonAsync("/api/finances/assets", new
        {
            name = "Checking Account",
            type = "Bank",
            currentAmount = 2500m
        });
        Assert.Equal(HttpStatusCode.Created, assetRes.StatusCode);
        var asset = await assetRes.Content.ReadFromJsonAsync<JsonElement>();
        var assetId = asset.GetProperty("id").GetGuid();

        var listAssetsRes = await client.GetAsync("/api/finances/assets");
        Assert.Equal(HttpStatusCode.OK, listAssetsRes.StatusCode);

        var updateAssetRes = await client.PutAsJsonAsync($"/api/finances/assets/{assetId}", new
        {
            name = "Checking Account",
            type = "Bank",
            currentAmount = 3000m
        });
        Assert.Equal(HttpStatusCode.OK, updateAssetRes.StatusCode);

        var delAssetRes = await client.DeleteAsync($"/api/finances/assets/{assetId}");
        Assert.Equal(HttpStatusCode.NoContent, delAssetRes.StatusCode);

        // 6. Debts CRUD
        var debtRes = await client.PostAsJsonAsync("/api/finances/debts", new
        {
            name = "Student Loan",
            type = "Loan",
            currentAmount = 15000m
        });
        Assert.Equal(HttpStatusCode.Created, debtRes.StatusCode);
        var debt = await debtRes.Content.ReadFromJsonAsync<JsonElement>();
        var debtId = debt.GetProperty("id").GetGuid();

        var listDebtsRes = await client.GetAsync("/api/finances/debts");
        Assert.Equal(HttpStatusCode.OK, listDebtsRes.StatusCode);

        var delDebtRes = await client.DeleteAsync($"/api/finances/debts/{debtId}");
        Assert.Equal(HttpStatusCode.NoContent, delDebtRes.StatusCode);
    }

    [Fact]
    public async Task Goals_HttpCrud_Lifecycle()
    {
        const string user = "goal_tester";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        const string targetDate = "2026-10-08";

        // Initial goal get returns 204 NoContent
        var emptyRes = await client.GetAsync($"/api/goals/{targetDate}");
        Assert.Equal(HttpStatusCode.NoContent, emptyRes.StatusCode);

        // Set goal
        var setRes = await client.PutAsJsonAsync($"/api/goals/{targetDate}", new { goal = "Ship quality code" });
        Assert.Equal(HttpStatusCode.OK, setRes.StatusCode);
        var saved = await setRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Ship quality code", saved.GetProperty("goal").GetString());

        // Fetch goal
        var fetchRes = await client.GetAsync($"/api/goals/{targetDate}");
        Assert.Equal(HttpStatusCode.OK, fetchRes.StatusCode);
        var fetched = await fetchRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Ship quality code", fetched.GetProperty("goal").GetString());
    }
}
