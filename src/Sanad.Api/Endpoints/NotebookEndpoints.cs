using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class NotebookEndpoints
{
    public static void MapNotebookEndpoints(this IEndpointRouteBuilder app)
    {
        // Notebooks CRUD
        app.MapGet("/api/notebooks", GetNotebooks);
        app.MapPost("/api/notebooks", CreateNotebook);
        app.MapPut("/api/notebooks/{id}", UpdateNotebook);
        app.MapDelete("/api/notebooks/{id}", DeleteNotebook);

        // Notes CRUD
        app.MapGet("/api/notebooks/{notebookId}/notes", GetNotes);
        app.MapPost("/api/notebooks/{notebookId}/notes", CreateNote);
        app.MapGet("/api/notes/{id}", GetNote);
        app.MapPut("/api/notes/{id}", UpdateNote);
        app.MapDelete("/api/notes/{id}", DeleteNote);

        // Search & latest
        app.MapGet("/api/notes/latest", GetLatestNote);
        app.MapGet("/api/notes/search", SearchNotes);

        // Image upload
        app.MapPost("/api/notes/{id}/images", UploadNoteImage);
    }

    static async Task<IResult> GetNotebooks(SanadDbContext db) =>
        Results.Ok(await db.Notebooks
            .Include(n => n.Notes)
            .OrderBy(n => n.SortOrder).ThenBy(n => n.Name)
            .Select(n => new {
                n.Id,
                n.Name,
                n.SortOrder,
                n.CreatedAt,
                Notes = n.Notes.OrderByDescending(note => note.UpdatedAt).Select(note => new {
                    note.Id,
                    note.Title,
                    note.NotebookId,
                    note.CreatedAt,
                    note.UpdatedAt
                })
            })
            .ToListAsync());

    static async Task<IResult> CreateNotebook(SanadDbContext db, Notebook input)
    {
        if (string.IsNullOrWhiteSpace(input.Name)) return Results.BadRequest("Name is required");
        db.Notebooks.Add(input);
        await db.SaveChangesAsync();
        return Results.Created($"/api/notebooks/{input.Id}", new {
            input.Id,
            input.Name,
            input.SortOrder,
            input.CreatedAt,
            Notes = Array.Empty<object>()
        });
    }

    static async Task<IResult> UpdateNotebook(SanadDbContext db, Guid id, Notebook updated)
    {
        var notebook = await db.Notebooks.FindAsync(id);
        if (notebook == null) return Results.NotFound();
        if (string.IsNullOrWhiteSpace(updated.Name)) return Results.BadRequest("Name is required");
        notebook.Name = updated.Name;
        notebook.SortOrder = updated.SortOrder;
        await db.SaveChangesAsync();
        return Results.Ok(notebook);
    }

    static async Task<IResult> DeleteNotebook(SanadDbContext db, Guid id, Sanad.Api.Services.ITenantProvider tenantProvider)
    {
        var notebook = await db.Notebooks.Include(n => n.Notes).FirstOrDefaultAsync(n => n.Id == id);
        if (notebook == null) return Results.NotFound();

        var username = tenantProvider.GetUsername();
        var filesToDelete = new List<string>();

        foreach (var note in notebook.Notes)
        {
            filesToDelete.AddRange(Utils.UploadHelper.GetAttachmentPathsFromHtml(note.Content, username));
        }

        db.Notes.RemoveRange(notebook.Notes);
        db.Notebooks.Remove(notebook);
        await db.SaveChangesAsync();

        Utils.UploadHelper.DeleteFiles(filesToDelete);

        return Results.NoContent();
    }

    static async Task<IResult> GetNotes(SanadDbContext db, Guid notebookId)
    {
        var exists = await db.Notebooks.AnyAsync(n => n.Id == notebookId);
        if (!exists) return Results.NotFound();
        var notes = await db.Notes
            .Where(n => n.NotebookId == notebookId)
            .OrderByDescending(n => n.UpdatedAt)
            .Select(n => new { n.Id, n.Title, n.NotebookId, n.CreatedAt, n.UpdatedAt })
            .ToListAsync();
        return Results.Ok(notes);
    }

    static async Task<IResult> CreateNote(SanadDbContext db, Guid notebookId, Note input)
    {
        var exists = await db.Notebooks.AnyAsync(n => n.Id == notebookId);
        if (!exists) return Results.NotFound();
        if (string.IsNullOrWhiteSpace(input.Title)) return Results.BadRequest("Title is required");
        input.NotebookId = notebookId;
        db.Notes.Add(input);
        await db.SaveChangesAsync();
        return Results.Created($"/api/notes/{input.Id}", input);
    }

    static async Task<IResult> GetNote(SanadDbContext db, Guid id)
    {
        var note = await db.Notes.FindAsync(id);
        if (note == null) return Results.NotFound();
        return Results.Ok(note);
    }

    static async Task<IResult> UpdateNote(SanadDbContext db, Guid id, Note updated)
    {
        var note = await db.Notes.FindAsync(id);
        if (note == null) return Results.NotFound();
        note.Title = updated.Title;
        note.Content = updated.Content;
        note.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(note);
    }

    static async Task<IResult> DeleteNote(SanadDbContext db, Guid id, Sanad.Api.Services.ITenantProvider tenantProvider)
    {
        var note = await db.Notes.FindAsync(id);
        if (note == null) return Results.NotFound();

        var username = tenantProvider.GetUsername();
        var filesToDelete = Utils.UploadHelper.GetAttachmentPathsFromHtml(note.Content, username);

        db.Notes.Remove(note);
        await db.SaveChangesAsync();

        Utils.UploadHelper.DeleteFiles(filesToDelete);

        return Results.NoContent();
    }

    static async Task<IResult> GetLatestNote(SanadDbContext db)
    {
        var note = await db.Notes
            .OrderByDescending(n => n.UpdatedAt)
            .Select(n => new { n.Id, n.Title, n.NotebookId, n.CreatedAt, n.UpdatedAt })
            .FirstOrDefaultAsync();
        if (note == null) return Results.NoContent();
        return Results.Ok(note);
    }

    static async Task<IResult> SearchNotes(SanadDbContext db, string? q)
    {
        if (string.IsNullOrWhiteSpace(q)) return Results.Ok(Array.Empty<object>());
        var lower = q.ToLower();
        var results = await db.Notes
            .Where(n => n.Title.ToLower().Contains(lower) || (n.Content != null && n.Content.ToLower().Contains(lower)))
            .OrderByDescending(n => n.UpdatedAt)
            .Select(n => new { n.Id, n.Title, n.NotebookId, n.CreatedAt, n.UpdatedAt })
            .Take(20)
            .ToListAsync();
        return Results.Ok(results);
    }

    static async Task<IResult> UploadNoteImage(HttpRequest request, SanadDbContext db, Services.ITenantProvider tenantProvider, Services.DiskQuotaService quotaService, Guid id)
    {
        var noteExists = await db.Notes.AnyAsync(n => n.Id == id);
        if (!noteExists) return Results.NotFound();

        var (errorResult, _, fileUrl) = await Utils.UploadHelper.HandleUploadAsync(request, tenantProvider, quotaService);
        if (errorResult != null) return errorResult;

        return Results.Ok(new { url = fileUrl });
    }
}
