using System.Collections.Generic;
using System.Threading.Tasks;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public record StorageStatusDto(
    long DiskUsedBytes,
    long DiskLimitBytes,
    string TierName,
    bool IsAdmin
);

public record StorageHistoryDto(
    string TierName,
    DateTime StartedAt,
    DateTime? EndedAt
);

public interface IStorageService
{
    Task<List<StorageTier>> GetTiersAsync();
    Task<StorageStatusDto> GetStorageStatusAsync(string username);

    /// <summary>Subscription/storage tier history for a user. Returns null when the user is unknown.</summary>
    Task<List<StorageHistoryDto>?> GetStorageHistoryAsync(string username);
}
