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

// Ignore JSON reference cycles
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);

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
        
    // For thoughts and tasks, we also want the content/title
    var timelineWithContent = new List<object>();
    foreach (var item in items)
    {
        if (item.ItemType == "Thought")
        {
            var thought = await db.Thoughts.FindAsync(item.ReferenceId);
            timelineWithContent.Add(new { item.Id, item.ItemType, item.CreatedAt, Content = thought?.Content });
        }
        else if (item.ItemType == "Task")
        {
            if (Guid.TryParse(item.ReferenceId, out var taskId))
            {
                var task = await db.TaskItems.FindAsync(taskId);
                timelineWithContent.Add(new { item.Id, item.ItemType, item.CreatedAt, Title = task?.Title, Content = task?.Content });
            }
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
    var task = await db.TaskItems
        .Include(t => t.Comments.OrderBy(c => c.CreatedAt))
        .Include(t => t.Attachments)
        .AsNoTracking()
        .FirstOrDefaultAsync(t => t.Id == id);
        
    if (task == null) return Results.NotFound();
    
    return Results.Ok(new { Task = task, Comments = task.Comments, Attachments = task.Attachments });
});

// POST task
app.MapPost("/api/tasks", async (SanadDbContext db, TaskItem input) =>
{
    if (string.IsNullOrWhiteSpace(input.Title)) return Results.BadRequest("Title is required");

    db.TaskItems.Add(input);
    
    var timelineItem = new TimelineItem 
    {
        ItemType = "Task",
        ReferenceId = input.Id.ToString()
    };
    db.TimelineItems.Add(timelineItem);
    
    await db.SaveChangesAsync();
    return Results.Created($"/api/tasks/{input.Id}", input);
});

// PUT task
app.MapPut("/api/tasks/{id}", async (SanadDbContext db, Guid id, TaskItem updatedTask) =>
{
    if (string.IsNullOrWhiteSpace(updatedTask.Title)) return Results.BadRequest("Title is required");

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

// DELETE task
app.MapDelete("/api/tasks/{id}", async (SanadDbContext db, Guid id) =>
{
    var task = await db.TaskItems.FindAsync(id);
    if (task == null) return Results.NotFound();
    
    db.TaskItems.Remove(task);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// POST comment
app.MapPost("/api/tasks/{id}/comments", async (SanadDbContext db, Guid id, TaskComment comment) =>
{
    comment.TaskItemId = id;
    db.TaskComments.Add(comment);
    await db.SaveChangesAsync();
    return Results.Ok(comment);
});

// POST attachment
app.MapPost("/api/tasks/{id}/attachments", async (HttpRequest request, SanadDbContext db, Guid id) =>
{
    if (!request.HasFormContentType) return Results.BadRequest("Invalid form data");

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file == null || file.Length == 0) return Results.BadRequest("No file uploaded");

    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", "attachments");
    Directory.CreateDirectory(uploadsDir);

    var filePath = Path.Combine(uploadsDir, file.FileName);
    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    var attachment = new TaskAttachment
    {
        TaskItemId = id,
        FileName = file.FileName,
        FilePath = $"/attachments/{file.FileName}"
    };
    db.TaskAttachments.Add(attachment);
    await db.SaveChangesAsync();
    
    return Results.Ok(attachment);
});

app.Run();
