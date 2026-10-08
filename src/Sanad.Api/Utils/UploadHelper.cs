using Sanad.Api.Services;
using System.Text.RegularExpressions;

namespace Sanad.Api.Utils;

public static class UploadHelper
{
    public static async Task<(IResult? ErrorResult, string? OriginalFileName, string? FileUrl)> HandleUploadAsync(
        HttpRequest request, 
        ITenantProvider tenantProvider, 
        DiskQuotaService quotaService)
    {
        if (!request.HasFormContentType) return (Results.BadRequest("Invalid form data"), null, null);

        var form = await request.ReadFormAsync();
        var file = form.Files.FirstOrDefault();
        if (file == null || file.Length == 0) return (Results.BadRequest("No file uploaded"), null, null);

        var username = tenantProvider.GetUsername();
        
        var canUpload = await quotaService.CanUploadAsync(username, file.Length);
        if (!canUpload)
        {
            return (Results.BadRequest("Disk quota exceeded. Please upgrade your tier or delete files."), null, null);
        }

        var uploadsDir = Path.Combine(tenantProvider.GetTenantBasePath(), "attachments");
        Directory.CreateDirectory(uploadsDir);

        var (uniqueFileName, filePath) = FileUtils.GenerateUniqueFile(uploadsDir, Path.GetExtension(file.FileName));

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        
        await quotaService.UpdateDiskUsageAsync(username);

        var fileUrl = $"/api/attachments/{uniqueFileName}";
        return (null, file.FileName, fileUrl);
    }

    public static List<string> ExtractImageUrls(string? htmlContent)
    {
        var urls = new List<string>();
        if (string.IsNullOrWhiteSpace(htmlContent)) return urls;

        var pattern = @"<img[^>]+src=""([^""]+)""";
        var matches = Regex.Matches(htmlContent, pattern, RegexOptions.IgnoreCase);
        foreach (Match match in matches)
        {
            if (match.Groups.Count > 1)
            {
                urls.Add(match.Groups[1].Value);
            }
        }
        return urls;
    }

    public static List<string> GetAttachmentPathsFromHtml(string? htmlContent, string tenantBasePath)
    {
        var paths = new List<string>();
        var urls = ExtractImageUrls(htmlContent);
        foreach (var url in urls)
        {
            if (url.StartsWith("/api/attachments/") && ResolveAttachmentPath(url, tenantBasePath) is { } filePath)
            {
                paths.Add(filePath);
            }
        }
        return paths;
    }

    /// <summary>
    /// Maps an attachment URL ("/api/attachments/x", legacy "/attachments/x", or a bare path) to its file in the
    /// tenant's attachments folder. Returns null if the name would resolve outside that folder.
    /// </summary>
    public static string? ResolveAttachmentPath(string? fileUrl, string tenantBasePath)
    {
        if (string.IsNullOrEmpty(fileUrl)) return null;

        var fileName = fileUrl.StartsWith("/api/attachments/")
            ? fileUrl.Substring("/api/attachments/".Length)
            : (fileUrl.StartsWith("/attachments/")
                ? fileUrl.Substring("/attachments/".Length)
                : Path.GetFileName(fileUrl));

        return FileUtils.ResolveChildPath(Path.Combine(tenantBasePath, "attachments"), fileName);
    }

    public static void DeleteFiles(IEnumerable<string> filePaths)
    {
        foreach (var filePath in filePaths)
        {
            if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath))
            {
                try { File.Delete(filePath); } catch { }
            }
        }
    }
}
