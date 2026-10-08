using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Sanad.Api.Utils;
using Xunit;

namespace Sanad.Api.Tests;

public class UploadEndpointsTests
{
    [Fact]
    public void UploadHelper_ExtractImageUrls_ExtractsUrlsCorrectly()
    {
        // 1. Multiple images
        var html = @"<div>
            <p>Intro text</p>
            <img src=""/api/attachments/img1.png"" alt=""first"" />
            <p>Middle</p>
            <img src=""https://example.com/external.jpg"">
            <img SRC=""/api/attachments/IMG2.JPEG"" />
        </div>";

        var urls = UploadHelper.ExtractImageUrls(html);
        Assert.Equal(3, urls.Count);
        Assert.Equal("/api/attachments/img1.png", urls[0]);
        Assert.Equal("https://example.com/external.jpg", urls[1]);
        Assert.Equal("/api/attachments/IMG2.JPEG", urls[2]);

        // 2. Empty or null html
        Assert.Empty(UploadHelper.ExtractImageUrls(null));
        Assert.Empty(UploadHelper.ExtractImageUrls(""));
        Assert.Empty(UploadHelper.ExtractImageUrls("   "));

        // 3. HTML with no images
        Assert.Empty(UploadHelper.ExtractImageUrls("<p>Hello world without images</p>"));
    }

    [Fact]
    public void UploadHelper_GetAttachmentPathsFromHtml_FiltersOnlyLocalAttachments()
    {
        var html = @"<div>
            <img src=""/api/attachments/pic1.png"" />
            <img src=""https://external.com/pic2.png"" />
            <img src=""/api/attachments/pic3.jpg"" />
        </div>";

        using var tenantDir = new DisposableTempDirectory();
        var paths = UploadHelper.GetAttachmentPathsFromHtml(html, tenantDir.Path);
        Assert.Equal(2, paths.Count);

        var expectedPath1 = Path.GetFullPath(Path.Combine(tenantDir.Path, "attachments", "pic1.png"));
        var expectedPath2 = Path.GetFullPath(Path.Combine(tenantDir.Path, "attachments", "pic3.jpg"));

        Assert.Equal(expectedPath1, paths[0]);
        Assert.Equal(expectedPath2, paths[1]);
    }

    [Theory]
    [InlineData("/api/attachments/../../other_user/sanad.db")]
    [InlineData("/api/attachments/../secret.txt")]
    [InlineData("/api/attachments/..")]
    [InlineData("/api/attachments/sub/file.png")]
    [InlineData("/api/attachments/")]
    [InlineData("/attachments/../../other_user/sanad.db")]
    public void UploadHelper_ResolveAttachmentPath_RejectsNamesOutsideAttachmentsFolder(string url)
    {
        using var tenantDir = new DisposableTempDirectory();

        Assert.Null(UploadHelper.ResolveAttachmentPath(url, tenantDir.Path));
        Assert.Empty(UploadHelper.GetAttachmentPathsFromHtml($"<img src=\"{url}\" />", tenantDir.Path));
    }

    [Theory]
    [InlineData("/api/attachments/pic.png")]
    [InlineData("/attachments/pic.png")]
    [InlineData("pic.png")]
    public void UploadHelper_ResolveAttachmentPath_AcceptsAllStoredUrlFormats(string url)
    {
        using var tenantDir = new DisposableTempDirectory();

        var expected = Path.GetFullPath(Path.Combine(tenantDir.Path, "attachments", "pic.png"));
        Assert.Equal(expected, UploadHelper.ResolveAttachmentPath(url, tenantDir.Path));
    }

    [Fact]
    public void UploadHelper_DeleteFiles_RemovesExistingFilesSafely()
    {
        using var tempDir = new DisposableTempDirectory();
        var file1 = Path.Combine(tempDir.Path, "file1.txt");
        var file2 = Path.Combine(tempDir.Path, "file2.txt");
        var nonExistent = Path.Combine(tempDir.Path, "missing.txt");

        File.WriteAllText(file1, "content1");
        File.WriteAllText(file2, "content2");

        Assert.True(File.Exists(file1));
        Assert.True(File.Exists(file2));

        UploadHelper.DeleteFiles(new[] { file1, nonExistent, file2 });

        Assert.False(File.Exists(file1));
        Assert.False(File.Exists(file2));
    }

    [Fact]
    public async Task DownloadAttachment_ReturnsUnauthorized_WhenNoUsername()
    {
        var tenant = new TestTenantProvider(username: "");
        var result = await UploadEndpoints.DownloadAttachment("test.png", tenant);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task DownloadAttachment_ReturnsNotFound_WhenFileDoesNotExist()
    {
        var tenant = new TestTenantProvider(username: "user_nonexistent_file");
        var result = await UploadEndpoints.DownloadAttachment("missing_image.png", tenant);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task DownloadAttachment_And_DeleteAttachment_OperateOnDiskCorrectly()
    {
        using var tempDir = new DisposableTempDirectory();
        var attachmentsDir = Path.Combine(tempDir.Path, "attachments");
        Directory.CreateDirectory(attachmentsDir);

        var fileName = "sample.png";
        var filePath = Path.Combine(attachmentsDir, fileName);
        await File.WriteAllBytesAsync(filePath, new byte[] { 1, 2, 3, 4 });

        var tenant = new TestTenantProvider(username: "test_user", tenantBasePath: tempDir.Path);

        // 1. Download
        var downloadResult = await UploadEndpoints.DownloadAttachment(fileName, tenant);
        var fileResult = Assert.IsType<PhysicalFileHttpResult>(downloadResult);
        Assert.Equal(filePath, fileResult.FileName);

        // 2. Delete
        var deleteResult = await UploadEndpoints.DeleteAttachment(fileName, tenant);
        Assert.IsType<NoContent>(deleteResult);
        Assert.False(File.Exists(filePath));
    }

    [Theory]
    [InlineData("../../admin.db")]
    [InlineData("..\\..\\admin.db")]
    [InlineData("sub/file.txt")]
    [InlineData("/etc/passwd")]
    public async Task AttachmentEndpoints_RejectPathTraversalAttempts(string dangerousFileName)
    {
        using var tempDir = new DisposableTempDirectory();
        var tenant = new TestTenantProvider(username: "victim_user", tenantBasePath: tempDir.Path);

        var downloadResult = await UploadEndpoints.DownloadAttachment(dangerousFileName, tenant);
        Assert.IsType<BadRequest<string>>(downloadResult);

        var deleteResult = await UploadEndpoints.DeleteAttachment(dangerousFileName, tenant);
        Assert.IsType<BadRequest<string>>(deleteResult);
    }

    [Fact]
    public async Task HandleUploadAsync_ReturnsBadRequest_WhenNotFormContentType()
    {
        var context = new DefaultHttpContext();
        context.Request.ContentType = "application/json";
        var tenant = new TestTenantProvider("test_user");
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var quota = new DiskQuotaService(adminDbFixture.Context);

        var (error, origName, url) = await UploadHelper.HandleUploadAsync(context.Request, tenant, quota);
        Assert.NotNull(error);
        var badRequest = Assert.IsType<BadRequest<string>>(error);
        Assert.Equal("Invalid form data", badRequest.Value);
        Assert.Null(origName);
        Assert.Null(url);
    }

    [Fact]
    public async Task HandleUploadAsync_ReturnsBadRequest_WhenNoFileOrEmptyFile()
    {
        var context = new DefaultHttpContext();
        context.Request.ContentType = "multipart/form-data; boundary=test";
        context.Request.Form = new FormCollection(new System.Collections.Generic.Dictionary<string, Microsoft.Extensions.Primitives.StringValues>());
        var tenant = new TestTenantProvider("test_user");
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var quota = new DiskQuotaService(adminDbFixture.Context);

        var (error, origName, url) = await UploadHelper.HandleUploadAsync(context.Request, tenant, quota);
        Assert.NotNull(error);
        var badRequest = Assert.IsType<BadRequest<string>>(error);
        Assert.Equal("No file uploaded", badRequest.Value);
        Assert.Null(origName);
        Assert.Null(url);
    }

    [Fact]
    public async Task HandleUploadAsync_ReturnsBadRequest_WhenDiskQuotaExceeded()
    {
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var adminDb = adminDbFixture.Context;
        var tier = new StorageTier { Name = "Tiny", DiskLimitBytes = 50 };
        adminDb.Tiers.Add(tier);
        await adminDb.SaveChangesAsync();

        var user = new AppUser { Username = "quota_user", TierId = tier.Id, DiskUsed = 45 };
        adminDb.Users.Add(user);
        await adminDb.SaveChangesAsync();

        var quota = new DiskQuotaService(adminDb);
        var tenant = new TestTenantProvider("quota_user");

        var fileBytes = new byte[100]; // 100 > 5 remaining
        var stream = new MemoryStream(fileBytes);
        var formFile = new FormFile(stream, 0, fileBytes.Length, "file", "photo.jpg");
        var formFiles = new FormFileCollection { formFile };

        var context = new DefaultHttpContext();
        context.Request.ContentType = "multipart/form-data; boundary=test";
        context.Request.Form = new FormCollection(new System.Collections.Generic.Dictionary<string, Microsoft.Extensions.Primitives.StringValues>(), formFiles);

        var (error, _, _) = await UploadHelper.HandleUploadAsync(context.Request, tenant, quota);
        Assert.NotNull(error);
        var badRequest = Assert.IsType<BadRequest<string>>(error);
        Assert.Contains("Disk quota exceeded", badRequest.Value);
    }

    [Fact]
    public async Task HandleUploadAsync_And_UploadImage_SavesFileAndReturnsOkUrl()
    {
        using var tempDir = new DisposableTempDirectory();
        using var adminDbFixture = TestDbContextFactory.CreateSqliteAdminDb();
        var adminDb = adminDbFixture.Context;
        var datastore = adminDb.Datastores.First();
        datastore.Path = tempDir.Path;
        var tier = adminDb.Tiers.First();
        var user = new AppUser { Username = "upload_user", DatastoreId = datastore.Id, TierId = tier.Id, DiskUsed = 0 };
        adminDb.Users.Add(user);
        await adminDb.SaveChangesAsync();

        var quota = new DiskQuotaService(adminDb);
        var tenant = new TestTenantProvider("upload_user", tempDir.Path);

        var content = System.Text.Encoding.UTF8.GetBytes("test image file content");
        var stream = new MemoryStream(content);
        var formFile = new FormFile(stream, 0, content.Length, "file", "avatar.png");
        var formFiles = new FormFileCollection { formFile };

        var context = new DefaultHttpContext();
        context.Request.ContentType = "multipart/form-data; boundary=test";
        context.Request.Form = new FormCollection(new System.Collections.Generic.Dictionary<string, Microsoft.Extensions.Primitives.StringValues>(), formFiles);

        var result = await UploadEndpoints.UploadImage(context.Request, tenant, quota);
        var okResult = Assert.IsAssignableFrom<IValueHttpResult>(result);
        Assert.NotNull(okResult.Value);

        var json = System.Text.Json.JsonSerializer.SerializeToElement(okResult.Value);
        var url = json.GetProperty("url").GetString();
        Assert.NotNull(url);
        Assert.StartsWith("/api/attachments/", url);

        // Verify file exists on disk
        var fileName = Path.GetFileName(url);
        var savedPath = Path.Combine(tempDir.Path, "attachments", fileName);
        Assert.True(File.Exists(savedPath));
        Assert.Equal(content.Length, new FileInfo(savedPath).Length);
    }
}
