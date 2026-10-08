using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Sanad.Api.Endpoints;
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
}
