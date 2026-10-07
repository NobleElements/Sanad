using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public interface IAssetService
{
    Task<List<Asset>> GetAssetsAsync();
    Task<Asset> CreateAssetAsync(Asset asset);
    Task<Asset?> UpdateAssetAsync(Guid id, Asset updated);
    Task<bool> DeleteAssetAsync(Guid id);
    Task<bool> ReorderAssetsAsync(List<Guid> orderedIds);
    Task<object> GetAssetsHistoryAsync();
}