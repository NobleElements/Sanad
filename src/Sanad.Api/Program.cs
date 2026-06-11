using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials());
});

// Add Authentication and Authorization
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "Sanad.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

// Configure DB
var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "sanad.db");
Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
builder.Services.AddDbContext<SanadDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Ignore JSON reference cycles
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);

builder.Services.AddHttpClient<Sanad.Api.Services.IBookSearchService, Sanad.Api.Services.BookSearchService>();

builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.Stateless = true)
    .WithTools<McpEndpoints>();

builder.Services.AddSingleton<Sanad.Api.Services.FileStorageService>();
builder.Services.AddScoped<Sanad.Api.Services.FileManagerService>();

var app = builder.Build();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// Create DB if not exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SanadDbContext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
}

app.MapGet("/", () => "Sanad API Running");

app.MapAuthEndpoints();

var api = app.MapGroup("").RequireAuthorization();

api.MapUploadEndpoints();
api.MapThoughtEndpoints();
api.MapGoalEndpoints();
api.MapTimelineEndpoints();
api.MapTaskEndpoints();

api.MapFinanceEndpoints();
api.MapNotebookEndpoints();
api.MapAssetEndpoints();
api.MapBookEndpoints();
api.MapReadingEndpoints();
api.MapHabitEndpoints();
api.MapFolderEndpoints();
api.MapFileEndpoints();

app.MapMcp("/mcp");

// Serve uploaded attachments
var attachmentsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", "attachments");
Directory.CreateDirectory(attachmentsDir);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(attachmentsDir),
    RequestPath = "/attachments"
});

app.Run();
