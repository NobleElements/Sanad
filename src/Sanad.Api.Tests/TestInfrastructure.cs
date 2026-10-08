using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;

namespace Sanad.Api.Tests;

/// <summary>
/// One folder per test run that every test file and directory lives under. It is deleted when the test
/// process exits, so anything a test forgets (or fails) to clean up doesn't pile up in the system temp folder.
/// </summary>
public static class TestTempRoot
{
    public static string Path { get; } = Create();

    public static string NewDirectoryPath() => System.IO.Path.Combine(Path, Guid.NewGuid().ToString("N"));

    private static string Create()
    {
        var runsRoot = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "sanad_tests");
        DeleteStaleRuns(runsRoot);

        var path = System.IO.Path.Combine(runsRoot, $"{Environment.ProcessId}_{Guid.NewGuid():N}");
        Directory.CreateDirectory(path);
        AppDomain.CurrentDomain.ProcessExit += (_, _) =>
        {
            SqliteConnection.ClearAllPools();
            TryDeleteDirectory(path);
        };
        return path;
    }

    // Runs killed before ProcessExit (debugger stop, crash) leave their folder behind.
    private static void DeleteStaleRuns(string runsRoot)
    {
        if (!Directory.Exists(runsRoot)) return;
        foreach (var dir in Directory.GetDirectories(runsRoot))
        {
            if (Directory.GetLastWriteTimeUtc(dir) < DateTime.UtcNow.AddHours(-12)) TryDeleteDirectory(dir);
        }
    }

    internal static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path)) Directory.Delete(path, recursive: true);
        }
        catch
        {
            // Best effort: a file may still be open on Windows.
        }
    }
}

/// <summary>
/// Reusable mock HTTP handler for inspecting and stubbing HTTP calls in tests.
/// </summary>
public class MockHttpMessageHandler : HttpMessageHandler
{
    public Func<HttpRequestMessage, HttpResponseMessage> Handler { get; set; } = _ => new HttpResponseMessage(HttpStatusCode.OK);
    public Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>>? AsyncHandler { get; set; }
    public List<HttpRequestMessage> RecordedRequests { get; } = new();

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        RecordedRequests.Add(request);
        if (AsyncHandler != null)
        {
            return await AsyncHandler(request, cancellationToken);
        }
        return Handler(request);
    }
}

/// <summary>
/// Reusable test tenant provider that avoids hardcoding and supports custom tenant contexts.
/// </summary>
public class TestTenantProvider : ITenantProvider
{
    public string Username { get; set; } = "testuser";
    public string ConnectionString { get; set; } = "";
    public string TenantBasePath { get; set; }

    public TestTenantProvider(string username = "testuser", string? tenantBasePath = null)
    {
        Username = username;
        TenantBasePath = tenantBasePath ?? TestTempRoot.NewDirectoryPath();
    }

    public string GetUsername() => Username;
    public string GetConnectionString() => ConnectionString;
    public string GetTenantBasePath() => TenantBasePath;
}

public class TestHttpContextAccessor : Microsoft.AspNetCore.Http.IHttpContextAccessor
{
    public Microsoft.AspNetCore.Http.HttpContext? HttpContext { get; set; }

    public TestHttpContextAccessor(Microsoft.AspNetCore.Http.HttpContext? context = null)
    {
        HttpContext = context;
    }
}

/// <summary>
/// A disposable directory under <see cref="TestTempRoot"/> ensuring test files never pollute the working tree.
/// </summary>
public sealed class DisposableTempDirectory : IDisposable
{
    public string Path { get; }

    public DisposableTempDirectory()
    {
        Path = TestTempRoot.NewDirectoryPath();
        Directory.CreateDirectory(Path);
    }

    public void Dispose() => TestTempRoot.TryDeleteDirectory(Path);
}

/// <summary>File storage that skips deleting from disk, for tests that only assert on database state.</summary>
public sealed class NoOpFileStorageService : FileStorageService
{
    public NoOpFileStorageService() : base(null!, new TestTenantProvider()) { }

    public override void DeleteFile(string fileName) { }
}

/// <summary>Disk quota service that skips recalculating usage from disk; upload limits still apply.</summary>
public sealed class NoOpDiskQuotaService : DiskQuotaService
{
    public NoOpDiskQuotaService(AdminDbContext? adminDb) : base(adminDb!) { }

    public override Task UpdateDiskUsageAsync(string username) => Task.CompletedTask;
}

/// <summary>
/// The JSON settings responses are really written with, so shape assertions check the wire format
/// (camelCase) instead of System.Text.Json's PascalCase defaults.
/// </summary>
public static class WireJson
{
    /// <summary>
    /// Minimal API responses: ASP.NET Core's web defaults plus the cycle handling Program.cs adds in
    /// ConfigureHttpJsonOptions. RestContractTests checks this still matches the running app.
    /// </summary>
    public static JsonSerializerOptions Http { get; } = new(new Microsoft.AspNetCore.Http.Json.JsonOptions().SerializerOptions)
    {
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    /// <summary>MCP tool results: the SDK serializes return values with its own defaults (WithTools gets no options).</summary>
    public static JsonSerializerOptions Mcp => ModelContextProtocol.McpJsonUtilities.DefaultOptions;
}

/// <summary>
/// Factory for generating isolated SQLite in-memory or EF in-memory database contexts.
/// </summary>
public static class TestDbContextFactory
{
    /// <summary>
    /// Legacy alias routed to real relational SQLite in-memory to prevent UseInMemoryDatabase issues.
    /// </summary>
    public static SanadDbContext CreateInMemorySanadDbContext() => CreateSqliteInMemorySanadDbContext().Context;

    /// <summary>
    /// Legacy alias routed to real relational SQLite in-memory to prevent UseInMemoryDatabase issues.
    /// </summary>
    public static AdminDbContext CreateInMemoryAdminDbContext() => CreateSqliteInMemoryAdminDbContext().Context;

    /// <summary>
    /// Creates a real relational SQLite in-memory context with foreign key enforcement and transactions.
    /// The returned SqliteConnection is tied to the context lifetime.
    /// </summary>
    public static (SanadDbContext Context, SqliteConnection Connection) CreateSqliteInMemorySanadDbContext()
    {
        var connection = new SqliteConnection("DataSource=:memory:;Foreign Keys=True;Pooling=False");
        connection.Open();

        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseSqlite(connection)
            .Options;

        var context = new SqliteSanadDbContext(options, connection);
        context.Database.EnsureCreated();
        return (context, connection);
    }

    public static (AdminDbContext Context, SqliteConnection Connection) CreateSqliteInMemoryAdminDbContext()
    {
        var connection = new SqliteConnection("DataSource=:memory:;Foreign Keys=True;Pooling=False");
        connection.Open();

        var options = new DbContextOptionsBuilder<AdminDbContext>()
            .UseSqlite(connection)
            .Options;

        var context = new SqliteAdminDbContext(options, connection);
        context.Database.EnsureCreated();

        if (!context.Datastores.Any())
        {
            context.Datastores.Add(new Datastore { Id = 1, Name = "Default", Path = "Data", IsDefault = true });
        }
        if (!context.Tiers.Any())
        {
            context.Tiers.AddRange(
                new StorageTier { Id = 1, Name = "Free", DiskLimitBytes = 1_000_000_000L, Price = 0m },
                new StorageTier { Id = 2, Name = "Supporter", DiskLimitBytes = 5_000_000_000L, Price = 1m },
                new StorageTier { Id = 3, Name = "Individual", DiskLimitBytes = 10_000_000_000L, Price = 3m },
                new StorageTier { Id = 4, Name = "Data Hoarder", DiskLimitBytes = 200_000_000_000L, Price = 12m }
            );
        }
        context.SaveChanges();
        context.ChangeTracker.Clear();

        return (context, connection);
    }

    public static SqliteInMemorySanadDb CreateSqliteSanadDb() => new();
    public static SqliteInMemoryAdminDb CreateSqliteAdminDb() => new();
}

public class SqliteSanadDbContext : SanadDbContext
{
    private readonly SqliteConnection _connection;

    public SqliteSanadDbContext(DbContextOptions<SanadDbContext> options, SqliteConnection connection) : base(options)
    {
        _connection = connection;
    }

    public override void Dispose()
    {
        base.Dispose();
        _connection.Dispose();
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _connection.DisposeAsync();
    }
}

public class SqliteAdminDbContext : AdminDbContext
{
    private readonly SqliteConnection _connection;

    public SqliteAdminDbContext(DbContextOptions<AdminDbContext> options, SqliteConnection connection) : base(options)
    {
        _connection = connection;
    }

    public override void Dispose()
    {
        base.Dispose();
        _connection.Dispose();
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _connection.DisposeAsync();
    }
}

public sealed class SqliteInMemorySanadDb : IDisposable
{
    public SanadDbContext Context { get; }
    public SqliteConnection Connection { get; }

    public SqliteInMemorySanadDb()
    {
        (Context, Connection) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
    }

    public void Dispose()
    {
        Context.Dispose();
        Connection.Dispose();
    }

    public static implicit operator SanadDbContext(SqliteInMemorySanadDb wrapper) => wrapper.Context;
}

public sealed class SqliteInMemoryAdminDb : IDisposable
{
    public AdminDbContext Context { get; }
    public SqliteConnection Connection { get; }

    public SqliteInMemoryAdminDb()
    {
        (Context, Connection) = TestDbContextFactory.CreateSqliteInMemoryAdminDbContext();
    }

    public void Dispose()
    {
        Context.Dispose();
        Connection.Dispose();
    }

    public static implicit operator AdminDbContext(SqliteInMemoryAdminDb wrapper) => wrapper.Context;
}
