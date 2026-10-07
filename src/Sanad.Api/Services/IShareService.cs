using System.Collections.Generic;
using System.Threading.Tasks;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public record ShareLinkDto(
    string Token,
    SharePermission Permission,
    string Type,
    string Name,
    int TargetId
);

public interface IShareService
{
    /// <summary>Creates (or updates) the share link for a folder. Null when the folder does not exist.</summary>
    Task<SharedLink?> CreateFolderShareAsync(int folderId, SharePermission permission);

    /// <summary>Creates (or updates) the share link for a file. Null when the file does not exist.</summary>
    Task<SharedLink?> CreateFileShareAsync(int fileId, SharePermission permission);

    Task<List<ShareLinkDto>> GetSharesAsync();
    Task<SharedLink?> UpdateSharePermissionAsync(string token, SharePermission permission);
    Task<bool> RevokeShareAsync(string token);
}