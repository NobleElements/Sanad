using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public class ShareService : IShareService
{
    private readonly AdminDbContext _adminDb;
    private readonly SanadDbContext _db;
    private readonly ITenantProvider _tenantProvider;

    public ShareService(AdminDbContext adminDb, SanadDbContext db, ITenantProvider tenantProvider)
    {
        _adminDb = adminDb;
        _db = db;
        _tenantProvider = tenantProvider;
    }

    private async Task<AppUser?> GetCurrentUserAsync()
    {
        var username = _tenantProvider.GetUsername();
        return await _adminDb.Users.FirstOrDefaultAsync(u => u.Username == username);
    }

    public async Task<SharedLink?> CreateFolderShareAsync(int folderId, SharePermission permission)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return null;

        var folder = await _db.Folders.FindAsync(folderId);
        if (folder == null) return null;

        var existingLink = await _adminDb.SharedLinks.FirstOrDefaultAsync(l => l.UserId == user.Id && l.FolderId == folderId);
        if (existingLink != null)
        {
            existingLink.Permission = permission;
            await _adminDb.SaveChangesAsync();
            return existingLink;
        }

        var link = new SharedLink { UserId = user.Id, FolderId = folderId, Permission = permission };
        _adminDb.SharedLinks.Add(link);
        await _adminDb.SaveChangesAsync();
        return link;
    }

    public async Task<SharedLink?> CreateFileShareAsync(int fileId, SharePermission permission)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return null;

        var file = await _db.FileItems.FindAsync(fileId);
        if (file == null) return null;

        var existingLink = await _adminDb.SharedLinks.FirstOrDefaultAsync(l => l.UserId == user.Id && l.FileItemId == fileId);
        if (existingLink != null)
        {
            existingLink.Permission = permission;
            await _adminDb.SaveChangesAsync();
            return existingLink;
        }

        var link = new SharedLink { UserId = user.Id, FileItemId = fileId, Permission = permission };
        _adminDb.SharedLinks.Add(link);
        await _adminDb.SaveChangesAsync();
        return link;
    }

    public async Task<List<ShareLinkDto>> GetSharesAsync()
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return new List<ShareLinkDto>();

        var links = await _adminDb.SharedLinks.Where(l => l.UserId == user.Id).ToListAsync();

        // Enrich with names
        var result = new List<ShareLinkDto>();
        foreach (var link in links)
        {
            if (link.FolderId.HasValue)
            {
                var folder = await _db.Folders.FindAsync(link.FolderId.Value);
                if (folder != null)
                {
                    result.Add(new ShareLinkDto(link.Token, link.Permission, "folder", folder.Name, folder.Id));
                }
            }
            else if (link.FileItemId.HasValue)
            {
                var file = await _db.FileItems.FindAsync(link.FileItemId.Value);
                if (file != null)
                {
                    result.Add(new ShareLinkDto(link.Token, link.Permission, "file", file.Name, file.Id));
                }
            }
        }

        return result;
    }

    public async Task<SharedLink?> UpdateSharePermissionAsync(string token, SharePermission permission)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return null;

        var link = await _adminDb.SharedLinks.FirstOrDefaultAsync(l => l.Token == token && l.UserId == user.Id);
        if (link == null) return null;

        link.Permission = permission;
        await _adminDb.SaveChangesAsync();

        return link;
    }

    public async Task<bool> RevokeShareAsync(string token)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return false;

        var link = await _adminDb.SharedLinks.FirstOrDefaultAsync(l => l.Token == token && l.UserId == user.Id);
        if (link == null) return false;

        _adminDb.SharedLinks.Remove(link);
        await _adminDb.SaveChangesAsync();

        return true;
    }
}