using System;
using System.IO;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace Sanad.Api.Tests;

/// <summary>
/// Goes through the real HTTP pipeline, so tenant routing (auth cookie -> username -> datastore folder ->
/// tenant database) is what keeps users apart, not the test setup.
/// </summary>
public class MultiTenantIsolationTests
{
    [Fact]
    public async Task Tasks_AreInvisibleAndUntouchable_ForOtherTenants()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SignupAsync("alice");
        await factory.SignupAsync("bob");
        using var alice = await factory.LoginAsync("alice");
        using var bob = await factory.LoginAsync("bob");

        var create = await alice.PostAsJsonAsync("/api/tasks", new { title = "Alice's secret task" });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());
        var taskId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var bobTasks = await bob.GetFromJsonAsync<JsonElement>("/api/tasks");
        Assert.Equal(0, bobTasks.GetArrayLength());

        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/tasks/{taskId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.PutAsJsonAsync($"/api/tasks/{taskId}", new { title = "hijacked" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync($"/api/tasks/{taskId}")).StatusCode);

        var aliceTask = await alice.GetFromJsonAsync<JsonElement>($"/api/tasks/{taskId}");
        Assert.Equal("Alice's secret task", aliceTask.GetProperty("task").GetProperty("title").GetString());
    }

    [Fact]
    public async Task EachTenant_GetsTheirOwnDatabaseFile_InsideTheDatastore()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SignupAsync("alice");
        await factory.SignupAsync("bob");
        using var alice = await factory.LoginAsync("alice");
        using var bob = await factory.LoginAsync("bob");

        Assert.Equal(HttpStatusCode.OK, (await alice.GetAsync("/api/tasks")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await bob.GetAsync("/api/tasks")).StatusCode);

        Assert.True(File.Exists(Path.Combine(factory.DatastorePath, "alice", "sanad.db")));
        Assert.True(File.Exists(Path.Combine(factory.DatastorePath, "bob", "sanad.db")));
    }

    [Fact]
    public async Task SameUsername_InSeparateApps_GetsItsOwnMigratedDatabase()
    {
        // Each app instance has its own data folder, so "alice" here is a brand-new database that must
        // be migrated even though another "alice" was already migrated in this process.
        for (var i = 0; i < 2; i++)
        {
            using var factory = new CustomWebApplicationFactory();
            await factory.SignupAsync("alice");
            using var alice = await factory.LoginAsync("alice");

            var response = await alice.PostAsJsonAsync("/api/tasks", new { title = $"Task {i}" });
            Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

            var tasks = await alice.GetFromJsonAsync<JsonElement>("/api/tasks");
            Assert.Equal(1, tasks.GetArrayLength());
        }
    }
}
