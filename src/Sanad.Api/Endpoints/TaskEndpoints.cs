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
        app.MapPatch("/api/tasks/reorder", ReorderTasks);
        app.MapDelete("/api/tasks/{id}", DeleteTask);
        app.MapPost("/api/tasks/{id}/comments", CreateTaskComment);
        app.MapPost("/api/tasks/{id}/attachments", CreateTaskAttachment);
        app.MapDelete("/api/tasks/{id}/comments/{commentId}", DeleteTaskComment);
        app.MapDelete("/api/tasks/{id}/attachments/{attachmentId}", DeleteTaskAttachment);
    }

    public static async Task<IResult> GetTasks(SanadDbContext db, string? project, Models.TaskStatus? status)
    {
        var query = db.TaskItems.AsQueryable();
        if (!string.IsNullOrEmpty(project))
            query = query.Where(t => t.Project == project);
        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);
            
        // Hide scheduled tasks from general lists
        query = query.Where(t => t.StartDate == null);
        
        return Results.Ok(await query.OrderBy(t => t.Order).ThenByDescending(t => t.CreatedAt).ToListAsync());
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
        task.StartDate = updatedTask.StartDate;
        task.EndDate = updatedTask.EndDate;
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

    public static async Task<IResult> ReorderTasks(SanadDbContext db, ReorderTasksRequest request)
    {
        var ids = request.Tasks.Select(t => t.Id).ToList();
        var tasks = await db.TaskItems.Where(t => ids.Contains(t.Id)).ToListAsync();
        
        foreach (var update in request.Tasks)
        {
            var task = tasks.FirstOrDefault(t => t.Id == update.Id);
            if (task != null)
            {
                task.Status = update.Status;
                task.Order = update.Order;
                task.UpdatedAt = DateTime.UtcNow;
            }
        }
        
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public static async Task<IResult> DeleteTask(SanadDbContext db, Guid id, Services.ITenantProvider tenantProvider)
    {
        var task = await db.TaskItems
            .Include(t => t.Attachments)
            .FirstOrDefaultAsync(t => t.Id == id);
            
        if (task == null) return Results.NotFound();
        
        var filesToDelete = new List<string>();
        var username = tenantProvider.GetUsername();
        
        if (task.Attachments != null)
        {
            foreach (var attachment in task.Attachments)
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", username, attachment.FilePath.TrimStart('/'));
                filesToDelete.Add(filePath);
            }
        }

        // Delete inline images
        filesToDelete.AddRange(Utils.UploadHelper.GetAttachmentPathsFromHtml(task.Content, username));
        
        db.TaskItems.Remove(task);
        await db.SaveChangesAsync();

        Utils.UploadHelper.DeleteFiles(filesToDelete);

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

    public static async Task<IResult> CreateTaskAttachment(HttpRequest request, SanadDbContext db, Guid id, Services.ITenantProvider tenantProvider, Services.DiskQuotaService quotaService)
    {
        var taskExists = await db.TaskItems.AnyAsync(t => t.Id == id);
        if (!taskExists) return Results.NotFound();

        var (errorResult, fileName, fileUrl) = await Utils.UploadHelper.HandleUploadAsync(request, tenantProvider, quotaService);
        if (errorResult != null) return errorResult;

        var attachment = new TaskAttachment
        {
            TaskItemId = id,
            FileName = fileName!,
            FilePath = fileUrl!
        };
        db.TaskAttachments.Add(attachment);
        await db.SaveChangesAsync();
        
        return Results.Created($"/api/tasks/{id}/attachments/{attachment.Id}", attachment);
    }

    public static async Task<IResult> DeleteTaskComment(SanadDbContext db, Guid id, Guid commentId)
    {
        var comment = await db.TaskComments.FirstOrDefaultAsync(c => c.Id == commentId && c.TaskItemId == id);
        if (comment == null) return Results.NotFound();
        
        db.TaskComments.Remove(comment);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public static async Task<IResult> DeleteTaskAttachment(SanadDbContext db, Guid id, Guid attachmentId, Sanad.Api.Services.ITenantProvider tenantProvider)
    {
        var attachment = await db.TaskAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.TaskItemId == id);
        if (attachment == null) return Results.NotFound();

        var username = tenantProvider.GetUsername();
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", username, attachment.FilePath.TrimStart('/'));
        
        db.TaskAttachments.Remove(attachment);
        await db.SaveChangesAsync();

        try
        {
            File.Delete(filePath);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting file {filePath}: {ex.Message}");
        }

        return Results.NoContent();
    }
}

public record StatusUpdateRequest(Models.TaskStatus Status);

public record ReorderTasksRequest(List<TaskUpdateDto> Tasks);
public record TaskUpdateDto(Guid Id, Models.TaskStatus Status, int Order);
