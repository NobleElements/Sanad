using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tasks", GetTasks);
        app.MapGet("/api/tasks/{id}", GetTask);
        app.MapPost("/api/tasks", CreateTask);
        app.MapPut("/api/tasks/{id}", UpdateTask);
        app.MapPatch("/api/tasks/{id}/status", UpdateTaskStatus);
        app.MapDelete("/api/tasks/{id}", DeleteTask);
        app.MapPost("/api/tasks/{id}/comments", CreateTaskComment);
        app.MapPost("/api/tasks/{id}/attachments", CreateTaskAttachment);
    }

    public static async Task<IResult> GetTasks(SanadDbContext db, string? project)
    {
        var query = db.TaskItems.AsQueryable();
        if (!string.IsNullOrEmpty(project))
            query = query.Where(t => t.Project == project);
        return Results.Ok(await query.OrderByDescending(t => t.CreatedAt).ToListAsync());
    }

    public static async Task<IResult> GetTask(SanadDbContext db, Guid id)
    {
        var task = await db.TaskItems
            .Include(t => t.Comments.OrderBy(c => c.CreatedAt))
            .Include(t => t.Attachments)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);
            
        if (task == null) return Results.NotFound();
        
        return Results.Ok(new { Task = task, Comments = task.Comments, Attachments = task.Attachments });
    }

    public static async Task<IResult> CreateTask(SanadDbContext db, TaskItem input)
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
    }

    public static async Task<IResult> UpdateTask(SanadDbContext db, Guid id, TaskItem updatedTask)
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
    }

    public static async Task<IResult> UpdateTaskStatus(SanadDbContext db, Guid id, StatusUpdateRequest request)
    {
        var task = await db.TaskItems.FindAsync(id);
        if (task == null) return Results.NotFound();
        task.Status = request.Status;
        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public static async Task<IResult> DeleteTask(SanadDbContext db, Guid id)
    {
        var task = await db.TaskItems.FindAsync(id);
        if (task == null) return Results.NotFound();
        
        db.TaskItems.Remove(task);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public static async Task<IResult> CreateTaskComment(SanadDbContext db, Guid id, TaskComment comment)
    {
        var taskExists = await db.TaskItems.AnyAsync(t => t.Id == id);
        if (!taskExists) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(comment.Text)) return Results.BadRequest("Comment text is required");

        comment.TaskItemId = id;
        db.TaskComments.Add(comment);
        await db.SaveChangesAsync();
        return Results.Created($"/api/tasks/{id}/comments/{comment.Id}", comment);
    }

    public static async Task<IResult> CreateTaskAttachment(HttpRequest request, SanadDbContext db, Guid id)
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
    }
}

public record StatusUpdateRequest(Sanad.Api.Models.TaskStatus Status);
