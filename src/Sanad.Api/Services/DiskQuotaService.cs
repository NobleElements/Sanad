using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;

namespace Sanad.Api.Services;

public class DiskQuotaService
{
    private readonly AdminDbContext _adminDb;

    public DiskQuotaService(AdminDbContext adminDb)
    {
        _adminDb = adminDb;
    }

    public long GetDirectorySize(string folderPath)
    {
        if (!Directory.Exists(folderPath)) return 0;
        
        var dirInfo = new DirectoryInfo(folderPath);
        return dirInfo.EnumerateFiles("*", SearchOption.AllDirectories).Sum(file => file.Length);
    }

    public async Task<bool> CanUploadAsync(string username, long newFileSize)
    {
        var user = await _adminDb.Users
            .Include(u => u.Tier)
            .FirstOrDefaultAsync(u => u.Username == username);

        if (user == null) return false;
        if (user.IsAdmin) return true; // Admins have no limit

        var currentSize = user.DiskUsed;

        var limitBytes = user.Tier?.DiskLimitBytes ?? (1L * Constants.GigaByte); // default 1GB if no tier

        return (currentSize + newFileSize) <= limitBytes;
    }

    public async Task UpdateDiskUsageAsync(string username)
    {
        var user = await _adminDb.Users.Include(u => u.Datastore).FirstOrDefaultAsync(u => u.Username == username);
        if (user == null || user.Datastore == null) return;
        
        var userPath = Path.Combine(user.Datastore.Path, username);
        user.DiskUsed = GetDirectorySize(userPath);
        await _adminDb.SaveChangesAsync();
    }
}
