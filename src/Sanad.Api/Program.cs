using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// Configure DB
var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "sanad.db");
Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
builder.Services.AddDbContext<SanadDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

var app = builder.Build();

app.UseCors("AllowAll");

// Create DB if not exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SanadDbContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/", () => "Sanad API Running");

// POST a thought
app.MapPost("/api/thoughts", async (SanadDbContext db, Thought input) =>
{
    var thought = new Thought { Content = input.Content };
    db.Thoughts.Add(thought);
    
    var timelineItem = new TimelineItem 
    {
        ItemType = "Thought",
        ReferenceId = thought.Id
    };
    db.TimelineItems.Add(timelineItem);
    
    await db.SaveChangesAsync();
    return Results.Ok(thought);
});

// GET timeline
app.MapGet("/api/timeline", async (SanadDbContext db) =>
{
    var items = await db.TimelineItems
        .OrderByDescending(t => t.CreatedAt)
        .Take(10)
        .ToListAsync();
        
    // For thoughts, we also want the content
    var timelineWithContent = new List<object>();
    foreach (var item in items)
    {
        if (item.ItemType == "Thought")
        {
            var thought = await db.Thoughts.FindAsync(item.ReferenceId);
            timelineWithContent.Add(new { item.Id, item.ItemType, item.CreatedAt, Content = thought?.Content });
        }
    }
    
    return Results.Ok(timelineWithContent);
});

app.Run();
