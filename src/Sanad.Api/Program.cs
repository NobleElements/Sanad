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

builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.Stateless = true)
    .WithTools<McpEndpoints>();

var app = builder.Build();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// Create DB if not exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SanadDbContext>();
    db.Database.Migrate();
}

app.MapGet("/", () => "Sanad API Running");

app.MapAuthEndpoints();

var api = app.MapGroup("").RequireAuthorization();

// Generic Image Upload
api.MapPost("/api/upload/image", async (HttpRequest request) =>
{
    if (!request.HasFormContentType) return Results.BadRequest("Invalid form data");

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file == null || file.Length == 0) return Results.BadRequest("No file uploaded");

    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", "attachments");
    Directory.CreateDirectory(uploadsDir);

    var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var filePath = Path.Combine(uploadsDir, uniqueFileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    return Results.Ok(new { url = $"/attachments/{uniqueFileName}" });
});

// POST a thought
api.MapPost("/api/thoughts", async (SanadDbContext db, Thought input) =>
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

// GET thoughts
api.MapGet("/api/thoughts", async (SanadDbContext db, int? page, int? pageSize, string? search) =>
{
    var p = page ?? 1;
    var size = pageSize ?? 20;
    var query = db.Thoughts.AsQueryable();
    
    if (!string.IsNullOrWhiteSpace(search))
    {
        var lowerSearch = search.ToLower();
        query = query.Where(t => t.Content != null && t.Content.ToLower().Contains(lowerSearch));
    }
    
    var thoughts = await query
        .OrderByDescending(t => t.CreatedAt)
        .Skip((p - 1) * size)
        .Take(size)
        .ToListAsync();
    return Results.Ok(thoughts);
});

// PUT thought
api.MapPut("/api/thoughts/{id}", async (SanadDbContext db, string id, Thought updated) =>
{
    var thought = await db.Thoughts.FindAsync(id);
    if (thought == null) return Results.NotFound();
    
    thought.Content = updated.Content;
    await db.SaveChangesAsync();
    return Results.Ok(thought);
});

// DELETE thought
api.MapDelete("/api/thoughts/{id}", async (SanadDbContext db, string id) =>
{
    var thought = await db.Thoughts.FindAsync(id);
    if (thought == null) return Results.NotFound();
    
    var timelineItem = await db.TimelineItems.FirstOrDefaultAsync(t => t.ItemType == "Thought" && t.ReferenceId == id);
    if (timelineItem != null)
    {
        db.TimelineItems.Remove(timelineItem);
    }

    db.Thoughts.Remove(thought);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Daily Goals
api.MapGet("/api/goals/{dateStr}", async (SanadDbContext db, string dateStr) =>
{
    var goal = await db.DailyGoals.FindAsync(dateStr);
    if (goal == null) return Results.NoContent();
    return Results.Ok(goal);
});

api.MapPut("/api/goals/{dateStr}", async (SanadDbContext db, string dateStr, DailyGoal input) =>
{
    var goal = await db.DailyGoals.FindAsync(dateStr);
    if (goal == null)
    {
        goal = new DailyGoal { DateStr = dateStr, Goal = input.Goal };
        db.DailyGoals.Add(goal);
    }
    else
    {
        goal.Goal = input.Goal;
    }
    await db.SaveChangesAsync();
    return Results.Ok(goal);
});

// GET timeline
api.MapGet("/api/timeline", async (SanadDbContext db) =>
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
api.MapGet("/api/tasks", async (SanadDbContext db, string? project) =>
{
    var query = db.TaskItems.AsQueryable();
    if (!string.IsNullOrEmpty(project))
        query = query.Where(t => t.Project == project);
    return Results.Ok(await query.OrderByDescending(t => t.CreatedAt).ToListAsync());
});

// GET single task
api.MapGet("/api/tasks/{id}", async (SanadDbContext db, Guid id) =>
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
api.MapPost("/api/tasks", async (SanadDbContext db, TaskItem input) =>
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
api.MapPut("/api/tasks/{id}", async (SanadDbContext db, Guid id, TaskItem updatedTask) =>
{
    if (string.IsNullOrWhiteSpace(updatedTask.Title)) return Results.BadRequest("Title is required");

    var task = await db.TaskItems.FindAsync(id);
    if (task == null) return Results.NotFound();
    
    task.Title = updatedTask.Title;
    task.Content = updatedTask.Content;
    task.Status = updatedTask.Status;
    task.Tags = updatedTask.Tags;
    task.Project = updatedTask.Project;
    task.EstimatedMinutes = updatedTask.EstimatedMinutes;
    task.UpdatedAt = DateTime.UtcNow;
    
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// PATCH task status
api.MapPatch("/api/tasks/{id}/status", async (SanadDbContext db, Guid id, StatusUpdateRequest request) =>
{
    var task = await db.TaskItems.FindAsync(id);
    if (task == null) return Results.NotFound();
    task.Status = request.Status;
    task.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// DELETE task
api.MapDelete("/api/tasks/{id}", async (SanadDbContext db, Guid id) =>
{
    var task = await db.TaskItems.FindAsync(id);
    if (task == null) return Results.NotFound();
    
    db.TaskItems.Remove(task);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// POST comment
api.MapPost("/api/tasks/{id}/comments", async (SanadDbContext db, Guid id, TaskComment comment) =>
{
    var taskExists = await db.TaskItems.AnyAsync(t => t.Id == id);
    if (!taskExists) return Results.NotFound();

    if (string.IsNullOrWhiteSpace(comment.Text)) return Results.BadRequest("Comment text is required");

    comment.TaskItemId = id;
    db.TaskComments.Add(comment);
    await db.SaveChangesAsync();
    return Results.Created($"/api/tasks/{id}/comments/{comment.Id}", comment);
});

// POST attachment
api.MapPost("/api/tasks/{id}/attachments", async (HttpRequest request, SanadDbContext db, Guid id) =>
{
    var taskExists = await db.TaskItems.AnyAsync(t => t.Id == id);
    if (!taskExists) return Results.NotFound();

    if (!request.HasFormContentType) return Results.BadRequest("Invalid form data");

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file == null || file.Length == 0) return Results.BadRequest("No file uploaded");

    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", "attachments");
    Directory.CreateDirectory(uploadsDir);

    var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var filePath = Path.Combine(uploadsDir, uniqueFileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    var attachment = new TaskAttachment
    {
        TaskItemId = id,
        FileName = file.FileName,
        FilePath = $"/attachments/{uniqueFileName}"
    };
    db.TaskAttachments.Add(attachment);
    await db.SaveChangesAsync();
    
    return Results.Created($"/api/tasks/{id}/attachments/{attachment.Id}", attachment);
});

api.MapFinanceEndpoints();
api.MapNotebookEndpoints();

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

record StatusUpdateRequest(Sanad.Api.Models.TaskStatus Status);
