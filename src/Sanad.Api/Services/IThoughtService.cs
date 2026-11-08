using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public record ThoughtCollectionDto(
    string Id,
    string Name,
    string Color,
    int SortOrder,
    int ThoughtCount,
    DateTime CreatedAt
);

public interface IThoughtService
{
    Task<List<Thought>> GetThoughtsAsync(int page = 1, int pageSize = 20, string? search = null, string? collectionId = null);
    Task<Thought> CreateThoughtAsync(string content, string? collectionId = null, string? color = null, bool isPinned = false);
    Task<Thought?> UpdateThoughtAsync(string id, string? content = null, string? collectionId = null, string? color = null, bool? isPinned = null, bool clearCollection = false);
    Task<bool> DeleteThoughtAsync(string id);

    Task<List<ThoughtCollectionDto>> GetCollectionsAsync();
    Task<ThoughtCollection> CreateCollectionAsync(string name, string? color = null);
    Task<ThoughtCollection?> UpdateCollectionAsync(string id, string name, string? color = null);
    Task<bool> DeleteCollectionAsync(string id, bool deleteThoughts = false);
}
