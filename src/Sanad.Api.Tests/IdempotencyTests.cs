using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Sanad.Api.Middleware;
using Xunit;

namespace Sanad.Api.Tests;

public class IdempotencyTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public IdempotencyTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostTransaction_WithSameIdempotencyKey_OnlyCreatesOneTransaction()
    {
        const string user = "idemp_tx_user";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        var catRes = await client.PostAsJsonAsync("/api/finances/categories", new
        {
            name = "Groceries",
            monthlyBudget = 500m,
            colorHex = "#10B981"
        });
        Assert.Equal(HttpStatusCode.Created, catRes.StatusCode);
        var cat = await catRes.Content.ReadFromJsonAsync<JsonElement>();
        var categoryId = cat.GetProperty("id").GetString()!;

        var idempotencyKey = Guid.NewGuid().ToString();
        var txPayload = new
        {
            amount = 42.50m,
            categoryId,
            description = "Weekly groceries",
            type = "Expense",
            date = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc)
        };

        using var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/finances/transactions")
        {
            Content = JsonContent.Create(txPayload)
        };
        req1.Headers.Add(IdempotencyMiddleware.IdempotencyKeyHeader, idempotencyKey);

        var res1 = await client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
        Assert.False(res1.Headers.Contains(IdempotencyMiddleware.ReplayedHeader));
        var created1 = await res1.Content.ReadFromJsonAsync<JsonElement>();
        var txId1 = created1.GetProperty("id").GetString()!;

        // Simulate retry of the same request (e.g. slow or flaky network connection)
        using var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/finances/transactions")
        {
            Content = JsonContent.Create(txPayload)
        };
        req2.Headers.Add(IdempotencyMiddleware.IdempotencyKeyHeader, idempotencyKey);

        var res2 = await client.SendAsync(req2);
        Assert.Equal(HttpStatusCode.Created, res2.StatusCode);
        Assert.True(res2.Headers.Contains(IdempotencyMiddleware.ReplayedHeader));
        var created2 = await res2.Content.ReadFromJsonAsync<JsonElement>();
        var txId2 = created2.GetProperty("id").GetString()!;

        Assert.Equal(txId1, txId2);

        // Verify only a single transaction exists in the database
        var listRes = await client.GetAsync("/api/finances/transactions?month=10&year=2026&page=1&pageSize=15");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var listData = await listRes.Content.ReadFromJsonAsync<JsonElement>();
        var items = listData.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(txId1, items[0].GetProperty("id").GetString());
    }

    [Fact]
    public async Task PostTransaction_ConcurrentDuplicateRequests_OnlyCreatesOneTransaction()
    {
        const string user = "idemp_concurrent_user";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        var catRes = await client.PostAsJsonAsync("/api/finances/categories", new
        {
            name = "Dining",
            monthlyBudget = 300m,
            colorHex = "#F59E0B"
        });
        var cat = await catRes.Content.ReadFromJsonAsync<JsonElement>();
        var categoryId = cat.GetProperty("id").GetString()!;

        var idempotencyKey = Guid.NewGuid().ToString();
        var txPayload = new
        {
            amount = 19.99m,
            categoryId,
            description = "Lunch",
            type = "Expense",
            date = new DateTime(2026, 10, 16, 12, 0, 0, DateTimeKind.Utc)
        };

        var tasks = Enumerable.Range(0, 5).Select(async _ =>
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/finances/transactions")
            {
                Content = JsonContent.Create(txPayload)
            };
            req.Headers.Add(IdempotencyMiddleware.IdempotencyKeyHeader, idempotencyKey);
            return await client.SendAsync(req);
        });

        var responses = await Task.WhenAll(tasks);
        Assert.All(responses, r => Assert.Equal(HttpStatusCode.Created, r.StatusCode));

        var listRes = await client.GetAsync("/api/finances/transactions?month=10&year=2026&page=1&pageSize=15");
        var listData = await listRes.Content.ReadFromJsonAsync<JsonElement>();
        var items = listData.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
    }

    [Fact]
    public async Task PostThought_WithDifferentIdempotencyKeys_CreatesBothItems()
    {
        const string user = "idemp_diff_keys_user";
        await _factory.SignupAsync(user);
        using var client = await _factory.LoginAsync(user);

        for (int i = 0; i < 2; i++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/thoughts")
            {
                Content = JsonContent.Create(new { content = "Repeated intentional thought" })
            };
            req.Headers.Add(IdempotencyMiddleware.IdempotencyKeyHeader, Guid.NewGuid().ToString());
            var res = await client.SendAsync(req);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        var listRes = await client.GetAsync("/api/thoughts?page=1&pageSize=20");
        var thoughts = await listRes.Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.NotNull(thoughts);
        Assert.Equal(2, thoughts!.Count);
    }
}
