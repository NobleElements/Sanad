using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;

namespace Sanad.Api.Endpoints;

public static class PublicSettingsEndpoints
{
    public static void MapPublicSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings/public");

        group.MapGet("/", async (AdminDbContext db) =>
        {
            var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
            return Results.Ok(new
            {
                ContactEmail = settings.GetValueOrDefault("ContactEmail", "")
            });
        });
    }
}
