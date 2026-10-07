using System.Threading.Tasks;
using Sanad.Api.Data;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/search")
            .RequireAuthorization();

        group.MapGet("/", (ISearchService svc, string? q, string? type, int? limit) => HandleSearch(svc, q, type, limit));
    }

    public static async Task<IResult> HandleSearch(ISearchService svc, string? q, string? type, int? limit)
    {
        var response = await svc.SearchAsync(q, type, limit);
        return Results.Ok(response);
    }

    public static Task<IResult> HandleSearch(SanadDbContext db, string? q, string? type, int? limit) =>
        HandleSearch(new SearchService(db), q, type, limit);
}

public record SearchResultItem(
    string Id,
    string Type,
    string Category,
    string Title,
    string Snippet,
    string Url,
    string Icon,
    DateTime? CreatedAt = null,
    Dictionary<string, object?>? Metadata = null
);

public record SearchResponse(
    List<SearchResultItem> Results,
    int TotalCount
);
