using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/settings").RequireAuthorization();

        group.MapGet("/", async (ISettingsService svc) =>
        {
            var dict = await svc.GetSettingsAsync();
            return Results.Ok(dict);
        });

        group.MapPut("/{key}", async (string key, UpdateSettingRequest req, ISettingsService svc) =>
        {
            await svc.SetSettingAsync(key, req.Value);
            return Results.Ok();
        });
    }
}

public record UpdateSettingRequest(string Value);