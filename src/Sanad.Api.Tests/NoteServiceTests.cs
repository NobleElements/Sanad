using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class NoteServiceTests
{
    [Fact]
    public async Task Notebook_CreateUpdateDelete_Works()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new NoteService(db, new TestTenantProvider());

        // 1. Create
        var notebook = await service.CreateNotebookAsync("Personal", 1);
        Assert.NotNull(notebook);
        Assert.Equal("Personal", notebook.Name);
        Assert.Equal(1, notebook.SortOrder);

        // 2. Update
        var updated = await service.UpdateNotebookAsync(notebook.Id, "Personal Notes", 5);
        Assert.NotNull(updated);
        Assert.Equal("Personal Notes", updated!.Name);
        Assert.Equal(5, updated.SortOrder);

        // Read back from the store, not the tracked instance, to prove the update was saved
        db.ChangeTracker.Clear();
        var persisted = await db.Notebooks.FindAsync(notebook.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Personal Notes", persisted!.Name);
        Assert.Equal(5, persisted.SortOrder);

        // 3. Delete
        var deleted = await service.DeleteNotebookAsync(notebook.Id);
        Assert.True(deleted);
        db.ChangeTracker.Clear();
        Assert.Null(await db.Notebooks.FindAsync(notebook.Id));
    }

    [Fact]
    public async Task Note_CreateUpdateMoveDelete_Works()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new NoteService(db, new TestTenantProvider());

        var nb1 = await service.CreateNotebookAsync("Folder A");
        var nb2 = await service.CreateNotebookAsync("Folder B");

        // 1. Create note
        var note = await service.CreateNoteAsync(nb1.Id, "Meeting Notes", "<p>Discussion points</p>");
        Assert.NotNull(note);
        Assert.Equal("Meeting Notes", note!.Title);
        Assert.Equal(nb1.Id, note.NotebookId);

        // 2. Update content and move to another notebook
        var updated = await service.UpdateNoteAsync(note.Id, "Revised Notes", "<p>Updated</p>", nb2.Id);
        Assert.NotNull(updated);
        Assert.Equal("Revised Notes", updated!.Title);
        Assert.Equal("<p>Updated</p>", updated.Content);
        Assert.Equal(nb2.Id, updated.NotebookId);

        // 3. Get by ID (from the store, not the tracked instance, to prove the update was saved)
        db.ChangeTracker.Clear();
        var fetched = await service.GetNoteByIdAsync(note.Id);
        Assert.NotNull(fetched);
        Assert.Equal("Revised Notes", fetched!.Title);
        Assert.Equal("<p>Updated</p>", fetched.Content);
        Assert.Equal(nb2.Id, fetched.NotebookId);

        // 4. Delete
        var deleted = await service.DeleteNoteAsync(note.Id);
        Assert.True(deleted);
        db.ChangeTracker.Clear();
        Assert.Null(await service.GetNoteByIdAsync(note.Id));
    }

    [Fact]
    public async Task SyncNotes_ReturnsOnlyNotesModifiedSinceTimestamp()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new NoteService(db, new TestTenantProvider());

        var notebook = await service.CreateNotebookAsync("Sync Notebook");

        var cutoff = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);

        var oldNote = new Note
        {
            Id = Guid.NewGuid(),
            NotebookId = notebook.Id,
            Title = "Old Note",
            Content = "Old",
            UpdatedAt = cutoff.AddDays(-2)
        };
        var recentNote1 = new Note
        {
            Id = Guid.NewGuid(),
            NotebookId = notebook.Id,
            Title = "Recent 1",
            Content = "Recent",
            UpdatedAt = cutoff.AddHours(1)
        };
        var recentNote2 = new Note
        {
            Id = Guid.NewGuid(),
            NotebookId = notebook.Id,
            Title = "Recent 2",
            Content = "Recent",
            UpdatedAt = cutoff.AddDays(1)
        };

        db.Notes.AddRange(oldNote, recentNote1, recentNote2);
        await db.SaveChangesAsync();

        // Query sync with since = cutoff
        var modifiedIds = await service.SyncNotesAsync(cutoff);

        Assert.Equal(2, modifiedIds.Count);
        Assert.Contains(recentNote1.Id, modifiedIds);
        Assert.Contains(recentNote2.Id, modifiedIds);
        Assert.DoesNotContain(oldNote.Id, modifiedIds);

        // Query sync without timestamp -> returns all notes
        var allIds = await service.SyncNotesAsync(null);
        Assert.Equal(3, allIds.Count);
    }

    [Fact]
    public async Task DeleteNote_DeletesImagesFromTenantFolder_ButNeverOutsideIt()
    {
        using var dataRoot = new DisposableTempDirectory();
        var tenantPath = Path.Combine(dataRoot.Path, "alice");
        var attachmentsDir = Path.Combine(tenantPath, "attachments");
        Directory.CreateDirectory(attachmentsDir);
        var ownImage = Path.Combine(attachmentsDir, "pic.png");
        File.WriteAllText(ownImage, "image");

        // Another tenant's database next to alice's folder, referenced via path traversal in the note HTML.
        var victimDir = Path.Combine(dataRoot.Path, "bob");
        Directory.CreateDirectory(victimDir);
        var victimDb = Path.Combine(victimDir, "sanad.db");
        File.WriteAllText(victimDb, "bob's data");

        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new NoteService(db, new TestTenantProvider("alice", tenantPath));
        var notebook = await service.CreateNotebookAsync("Notebook");
        var note = await service.CreateNoteAsync(notebook.Id, "Note",
            @"<img src=""/api/attachments/pic.png"" /><img src=""/api/attachments/../../bob/sanad.db"" />");

        Assert.True(await service.DeleteNoteAsync(note!.Id));

        Assert.False(File.Exists(ownImage));
        Assert.True(File.Exists(victimDb));
    }

    [Fact]
    public async Task DeleteNotebook_DeletesImagesOfItsNotesFromTenantFolder()
    {
        using var tenantDir = new DisposableTempDirectory();
        var attachmentsDir = Path.Combine(tenantDir.Path, "attachments");
        Directory.CreateDirectory(attachmentsDir);
        var image = Path.Combine(attachmentsDir, "pic.png");
        File.WriteAllText(image, "image");

        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new NoteService(db, new TestTenantProvider("alice", tenantDir.Path));
        var notebook = await service.CreateNotebookAsync("Notebook");
        await service.CreateNoteAsync(notebook.Id, "Note", @"<img src=""/api/attachments/pic.png"" />");

        Assert.True(await service.DeleteNotebookAsync(notebook.Id));

        Assert.False(File.Exists(image));
    }
}
