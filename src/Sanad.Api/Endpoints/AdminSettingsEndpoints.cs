using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class AdminSettingsEndpoints
{
    public static void MapAdminSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/settings").RequireAuthorization(policy => 
            policy.RequireAssertion(context => 
                context.User.HasClaim(c => c.Type == "IsAdmin" && c.Value == "True")));

        group.MapGet("/", async (AdminDbContext db) =>
        {
            var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
            return Results.Ok(new
            {
                IsPaddleEnabled = settings.GetValueOrDefault("IsPaddleEnabled") == "true",
                PaddleEnvironment = settings.GetValueOrDefault("PaddleEnvironment", "sandbox"),
                PaddleApiKey = settings.GetValueOrDefault("PaddleApiKey", ""),
                PaddleClientToken = settings.GetValueOrDefault("PaddleClientToken", ""),
                PaddleWebhookSecret = settings.GetValueOrDefault("PaddleWebhookSecret", ""),
                EnableNewSubscriptions = settings.GetValueOrDefault("EnableNewSubscriptions") == "true"
            });
        });

        group.MapPut("/", async (AdminDbContext db, AdminSettingsUpdateRequest req) =>
        {
            var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s);

            void UpdateSetting(string key, string value)
            {
                if (settings.TryGetValue(key, out var setting))
                {
                    setting.Value = value;
                }
                else
                {
                    db.SystemSettings.Add(new SystemSetting { Key = key, Value = value });
                }
            }

            if (req.IsPaddleEnabled.HasValue) UpdateSetting("IsPaddleEnabled", req.IsPaddleEnabled.Value ? "true" : "false");
            if (req.EnableNewSubscriptions.HasValue) UpdateSetting("EnableNewSubscriptions", req.EnableNewSubscriptions.Value ? "true" : "false");
            if (req.PaddleEnvironment != null) UpdateSetting("PaddleEnvironment", req.PaddleEnvironment);
            if (req.PaddleApiKey != null) UpdateSetting("PaddleApiKey", req.PaddleApiKey);
            if (req.PaddleClientToken != null) UpdateSetting("PaddleClientToken", req.PaddleClientToken);
            if (req.PaddleWebhookSecret != null) UpdateSetting("PaddleWebhookSecret", req.PaddleWebhookSecret);

            await db.SaveChangesAsync();
            return Results.Ok();
        });

        group.MapPost("/verify-paddle", async (PaddleService paddleService, PaddleVerifyRequest req) =>
        {
            try
            {
                var success = await paddleService.VerifyConfigurationAsync(req.Environment, req.ApiKey);
                return success ? Results.Ok() : Results.BadRequest("Invalid API Key or Environment");
            }
            catch (Exception ex)
            {
                return Results.BadRequest($"Verification failed: {ex.Message}");
            }
        });
    }
}

public record AdminSettingsUpdateRequest(
    bool? IsPaddleEnabled, 
    bool? EnableNewSubscriptions,
    string? PaddleEnvironment,
    string? PaddleApiKey,
    string? PaddleClientToken,
    string? PaddleWebhookSecret
);

public record PaddleVerifyRequest(string Environment, string ApiKey);
