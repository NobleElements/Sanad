using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Sanad.Api.Data;
using Sanad.Api.Services;

namespace Sanad.Api.Tests;

/// <summary>
/// Runs the real app against a private temp folder: its own admin database, and every user gets their
/// own tenant database through the app's normal datastore routing, so cross-tenant leaks are observable.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string DefaultPassword = "SecurePass123!";

    private readonly DisposableTempDirectory _dataDirectory = new();

    public string DataDirectory => _dataDirectory.Path;
    public string DatastorePath => Path.Combine(DataDirectory, "datastore");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("DataDirectory", DataDirectory);

        builder.ConfigureServices(services =>
        {
            // Background jobs aren't under test and would touch the databases on their own schedule.
            var backgroundJobs = services
                .Where(d => d.ServiceType == typeof(IHostedService)
                    && (d.ImplementationType == typeof(DiskUsageSyncService) || d.ImplementationType == typeof(SubscriptionCleanupService)))
                .ToList();
            foreach (var job in backgroundJobs) services.Remove(job);
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        // The seeded datastores point at "Data" relative to the working directory, which every test
        // run would share. Point them into this factory's folder instead.
        using var scope = host.Services.CreateScope();
        var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        foreach (var datastore in adminDb.Datastores)
        {
            datastore.Path = DatastorePath;
        }
        adminDb.SaveChanges();

        return host;
    }

    /// <summary>A client that sends no cookies, so only explicit credentials (e.g. an API key) authenticate it.</summary>
    public HttpClient CreateCookielessClient() =>
        CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    /// <summary>Signs a user up without logging any client in, and returns the signup response body.</summary>
    public async Task<JsonElement> SignupAsync(string username, string password = DefaultPassword)
    {
        using var client = CreateCookielessClient();
        var response = await client.PostAsJsonAsync("/api/auth/signup", new { username, password });
        Assert.True(response.StatusCode == HttpStatusCode.OK, $"Signup of '{username}' failed: {await response.Content.ReadAsStringAsync()}");
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>Returns a fresh client logged in as the given user via the login endpoint.</summary>
    public async Task<HttpClient> LoginAsync(string username, string password = DefaultPassword)
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { username, password });
        Assert.True(response.StatusCode == HttpStatusCode.OK, $"Login of '{username}' failed: {await response.Content.ReadAsStringAsync()}");
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            // Pooled connections keep the SQLite files (and their -wal/-shm siblings) open.
            SqliteConnection.ClearAllPools();
            _dataDirectory.Dispose();
        }
    }
}
