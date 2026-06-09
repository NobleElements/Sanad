using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

[McpServerToolType]
public class McpEndpoints
{
    private readonly SanadDbContext _db;

    public McpEndpoints(SanadDbContext db)
    {
        _db = db;
    }

    // Thoughts Tools
    [McpServerTool, Description("Get a list of thoughts")]
    public async Task<List<Thought>> GetThoughts()
    {
        return await _db.Thoughts.OrderByDescending(t => t.CreatedAt).Take(20).ToListAsync();
    }

    [McpServerTool, Description("Create a new thought")]
    public async Task<Thought> CreateThought(string content)
    {
        var thought = new Thought { Content = content };
        _db.Thoughts.Add(thought);
        await _db.SaveChangesAsync();
        return thought;
    }

    [McpServerTool, Description("Delete a thought by ID")]
    public async Task<bool> DeleteThought(string id)
    {
        var thought = await _db.Thoughts.FindAsync(id);
        if (thought != null)
        {
            _db.Thoughts.Remove(thought);
            await _db.SaveChangesAsync();
            return true;
        }
        return false;
    }

    // Tasks Tools
    [McpServerTool, Description("Get a list of tasks")]
    public async Task<List<TaskItem>> GetTasks()
    {
        return await _db.TaskItems.OrderByDescending(t => t.CreatedAt).Take(20).ToListAsync();
    }

    [McpServerTool, Description("Create a new task")]
    public async Task<TaskItem> CreateTask(string title, string? content = null)
    {
        var task = new TaskItem { Title = title, Content = content, Status = Models.TaskStatus.ToDo };
        _db.TaskItems.Add(task);
        await _db.SaveChangesAsync();
        return task;
    }

    [McpServerTool, Description("Delete a task by ID")]
    public async Task<bool> DeleteTask(Guid id)
    {
        var task = await _db.TaskItems.FindAsync(id);
        if (task != null)
        {
            _db.TaskItems.Remove(task);
            await _db.SaveChangesAsync();
            return true;
        }
        return false;
    }

    // Transactions Tools
    [McpServerTool, Description("Get recent transactions")]
    public async Task<List<Transaction>> GetTransactions()
    {
        return await _db.Transactions.OrderByDescending(t => t.Date).Take(20).ToListAsync();
    }

    [McpServerTool, Description("Create a new transaction")]
    public async Task<Transaction> CreateTransaction(decimal amount, string description, string type, Guid categoryId)
    {
        var tx = new Transaction { Amount = amount, CategoryId = categoryId, Description = description, Type = type, Date = DateTime.UtcNow };
        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync();
        return tx;
    }

    [McpServerTool, Description("Delete a transaction by ID")]
    public async Task<bool> DeleteTransaction(Guid id)
    {
        var tx = await _db.Transactions.FindAsync(id);
        if (tx != null)
        {
            _db.Transactions.Remove(tx);
            await _db.SaveChangesAsync();
            return true;
        }
        return false;
    }

    // Notes Tools
    [McpServerTool, Description("Get recent notes")]
    public async Task<List<Note>> GetNotes()
    {
        return await _db.Notes.OrderByDescending(n => n.UpdatedAt).Take(20).ToListAsync();
    }

    [McpServerTool, Description("Create a new note")]
    public async Task<Note> CreateNote(string title, string content, Guid notebookId)
    {
        var note = new Note { Title = title, Content = content, NotebookId = notebookId };
        _db.Notes.Add(note);
        await _db.SaveChangesAsync();
        return note;
    }

    [McpServerTool, Description("Delete a note by ID")]
    public async Task<bool> DeleteNote(Guid id)
    {
        var note = await _db.Notes.FindAsync(id);
        if (note != null)
        {
            _db.Notes.Remove(note);
            await _db.SaveChangesAsync();
            return true;
        }
        return false;
    }
}
