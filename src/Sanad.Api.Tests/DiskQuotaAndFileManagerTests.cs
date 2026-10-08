using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class DiskQuotaAndFileManagerTests
{
    [Fact]
    public async Task CanUpload_EnforcesTierLimits_AndAdminsAreExempt()
    {
        using var adminDb = TestDbContextFactory.CreateInMemoryAdminDbContext();
        var quotaService = new DiskQuotaService(adminDb);

        var tier = new StorageTier { Name = "Basic", DiskLimitBytes = 1000 };
        adminDb.Tiers.Add(tier);

        var regularUser = new AppUser
        {
            Id = Guid.NewGuid(),
            Username = "regular",
            IsAdmin = false,
            TierId = tier.Id,
            Tier = tier,
            DiskUsed = 800
        };
        var adminUser = new AppUser
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            IsAdmin = true,
            TierId = tier.Id,
            DiskUsed = 9999999
        };
        adminDb.Users.AddRange(regularUser, adminUser);
        await adminDb.SaveChangesAsync();

        // 1. Regular user can upload if under limit (800 + 150 <= 1000)
        Assert.True(await quotaService.CanUploadAsync("regular", 150));

        // 2. Regular user rejected if exceeding limit (800 + 300 > 1000)
        Assert.False(await quotaService.CanUploadAsync("regular", 300));

        // 2b. The limit itself is inclusive: filling the quota exactly is allowed, one byte more is not
        Assert.True(await quotaService.CanUploadAsync("regular", 200));
        Assert.False(await quotaService.CanUploadAsync("regular", 201));

        // 3. Admin user is exempt from all limits
        Assert.True(await quotaService.CanUploadAsync("admin", 10_000_000));

        // 4. Non-existent user cannot upload
        Assert.False(await quotaService.CanUploadAsync("unknown_user", 10));
    }

    [Fact]
    public async Task CanUpload_UserWhoseTierRowIsMissing_IsRefused()
    {
        using var adminDb = TestDbContextFactory.CreateInMemoryAdminDbContext();
        var quotaService = new DiskQuotaService(adminDb);

        // TierId points at a tier that doesn't exist (SQLite's foreign key would reject this row outright)
        adminDb.Users.Add(new AppUser { Id = Guid.NewGuid(), Username = "tierless", TierId = 999, DiskUsed = 0 });
        await adminDb.SaveChangesAsync();
        adminDb.ChangeTracker.Clear();

        // Tier is a required relationship, so Include(u => u.Tier) is an inner join and the user isn't found
        // at all: uploads fail closed. The "default 1GB if no tier" fallback in CanUploadAsync is never reached.
        Assert.False(await quotaService.CanUploadAsync("tierless", 1));
    }

    [Fact]
    public async Task GetFolderContentsPaginated_SortsAndFiltersCorrectly()
    {
        using var sanadDb = TestDbContextFactory.CreateInMemorySanadDbContext();
        using var adminDb = TestDbContextFactory.CreateInMemoryAdminDbContext();
        var tenant = new TestTenantProvider();
        var fileManager = new FileManagerService(sanadDb, new NoOpFileStorageService(), new NoOpDiskQuotaService(adminDb), tenant);

        // Seed folders and files
        sanadDb.Folders.AddRange(
            new Folder { Id = 1, Name = "Alpha Folder", ParentId = null },
            new Folder { Id = 2, Name = "Beta Folder", ParentId = null },
            new Folder { Id = 3, Name = "Zeta Folder", ParentId = null }
        );
        sanadDb.FileItems.AddRange(
            new FileItem { Id = 10, Name = "Charlie Doc.txt", FileName = "f1.txt", FolderId = null, SizeBytes = 500 },
            new FileItem { Id = 20, Name = "Delta Report.pdf", FileName = "f2.pdf", FolderId = null, SizeBytes = 200 }
        );
        await sanadDb.SaveChangesAsync();

        // 1. Sort by name asc, page size 3 -> Returns first 3 folders: Alpha, Beta, Zeta
        var result1 = await fileManager.GetFolderContentsPaginatedAsync(null, 1, 3, null, "name", "asc");
        var json1 = JsonSerializer.SerializeToElement(result1);
        var folders1 = json1.GetProperty("Subfolders");
        var files1 = json1.GetProperty("Files");
        Assert.Equal(3, folders1.GetArrayLength());
        Assert.Equal(0, files1.GetArrayLength());
        Assert.Equal("Alpha Folder", folders1[0].GetProperty("Name").GetString());

        // 2. Page 2 (offset 3) -> Returns remaining 2 files: Charlie Doc, Delta Report
        var result2 = await fileManager.GetFolderContentsPaginatedAsync(null, 2, 3, null, "name", "asc");
        var json2 = JsonSerializer.SerializeToElement(result2);
        var files2 = json2.GetProperty("Files");
        Assert.Equal(2, files2.GetArrayLength());
        Assert.Equal("Charlie Doc.txt", files2[0].GetProperty("Name").GetString());

        // 3. Search is a case-insensitive substring match: "ETA" matches Beta and Zeta, not Alpha or Delta
        var searchResult = await fileManager.GetFolderContentsPaginatedAsync(null, 1, 10, "ETA", "name", "asc");
        var searchJson = JsonSerializer.SerializeToElement(searchResult);
        var matchedFolders = searchJson.GetProperty("Subfolders").EnumerateArray().Select(f => f.GetProperty("Name").GetString());
        Assert.Equal(new[] { "Beta Folder", "Zeta Folder" }, matchedFolders);
        Assert.Equal(0, searchJson.GetProperty("Files").GetArrayLength());

        // 4. Search applies to files too
        var fileSearch = JsonSerializer.SerializeToElement(await fileManager.GetFolderContentsPaginatedAsync(null, 1, 10, "doc", "name", "asc"));
        Assert.Equal(0, fileSearch.GetProperty("Subfolders").GetArrayLength());
        var matchedFiles = fileSearch.GetProperty("Files").EnumerateArray().Select(f => f.GetProperty("Name").GetString());
        Assert.Equal(new[] { "Charlie Doc.txt" }, matchedFiles);
    }
}
