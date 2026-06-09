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
// GET tasks
app.MapGet("/api/tasks", async (SanadDbContext db) =>
{
    return Results.Ok(await db.TaskItems.OrderByDescending(t => t.CreatedAt).ToListAsync());
});

// GET single task
app.MapGet("/api/tasks/{id}", async (SanadDbContext db, Guid id) =>
{
    var task = await db.TaskItems.FindAsync(id);
    if (task == null) return Results.NotFound();
    
    var comments = await db.TaskComments.Where(c => c.TaskItemId == id).OrderBy(c => c.CreatedAt).ToListAsync();
    var attachments = await db.TaskAttachments.Where(a => a.TaskItemId == id).ToListAsync();
    
    return Results.Ok(new { Task = task, Comments = comments, Attachments = attachments });
});

// POST task
app.MapPost("/api/tasks", async (SanadDbContext db, TaskItem input) =>
{
    db.TaskItems.Add(input);
    await db.SaveChangesAsync();
    return Results.Created($"/api/tasks/{input.Id}", input);
});

// PUT task
app.MapPut("/api/tasks/{id}", async (SanadDbContext db, Guid id, TaskItem updatedTask) =>
{
    var task = await db.TaskItems.FindAsync(id);
    if (task == null) return Results.NotFound();
    
    task.Title = updatedTask.Title;
    task.Content = updatedTask.Content;
    task.Status = updatedTask.Status;
    task.Tags = updatedTask.Tags;
    task.UpdatedAt = DateTime.UtcNow;
    
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();
