using Sanad.Api.Endpoints;
using System.Threading.Tasks;

namespace Sanad.Api.Services;

public interface ISearchService
{
    /// <summary>
    /// Searches every user-facing entity type. <paramref name="type"/> optionally narrows
    /// the search to a single category (e.g. "tasks"), and <paramref name="limit"/>
    /// caps the hits per category (1-50, defaulting to 10).
    /// </summary>
    Task<SearchResponse> SearchAsync(string? q, string? type, int? limit);
}