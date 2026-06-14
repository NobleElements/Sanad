using Sanad.Api.Services;

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

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", username, "attachments");
        Directory.CreateDirectory(uploadsDir);

        var (uniqueFileName, filePath) = FileUtils.GenerateUniqueFile(uploadsDir, Path.GetExtension(file.FileName));

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        
        await quotaService.UpdateDiskUsageAsync(username);

        var fileUrl = $"/attachments/{uniqueFileName}";
        return (null, file.FileName, fileUrl);
    }
}
