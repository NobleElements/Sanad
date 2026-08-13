using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class AppEndpoints
{
    public static void MapAppEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/apps")
            .RequireAuthorization();

        group.MapGet("/", async (SanadDbContext db) =>
        {
            var apps = await db.CustomApps.OrderByDescending(a => a.CreatedAt).ToListAsync();
            return Results.Ok(apps);
        });

        group.MapGet("/{id:guid}", async (Guid id, SanadDbContext db) =>
        {
            var app = await db.CustomApps.FindAsync(id);
            return app != null ? Results.Ok(app) : Results.NotFound();
        });

        group.MapPost("/", async (CustomApp app, SanadDbContext db) =>
        {
            app.Id = Guid.NewGuid();
            app.CreatedAt = DateTime.UtcNow;
            app.UpdatedAt = DateTime.UtcNow;

            db.CustomApps.Add(app);
            await db.SaveChangesAsync();

            return Results.Created($"/api/apps/{app.Id}", app);
        });

        group.MapPut("/{id:guid}", async (Guid id, CustomApp updatedApp, SanadDbContext db) =>
        {
            var app = await db.CustomApps.FindAsync(id);
            if (app == null) return Results.NotFound();

            app.Name = updatedApp.Name;
            app.HtmlContent = updatedApp.HtmlContent;
            app.Icon = updatedApp.Icon;
            app.ShowInDashboard = updatedApp.ShowInDashboard;
            app.IsStandalone = updatedApp.IsStandalone;
            app.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(app);
        });

        group.MapDelete("/{id:guid}", async (Guid id, SanadDbContext db) =>
        {
            var app = await db.CustomApps.FindAsync(id);
            if (app == null) return Results.NotFound();

            db.CustomApps.Remove(app);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        group.MapPost("/proxy", async (ProxyRequest req, IHttpClientFactory httpClientFactory) =>
        {
            if (string.IsNullOrWhiteSpace(req.Url))
                return Results.BadRequest("URL is required");

            try
            {
                var client = httpClientFactory.CreateClient();
                var requestMessage = new HttpRequestMessage(new HttpMethod(req.Method), req.Url);

                if (req.Headers != null)
                {
                    foreach (var header in req.Headers)
                    {
                        // Some headers might need to be added to content rather than request
                        if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase)) continue;
                        requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value);
                    }
                }

                if (!string.IsNullOrEmpty(req.Body) && req.Method.ToUpper() != "GET")
                {
                    requestMessage.Content = new StringContent(req.Body);
                    if (req.Headers != null && req.Headers.TryGetValue("Content-Type", out var contentType))
                    {
                        requestMessage.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
                    }
                }

                var response = await client.SendAsync(requestMessage);
                var content = await response.Content.ReadAsStringAsync();

                return Results.Content(content, response.Content.Headers.ContentType?.ToString() ?? "text/plain", System.Text.Encoding.UTF8, (int)response.StatusCode);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message, statusCode: 500);
            }
        });
    }
}

public class ProxyRequest
{
    public string Url { get; set; } = string.Empty;
    public string Method { get; set; } = "GET";
    public Dictionary<string, string>? Headers { get; set; }
    public string? Body { get; set; }
}
