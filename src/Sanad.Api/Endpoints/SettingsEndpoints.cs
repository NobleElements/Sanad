using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/settings").RequireAuthorization();

        group.MapGet("/", async (SanadDbContext db) =>
        {
            var settings = await db.UserSettings.ToListAsync();
            var dict = settings.ToDictionary(s => s.Key, s => s.Value);
            return Results.Ok(dict);
        });

        group.MapPut("/{key}", async (string key, UpdateSettingRequest req, SanadDbContext db) =>
        {
            var value = req.Value;
            var setting = await db.UserSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
            {
                setting = new UserSetting { Key = key, Value = value };
                db.UserSettings.Add(setting);
            }
            else
            {
                setting.Value = value;
            }

            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }
}

public record UpdateSettingRequest(string Value);
