using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;

namespace Sanad.Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tasks", (ITaskService svc, string? project, Models.TaskStatus? status, bool? unscheduledOnly) => GetTasks(svc, project, status, unscheduledOnly));
        app.MapGet("/api/tasks/{id}", (ITaskService svc, Guid id) => GetTask(svc, id));
        app.MapPost("/api/tasks", (ITaskService svc, TaskItem input) => CreateTask(svc, input));
        app.MapPut("/api/tasks/{id}", (ITaskService svc, Guid id, TaskItem updated) => UpdateTask(svc, id, updated));
        app.MapPatch("/api/tasks/{id}/status", (ITaskService svc, Guid id, StatusUpdateRequest req) => UpdateTaskStatus(svc, id, req));
        app.MapPatch("/api/tasks/reorder", (ITaskService svc, ReorderTasksRequest req) => ReorderTasks(svc, req));
        app.MapPut("/api/tasks/projects/rename", (ITaskService svc, RenameProjectRequest req) => RenameProject(svc, req));
        app.MapDelete("/api/tasks/projects/{projectName}", (ITaskService svc, string projectName) => DeleteProject(svc, projectName));
        app.MapDelete("/api/tasks/{id}", (ITaskService svc, Guid id) => DeleteTask(svc, id));
        app.MapPost("/api/tasks/{id}/comments", (ITaskService svc, Guid id, TaskComment comment) => CreateTaskComment(svc, id, comment));
        app.MapPost("/api/tasks/{id}/attachments", CreateTaskAttachment);
        app.MapDelete("/api/tasks/{id}/comments/{commentId}", (ITaskService svc, Guid id, Guid commentId) => DeleteTaskComment(svc, id, commentId));
        app.MapDelete("/api/tasks/{id}/attachments/{attachmentId}", (ITaskService svc, Guid id, Guid attachmentId) => DeleteTaskAttachment(svc, id, attachmentId));
    }

    public static async Task<IResult> GetTasks(ITaskService svc, string? project, Models.TaskStatus? status, bool? unscheduledOnly)
    {
        var tasks = await svc.GetTasksAsync(project, status, unscheduledOnly);
        return Results.Ok(tasks);
    }

    public static async Task<IResult> GetTask(ITaskService svc, Guid id)
    {
        var task = await svc.GetTaskDetailsAsync(id);
        if (task == null) return Results.NotFound();
        return Results.Ok(new { Task = task, Comments = task.Comments, Attachments = task.Attachments });
    }

    public static async Task<IResult> CreateTask(ITaskService svc, TaskItem input)
    {
        if (string.IsNullOrWhiteSpace(input.Title)) return Results.BadRequest("Title is required");
        var task = await svc.CreateTaskAsync(input);
        return Results.Created($"/api/tasks/{task.Id}", task);
    }

    public static async Task<IResult> UpdateTask(ITaskService svc, Guid id, TaskItem updatedTask)
    {
        if (string.IsNullOrWhiteSpace(updatedTask.Title)) return Results.BadRequest("Title is required");
        var task = await svc.UpdateTaskAsync(id, updatedTask);
        if (task == null) return Results.NotFound();
        return Results.NoContent();
    }

    public static async Task<IResult> UpdateTaskStatus(ITaskService svc, Guid id, StatusUpdateRequest request)
    {
        var success = await svc.UpdateTaskStatusAsync(id, request.Status);
        if (!success) return Results.NotFound();
        return Results.NoContent();
    }

    public static async Task<IResult> ReorderTasks(ITaskService svc, ReorderTasksRequest request)
    {
        await svc.ReorderTasksAsync(request.Tasks);
        return Results.NoContent();
    }

    public static async Task<IResult> DeleteTask(ITaskService svc, Guid id)
    {
        var success = await svc.DeleteTaskAsync(id);
        if (!success) return Results.NotFound();
        return Results.NoContent();
    }

    public static async Task<IResult> CreateTaskComment(ITaskService svc, Guid id, TaskComment comment)
    {
        if (string.IsNullOrWhiteSpace(comment.Text)) return Results.BadRequest("Comment text is required");
        var created = await svc.AddCommentAsync(id, comment.Text);
        if (created == null) return Results.NotFound();
        return Results.Created($"/api/tasks/{id}/comments/{created.Id}", created);
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

    public static async Task<IResult> DeleteTaskComment(ITaskService svc, Guid id, Guid commentId)
    {
        var success = await svc.DeleteCommentAsync(id, commentId);
        if (!success) return Results.NotFound();
        return Results.NoContent();
    }

    public static async Task<IResult> DeleteTaskAttachment(ITaskService svc, Guid id, Guid attachmentId)
    {
        var success = await svc.DeleteAttachmentAsync(id, attachmentId);
        if (!success) return Results.NotFound();
        return Results.NoContent();
    }

    public static async Task<IResult> RenameProject(ITaskService svc, RenameProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OldName) || string.IsNullOrWhiteSpace(request.NewName))
            return Results.BadRequest("Old and new project names are required");

        await svc.RenameProjectAsync(request.OldName, request.NewName);
        return Results.NoContent();
    }

    public static Task<IResult> RenameProject(SanadDbContext db, RenameProjectRequest request) =>
        RenameProject(new TaskService(db, null!, null!), request);

    public static async Task<IResult> DeleteProject(ITaskService svc, string projectName)
    {
        if (string.IsNullOrWhiteSpace(projectName))
            return Results.BadRequest("Project name is required");

        await svc.DeleteProjectAsync(projectName);
        return Results.NoContent();
    }

    public static Task<IResult> DeleteProject(SanadDbContext db, string projectName) =>
        DeleteProject(new TaskService(db, null!, null!), projectName);
}

public record RenameProjectRequest(string OldName, string NewName);
public record StatusUpdateRequest(Models.TaskStatus Status);
public record ReorderTasksRequest(List<TaskUpdateDto> Tasks);
