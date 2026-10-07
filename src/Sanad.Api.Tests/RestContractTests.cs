using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

/// <summary>
/// Guards the contract of the REST handlers that were rewired to domain services during
/// the MCP parity work. These assert the exact result types and JSON property names so an
/// accidental change to a response shape fails loudly.
/// </summary>
public class RestContractTests
{
    private class DummyTenantProvider : ITenantProvider
    {
        public string Username { get; init; } = "testuser";
        public string GetUsername() => Username;
        public Guid GetTenantId() => Guid.Empty;
        public string GetConnectionString() => "";
        public string GetTenantBasePath() => "/tmp/dummy_tenant";
    }

    private static SanadDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new SanadDbContext(options);
    }

    private static ISearchService Search(SanadDbContext db) => new SearchService(db);
    private static ISettingsService Settings(SanadDbContext db) => new SettingsService(db);
    private static IWhiteboardService Whiteboards(SanadDbContext db) => new WhiteboardService(db);

    // ---------- Assets ----------

    [Fact]
    public async Task Assets_RestResultTypesUnchanged()
    {
        using var db = CreateDb();
        var svc = new AssetService(db);

        var created = await AssetEndpoints.CreateAsset(svc, new Asset { Name = "Cash", Type = "Cash", CurrentAmount = 100 });
        Assert.IsType<Created<Asset>>(created);

        var listed = await AssetEndpoints.GetAssets(svc);
        Assert.IsType<Ok<List<Asset>>>(listed);

        var updated = await AssetEndpoints.UpdateAsset(svc, db.Assets.Single().Id, new Asset { Name = "Cash", Type = "Cash", CurrentAmount = 200 });
        Assert.IsType<Ok<Asset>>(updated);

        Assert.IsType<NotFound>(await AssetEndpoints.UpdateAsset(svc, Guid.NewGuid(), new Asset { Name = "x", Type = "Cash" }));

        var reordered = await AssetEndpoints.ReorderAssets(svc, new List<Guid> { db.Assets.Single().Id });
        Assert.IsType<Ok>(reordered);

        var history = await AssetEndpoints.GetAssetsHistory(svc);
        Assert.IsType<Ok<object>>(history);

        var deleted = await AssetEndpoints.DeleteAsset(svc, db.Assets.Single().Id);
        Assert.IsType<NoContent>(deleted);
        Assert.IsType<NotFound>(await AssetEndpoints.DeleteAsset(svc, Guid.NewGuid()));
    }

    // ---------- Storage history ----------

    [Fact]
    public async Task StorageHistory_RestShapeUnchanged()
    {
        var adminOptions = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        using var adminDb = new AdminDbContext(adminOptions);

        var tier = new StorageTier { Name = "Pro", DiskLimitBytes = 1024 };
        adminDb.Tiers.Add(tier);
        await adminDb.SaveChangesAsync();

        var user = new AppUser { Id = Guid.NewGuid(), Username = "testuser", TierId = tier.Id };
        adminDb.Users.Add(user);
        adminDb.SubscriptionHistories.Add(new SubscriptionHistory
        {
            UserId = user.Id,
            TierId = tier.Id,
            StartedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndedAt = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc)
        });
        await adminDb.SaveChangesAsync();

        var svc = new StorageService(adminDb, new DiskQuotaService(adminDb));
        var history = await svc.GetStorageHistoryAsync("testuser");

        Assert.NotNull(history);
        var entry = Assert.Single(history!);
        Assert.Equal("Pro", entry.TierName);
        Assert.Equal(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), entry.StartedAt);
        Assert.Equal(new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc), entry.EndedAt);

        Assert.Null(await svc.GetStorageHistoryAsync("nobody"));
    }

    // ---------- Search ----------

    [Fact]
    public async Task Search_RestReturnsSameResponseShape()
    {
        using var db = CreateDb();
        db.Thoughts.Add(new Thought { Content = "Findable thought" });
        await db.SaveChangesAsync();

        var result = await SearchEndpoints.HandleSearch(Search(db), "Findable", null, null);

        var ok = Assert.IsType<Ok<SearchResponse>>(result);
        var response = ok.Value!;
        Assert.Equal(1, response.TotalCount);

        var item = Assert.Single(response.Results);
        // Property names the frontend's search page relies on.
        var json = JsonSerializer.SerializeToElement(item);
        foreach (var property in new[] { "Id", "Type", "Category", "Title", "Snippet", "Url", "Icon" })
        {
            Assert.True(json.TryGetProperty(property, out _), $"missing {property}");
        }
        Assert.Equal("thought", item.Type);
    }

    [Fact]
    public async Task Search_RestTypeFilterAndLimitStillApply()
    {
        using var db = CreateDb();
        for (var i = 0; i < 5; i++) db.TaskItems.Add(new TaskItem { Title = $"Alpha task {i}" });
        db.Thoughts.Add(new Thought { Content = "Alpha thought" });
        await db.SaveChangesAsync();

        var tasksOnly = Assert.IsType<Ok<SearchResponse>>(await SearchEndpoints.HandleSearch(Search(db), "Alpha", "tasks", null));
        Assert.Equal(5, tasksOnly.Value!.Results.Count);
        Assert.All(tasksOnly.Value.Results, r => Assert.Equal("task", r.Type));

        var limited = Assert.IsType<Ok<SearchResponse>>(await SearchEndpoints.HandleSearch(Search(db), "Alpha", null, 2));
        Assert.Equal(2, limited.Value!.Results.Count(r => r.Type == "task"));

        var empty = Assert.IsType<Ok<SearchResponse>>(await SearchEndpoints.HandleSearch(Search(db), "  ", null, null));
        Assert.Empty(empty.Value!.Results);
    }

    // ---------- Settings ----------

    [Fact]
    public async Task Settings_RoundTrip()
    {
        using var db = CreateDb();
        var svc = Settings(db);

        Assert.Empty(await svc.GetSettingsAsync());

        await svc.SetSettingAsync("theme", "dark");
        await svc.SetSettingAsync("theme", "light");
        await svc.SetSettingAsync("locale", "en");

        var settings = await svc.GetSettingsAsync();
        Assert.Equal(2, settings.Count);
        Assert.Equal("light", settings["theme"]);
        Assert.Equal("en", settings["locale"]);
    }

    // ---------- Whiteboards ----------

    [Fact]
    public async Task Whiteboards_RestResultTypesUnchanged()
    {
        using var db = CreateDb();
        var svc = Whiteboards(db);

        var created = await svc.CreateWhiteboardAsync(new CreateWhiteboardRequest("Board", null, "{\"records\":[]}"));
        Assert.NotNull(created);
        Assert.Equal("🎨", created!.Icon);
        Assert.True(created.IsMinimapOpen);

        // Blank names are rejected by the handler as a 400.
        Assert.Null(await svc.CreateWhiteboardAsync(new CreateWhiteboardRequest("  ", null, null)));

        var summaries = await svc.GetWhiteboardsAsync();
        var summary = Assert.Single(summaries);
        Assert.Equal("Board", summary.Name);

        var updated = await svc.UpdateWhiteboardAsync(created.Id, new UpdateWhiteboardRequest(Name: "Renamed"));
        Assert.NotNull(updated);
        Assert.Equal("Renamed", updated!.Name);
        Assert.Equal("{\"records\":[]}", updated.DocumentJson);

        Assert.Null(await svc.UpdateWhiteboardAsync(Guid.NewGuid(), new UpdateWhiteboardRequest(Name: "x")));

        Assert.True(await svc.DeleteWhiteboardAsync(created.Id));
        Assert.False(await svc.DeleteWhiteboardAsync(created.Id));
    }

    // ---------- Share links ----------

    [Fact]
    public async Task ShareLinks_RestListShapeUnchanged()
    {
        var adminOptions = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        using var adminDb = new AdminDbContext(adminOptions);
        adminDb.Users.Add(new AppUser { Id = Guid.NewGuid(), Username = "testuser" });
        await adminDb.SaveChangesAsync();

        using var db = CreateDb();
        var folder = new Folder { Name = "Docs" };
        var file = new FileItem { Name = "notes.txt", FileName = "notes-guid.txt" };
        db.Folders.Add(folder);
        db.FileItems.Add(file);
        await db.SaveChangesAsync();

        var svc = new ShareService(adminDb, db, new DummyTenantProvider());

        var folderLink = await svc.CreateFolderShareAsync(folder.Id, SharePermission.View);
        Assert.NotNull(folderLink);
        var fileLink = await svc.CreateFileShareAsync(file.Id, SharePermission.Edit);
        Assert.NotNull(fileLink);

        // Missing targets and users must not silently create links.
        Assert.Null(await svc.CreateFolderShareAsync(9999, SharePermission.View));
        Assert.Null(await svc.CreateFileShareAsync(9999, SharePermission.View));

        var shares = await svc.GetSharesAsync();
        Assert.Equal(2, shares.Count);

        // The REST handler projects these back to the original anonymous shape.
        var folderDto = shares.Single(s => s.Type == "folder");
        Assert.Equal("Docs", folderDto.Name);
        Assert.Equal(folder.Id, folderDto.TargetId);
        Assert.Equal(SharePermission.View, folderDto.Permission);
        Assert.Equal(folderLink!.Token, folderDto.Token);

        var fileDto = shares.Single(s => s.Type == "file");
        Assert.Equal("notes.txt", fileDto.Name);
        Assert.Equal(SharePermission.Edit, fileDto.Permission);

        // Re-sharing updates in place.
        var reshared = await svc.CreateFolderShareAsync(folder.Id, SharePermission.Edit);
        Assert.Equal(folderLink.Token, reshared!.Token);
        Assert.Equal(SharePermission.Edit, reshared.Permission);
        Assert.Equal(2, (await svc.GetSharesAsync()).Count);

        Assert.NotNull(await svc.UpdateSharePermissionAsync(fileLink!.Token, SharePermission.View));
        Assert.Null(await svc.UpdateSharePermissionAsync("unknown-token", SharePermission.View));

        Assert.True(await svc.RevokeShareAsync(fileLink.Token));
        Assert.Single(await svc.GetSharesAsync());
    }

    // ---------- Folders & files ----------

    [Fact]
    public async Task FoldersAndFiles_RestResultTypesUnchanged()
    {
        using var db = CreateDb();
        var tenant = new DummyTenantProvider();
        var adminOptions = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        using var adminDb = new AdminDbContext(adminOptions);

        var fileManager = new FileManagerService(db, new FakeStorage(), new NoOpQuota(adminDb), tenant);

        var folder = await fileManager.CreateFolderAsync("Docs");
        Assert.Equal("Docs", folder.Name);

        var renamed = await fileManager.UpdateFolderAsync(folder.Id, "Docs 2026", null, moveParent: false);
        Assert.NotNull(renamed);
        Assert.Equal("Docs 2026", renamed!.Name);

        Assert.Null(await fileManager.UpdateFolderAsync(9999, "x", null, false));

        var file = new FileItem { Name = "a.txt", FileName = "phys-a.txt" };
        db.FileItems.Add(file);
        await db.SaveChangesAsync();

        var fetched = await fileManager.GetFileAsync(file.Id);
        Assert.NotNull(fetched);
        Assert.Equal("a.txt", fetched!.Name);

        var moved = await fileManager.UpdateFileAsync(file.Id, "b.txt", folder.Id, moveFolder: true);
        Assert.NotNull(moved);
        Assert.Equal("b.txt", moved!.Name);
        Assert.Equal(folder.Id, moved.FolderId);
        Assert.Null(await fileManager.UpdateFileAsync(9999, "x", null, false));

        // Deleting a file removes the row (quota refresh is stubbed).
        Assert.True(await fileManager.DeleteFileAsync(file.Id));
        Assert.Null(await fileManager.GetFileAsync(file.Id));
        Assert.False(await fileManager.DeleteFileAsync(file.Id));
    }

    private sealed class FakeStorage : FileStorageService
    {
        public FakeStorage() : base(null!, new DummyTenantProvider()) { }
        public override void DeleteFile(string fileName) { }
    }

    private sealed class NoOpQuota : DiskQuotaService
    {
        public NoOpQuota(AdminDbContext db) : base(db) { }
        public override Task UpdateDiskUsageAsync(string username) => Task.CompletedTask;
    }
}