using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class ShareSecurityTests
{
    [Fact]
    public async Task ShareService_CreateUpdateRevoke_Works()
    {
        using var adminDb = TestDbContextFactory.CreateInMemoryAdminDbContext();
        using var sanadDb = TestDbContextFactory.CreateInMemorySanadDbContext();

        var user = new AppUser { Id = Guid.NewGuid(), Username = "sharer" };
        adminDb.Users.Add(user);
        await adminDb.SaveChangesAsync();

        var folder = new Folder { Id = 10, Name = "Public Assets" };
        var file = new FileItem { Id = 20, Name = "Invoice.pdf", FileName = "inv_123.pdf" };
        sanadDb.Folders.Add(folder);
        sanadDb.FileItems.Add(file);
        await sanadDb.SaveChangesAsync();

        var shareService = new ShareService(adminDb, sanadDb, new TestTenantProvider("sharer"));

        // 1. Create View-only folder share
        var folderLink = await shareService.CreateFolderShareAsync(folder.Id, SharePermission.View);
        Assert.NotNull(folderLink);
        Assert.Equal(SharePermission.View, folderLink!.Permission);
        Assert.Equal(folder.Id, folderLink.FolderId);

        // 2. Re-sharing updates permission in-place without duplicating
        var updatedFolderLink = await shareService.CreateFolderShareAsync(folder.Id, SharePermission.Edit);
        Assert.NotNull(updatedFolderLink);
        Assert.Equal(folderLink.Token, updatedFolderLink!.Token);
        Assert.Equal(SharePermission.Edit, updatedFolderLink.Permission);
        Assert.Equal(1, await adminDb.SharedLinks.CountAsync());

        // 3. Create file share
        var fileLink = await shareService.CreateFileShareAsync(file.Id, SharePermission.View);
        Assert.NotNull(fileLink);
        Assert.Equal(2, (await shareService.GetSharesAsync()).Count);

        // 4. Revoke share link
        var revoked = await shareService.RevokeShareAsync(folderLink.Token);
        Assert.True(revoked);
        Assert.Single(await shareService.GetSharesAsync());
    }

    [Fact]
    public async Task DeletePublicSharedFile_EnforcesEditPermission_RejectsViewOnly()
    {
        var services = new ServiceCollection();

        var adminDbName = Guid.NewGuid().ToString();
        var sanadDbName = Guid.NewGuid().ToString();

        services.AddDbContext<AdminDbContext>(options => options.UseInMemoryDatabase(databaseName: adminDbName));
        services.AddDbContext<SanadDbContext>(options => options.UseInMemoryDatabase(databaseName: sanadDbName));
        services.AddHttpContextAccessor();
        services.AddScoped<TenantProvider>();
        services.AddScoped<ITenantProvider>(sp => sp.GetRequiredService<TenantProvider>());
        services.AddScoped<FileStorageService, NoOpFileStorageService>();
        services.AddScoped<DiskQuotaService>(sp => new NoOpDiskQuotaService(sp.GetRequiredService<AdminDbContext>()));

        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        using var scope = scopeFactory.CreateScope();
        var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        var sanadDb = scope.ServiceProvider.GetRequiredService<SanadDbContext>();

        var user = new AppUser { Id = Guid.NewGuid(), Username = "owner" };
        adminDb.Users.Add(user);

        var file = new FileItem { Id = 100, Name = "Confidential.pdf", FileName = "phys.pdf" };
        sanadDb.FileItems.Add(file);
        await adminDb.SaveChangesAsync();
        await sanadDb.SaveChangesAsync();

        // 1. Create a View-only share link
        var viewLink = new SharedLink
        {
            UserId = user.Id,
            FileItemId = file.Id,
            Permission = SharePermission.View
        };
        adminDb.SharedLinks.Add(viewLink);
        await adminDb.SaveChangesAsync();

        // 2. Attempt to delete file using View-only token -> Must return 403 Forbid
        var viewDeleteResult = await ShareEndpoints.DeletePublicSharedFile(viewLink.Token, adminDb, scopeFactory);
        Assert.IsType<ForbidHttpResult>(viewDeleteResult);
        // The handler works in its own scope, so look past this context's tracked copy
        sanadDb.ChangeTracker.Clear();
        Assert.NotNull(await sanadDb.FileItems.FindAsync(file.Id)); // File was NOT deleted

        // 3. Upgrade link permission to Edit
        viewLink.Permission = SharePermission.Edit;
        await adminDb.SaveChangesAsync();

        // 4. Attempt to delete file using Edit token -> Must succeed with NoContent (204)
        var editDeleteResult = await ShareEndpoints.DeletePublicSharedFile(viewLink.Token, adminDb, scopeFactory);
        Assert.IsType<NoContent>(editDeleteResult);

        sanadDb.ChangeTracker.Clear();
        adminDb.ChangeTracker.Clear();

        Assert.Null(await sanadDb.FileItems.FindAsync(file.Id)); // File was successfully deleted
        Assert.Null(await adminDb.SharedLinks.FindAsync(viewLink.Id)); // SharedLink was removed

        // 5. Attempt with unknown / revoked token -> Must return 404 NotFound
        var unknownResult = await ShareEndpoints.DeletePublicSharedFile("unknown-token", adminDb, scopeFactory);
        Assert.IsType<NotFound>(unknownResult);
    }

    [Fact]
    public async Task RevokeShare_ReturnsFalseAndKeepsLink_ForUnknownOrAnotherUsersToken()
    {
        using var adminDb = TestDbContextFactory.CreateInMemoryAdminDbContext();
        using var sanadDb = TestDbContextFactory.CreateInMemorySanadDbContext();

        var owner = new AppUser { Id = Guid.NewGuid(), Username = "owner" };
        adminDb.Users.AddRange(owner, new AppUser { Id = Guid.NewGuid(), Username = "intruder" });
        var link = new SharedLink { UserId = owner.Id, FolderId = 1, Permission = SharePermission.View };
        adminDb.SharedLinks.Add(link);
        await adminDb.SaveChangesAsync();

        var intruderService = new ShareService(adminDb, sanadDb, new TestTenantProvider("intruder"));
        Assert.False(await intruderService.RevokeShareAsync(link.Token));
        Assert.Null(await intruderService.UpdateSharePermissionAsync(link.Token, SharePermission.Edit));

        var ownerService = new ShareService(adminDb, sanadDb, new TestTenantProvider("owner"));
        Assert.False(await ownerService.RevokeShareAsync("unknown-token"));

        adminDb.ChangeTracker.Clear();
        var stored = await adminDb.SharedLinks.SingleAsync();
        Assert.Equal(SharePermission.View, stored.Permission);

        Assert.True(await ownerService.RevokeShareAsync(link.Token));
        adminDb.ChangeTracker.Clear();
        Assert.Empty(await adminDb.SharedLinks.ToListAsync());
    }

    [Fact]
    public async Task PublicFolderLink_CannotReachFilesOutsideItsFolder()
    {
        using var host = await PublicShareHost.CreateAsync();
        var shared = await host.AddFileAsync(host.SharedFolderId, "shared.txt");
        var outside = await host.AddFileAsync(host.OtherFolderId, "private.txt");
        var token = await host.AddFolderLinkAsync(host.SharedFolderId, SharePermission.Edit);

        Assert.IsType<PhysicalFileHttpResult>(await ShareEndpoints.DownloadFileFromPublicFolder(token, shared.Id, host.AdminDb, host.ScopeFactory));
        Assert.IsType<NotFound>(await ShareEndpoints.DownloadFileFromPublicFolder(token, outside.Id, host.AdminDb, host.ScopeFactory));
        Assert.IsType<NotFound>(await ShareEndpoints.DeleteFileFromPublicFolder(token, outside.Id, host.AdminDb, host.ScopeFactory));

        host.SanadDb.ChangeTracker.Clear();
        Assert.NotNull(await host.SanadDb.FileItems.FindAsync(outside.Id));
        Assert.True(File.Exists(host.StoragePath(outside.FileName)));
    }

    [Fact]
    public async Task RevokedLink_ReturnsNotFoundOnPublicEndpoints()
    {
        using var host = await PublicShareHost.CreateAsync();
        var file = await host.AddFileAsync(host.SharedFolderId, "shared.txt");
        var token = await host.AddFolderLinkAsync(host.SharedFolderId, SharePermission.Edit);

        var ownerService = new ShareService(host.AdminDb, host.SanadDb, new TestTenantProvider(PublicShareHost.Owner));
        Assert.True(await ownerService.RevokeShareAsync(token));

        Assert.IsType<NotFound>(await ShareEndpoints.GetPublicShareDetails(token, host.AdminDb, host.ScopeFactory));
        Assert.IsType<NotFound>(await ShareEndpoints.DownloadPublicShare(token, host.AdminDb, host.ScopeFactory));
        Assert.IsType<NotFound>(await ShareEndpoints.DownloadFileFromPublicFolder(token, file.Id, host.AdminDb, host.ScopeFactory));
        Assert.IsType<NotFound>(await ShareEndpoints.DeleteFileFromPublicFolder(token, file.Id, host.AdminDb, host.ScopeFactory));
    }

    [Fact]
    public async Task PublicUploadSession_CanOnlyBeContinuedByTheLinkThatStartedIt()
    {
        using var host = await PublicShareHost.CreateAsync();
        var tokenA = await host.AddFolderLinkAsync(host.SharedFolderId, SharePermission.Edit);
        var tokenB = await host.AddFolderLinkAsync(host.OtherFolderId, SharePermission.Edit);

        var uploadId = await StartUploadAsync(host, tokenA, "a.txt", sizeBytes: 3);

        Assert.IsType<NotFound<string>>(await ShareEndpoints.ChunkPublicUpload(tokenB, uploadId, ChunkRequest(new byte[] { 1, 2, 3 }), host.AdminDb, host.ScopeFactory));
        Assert.IsType<NotFound<string>>(await ShareEndpoints.CompletePublicUpload(tokenB, uploadId, host.AdminDb, host.ScopeFactory));

        var chunk = await ShareEndpoints.ChunkPublicUpload(tokenA, uploadId, ChunkRequest(new byte[] { 1, 2, 3 }), host.AdminDb, host.ScopeFactory);
        Assert.Equal(StatusCodes.Status200OK, Assert.IsAssignableFrom<IStatusCodeHttpResult>(chunk).StatusCode);
        Assert.IsType<Ok<FileItem>>(await ShareEndpoints.CompletePublicUpload(tokenA, uploadId, host.AdminDb, host.ScopeFactory));

        host.SanadDb.ChangeTracker.Clear();
        var uploaded = await host.SanadDb.FileItems.SingleAsync(f => f.Name == "a.txt");
        Assert.Equal(host.SharedFolderId, uploaded.FolderId);
    }

    [Fact]
    public async Task PublicUploadChunk_RequiresContentLength_SoTheSizeLimitCannotBeBypassed()
    {
        using var host = await PublicShareHost.CreateAsync();
        var token = await host.AddFolderLinkAsync(host.SharedFolderId, SharePermission.Edit);

        var uploadId = await StartUploadAsync(host, token, "a.txt", sizeBytes: 3);

        var request = ChunkRequest(new byte[1024]);
        request.ContentLength = null; // e.g. Transfer-Encoding: chunked

        var result = await ShareEndpoints.ChunkPublicUpload(token, uploadId, request, host.AdminDb, host.ScopeFactory);
        Assert.Equal(StatusCodes.Status411LengthRequired, Assert.IsType<StatusCodeHttpResult>(result).StatusCode);

        var tooLarge = await ShareEndpoints.ChunkPublicUpload(token, uploadId, ChunkRequest(new byte[4]), host.AdminDb, host.ScopeFactory);
        Assert.IsType<BadRequest<string>>(tooLarge);
    }

    private static async Task<string> StartUploadAsync(PublicShareHost host, string token, string name, long sizeBytes)
    {
        var result = await ShareEndpoints.InitPublicUpload(token, new InitUploadRequest { Name = name, SizeBytes = sizeBytes, MimeType = "text/plain" }, host.AdminDb, host.ScopeFactory);
        var value = Assert.IsAssignableFrom<IValueHttpResult>(result).Value;
        Assert.True(Assert.IsAssignableFrom<IStatusCodeHttpResult>(result).StatusCode == StatusCodes.Status200OK, $"Upload init failed: {value}");
        return (string)value!.GetType().GetProperty("UploadId")!.GetValue(value)!;
    }

    private static HttpRequest ChunkRequest(byte[] body)
    {
        var context = new DefaultHttpContext();
        context.Request.Body = new MemoryStream(body);
        context.Request.ContentLength = body.Length;
        return context.Request;
    }

    /// <summary>
    /// Real TenantProvider, FileStorageService and DiskQuotaService over InMemory databases, with the
    /// owner's datastore in a temp folder so public share handlers can be called directly.
    /// </summary>
    private sealed class PublicShareHost : IDisposable
    {
        public const string Owner = "share_owner";
        public int SharedFolderId => 10;
        public int OtherFolderId => 11;

        private readonly DisposableTempDirectory _datastore = new();
        private readonly ServiceProvider _services;
        private readonly IServiceScope _scope;

        public IServiceScopeFactory ScopeFactory { get; }
        public AdminDbContext AdminDb { get; }
        public SanadDbContext SanadDb { get; }
        public Guid OwnerId { get; } = Guid.NewGuid();

        private PublicShareHost()
        {
            var adminDbName = Guid.NewGuid().ToString();
            var sanadDbName = Guid.NewGuid().ToString();
            var services = new ServiceCollection();
            services.AddDbContext<AdminDbContext>(options => options.UseInMemoryDatabase(adminDbName));
            services.AddDbContext<SanadDbContext>(options => options.UseInMemoryDatabase(sanadDbName));
            services.AddHttpContextAccessor();
            services.AddScoped<TenantProvider>();
            services.AddScoped<ITenantProvider>(sp => sp.GetRequiredService<TenantProvider>());
            services.AddScoped(sp => new FileStorageService(null!, sp.GetRequiredService<ITenantProvider>()));
            services.AddScoped<DiskQuotaService>();

            _services = services.BuildServiceProvider();
            ScopeFactory = _services.GetRequiredService<IServiceScopeFactory>();
            _scope = ScopeFactory.CreateScope();
            AdminDb = _scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            SanadDb = _scope.ServiceProvider.GetRequiredService<SanadDbContext>();
        }

        public static async Task<PublicShareHost> CreateAsync()
        {
            var host = new PublicShareHost();
            var datastore = new Datastore { Id = 1, Name = "Test", Path = host._datastore.Path, IsDefault = true };
            host.AdminDb.Datastores.Add(datastore);
            // TierId is a required FK, so quota lookups (which Include the tier) skip users without one.
            var tier = new StorageTier { Id = 1, Name = "Free", DiskLimitBytes = 1024 * 1024 };
            host.AdminDb.Users.Add(new AppUser { Id = host.OwnerId, Username = Owner, Datastore = datastore, Tier = tier });
            await host.AdminDb.SaveChangesAsync();

            host.SanadDb.Folders.AddRange(new Folder { Id = 10, Name = "Shared" }, new Folder { Id = 11, Name = "Private" });
            await host.SanadDb.SaveChangesAsync();
            Directory.CreateDirectory(host.StoragePath(""));
            return host;
        }

        public string StoragePath(string fileName) => Path.Combine(_datastore.Path, Owner, "files", fileName);

        public async Task<FileItem> AddFileAsync(int folderId, string name)
        {
            var file = new FileItem { Name = name, FileName = Guid.NewGuid().ToString("N") + ".txt", FolderId = folderId, MimeType = "text/plain" };
            await File.WriteAllTextAsync(StoragePath(file.FileName), name);
            SanadDb.FileItems.Add(file);
            await SanadDb.SaveChangesAsync();
            return file;
        }

        public async Task<string> AddFolderLinkAsync(int folderId, SharePermission permission)
        {
            var link = new SharedLink { UserId = OwnerId, FolderId = folderId, Permission = permission };
            AdminDb.SharedLinks.Add(link);
            await AdminDb.SaveChangesAsync();
            return link.Token;
        }

        public void Dispose()
        {
            _scope.Dispose();
            _services.Dispose();
            _datastore.Dispose();
        }
    }
}
