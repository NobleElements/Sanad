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
    private readonly Sanad.Api.Services.IBookSearchService _searchService;

    public McpEndpoints(SanadDbContext db, Sanad.Api.Services.IBookSearchService searchService)
    {
        _db = db;
        _searchService = searchService;
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
    [McpServerTool, Description("Get transaction categories")]
    public async Task<List<TransactionCategory>> GetCategories()
    {
        return await _db.TransactionCategories.ToListAsync();
    }

    [McpServerTool, Description("Create a transaction category")]
    public async Task<TransactionCategory> CreateCategory(string name, decimal monthlyBudget, string colorHex = "#cccccc")
    {
        var category = new TransactionCategory { Name = name, MonthlyBudget = monthlyBudget, ColorHex = colorHex };
        _db.TransactionCategories.Add(category);
        await _db.SaveChangesAsync();
        return category;
    }

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

    // Books Tools
    [McpServerTool, Description("Get all books")]
    public async Task<List<Book>> GetBooks()
    {
        return await _db.Books.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    [McpServerTool, Description("Create a new book")]
    public async Task<Book> CreateBook(string title, string author, string coverUrl, int totalPages)
    {
        var book = new Book { Title = title, Author = author, CoverUrl = coverUrl, TotalPages = totalPages };
        _db.Books.Add(book);
        await _db.SaveChangesAsync();
        return book;
    }

    [McpServerTool, Description("Search for books from external sources (Google Books, OpenLibrary, Apple Books)")]
    public async Task<List<Sanad.Api.Services.BookSearchResult>> SearchBooks(string query)
    {
        return await _searchService.SearchBooksAsync(query);
    }

    [McpServerTool, Description("Update an existing book")]
    public async Task<Book?> UpdateBook(int id, string title, string author, string coverUrl, int totalPages)
    {
        var book = await _db.Books.FindAsync(id);
        if (book != null)
        {
            book.Title = title;
            book.Author = author;
            book.CoverUrl = coverUrl;
            book.TotalPages = totalPages;
            await _db.SaveChangesAsync();
        }
        return book;
    }

    [McpServerTool, Description("Delete a book by ID")]
    public async Task<bool> DeleteBook(int id)
    {
        var book = await _db.Books.FindAsync(id);
        if (book != null)
        {
            _db.Books.Remove(book);
            await _db.SaveChangesAsync();
            return true;
        }
        return false;
    }

    // Reading Tools
    [McpServerTool, Description("Get all reading periods")]
    public async Task<List<ReadingPeriod>> GetReadingPeriods()
    {
        return await _db.ReadingPeriods
            .Include(p => p.Book)
            .Include(p => p.Plans)
            .Include(p => p.Logs)
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();
    }

    [McpServerTool, Description("Get current active reading period")]
    public async Task<object?> GetCurrentReading()
    {
        var current = await _db.ReadingPeriods
            .Include(p => p.Book)
            .Include(p => p.Plans)
            .Include(p => p.Logs)
            .Where(p => p.Status == "Reading")
            .OrderByDescending(p => p.StartDate)
            .FirstOrDefaultAsync();

        if (current == null) return null;

        var highestPage = current.Logs.Any() ? current.Logs.Max(l => l.EndPage) : 0;
        var currentPlan = current.Plans.OrderBy(p => p.OrderIndex)
            .FirstOrDefault(p => highestPage >= p.StartPage && highestPage < p.EndPage) 
            ?? current.Plans.OrderBy(p => p.OrderIndex).FirstOrDefault(p => highestPage < p.StartPage)
            ?? current.Plans.LastOrDefault();

        return new 
        {
            Period = current,
            CurrentPage = highestPage,
            CurrentChapter = currentPlan?.Title,
            PagesLeftInChapter = currentPlan != null ? (currentPlan.EndPage - highestPage) : 0
        };
    }

    [McpServerTool, Description("Start a new reading period")]
    public async Task<ReadingPeriod> StartReadingPeriod(int bookId)
    {
        var period = new ReadingPeriod
        {
            BookId = bookId,
            Status = "Reading",
            StartDate = DateTime.UtcNow,
            Plans = new List<ReadingPlan>()
        };
        _db.ReadingPeriods.Add(period);
        await _db.SaveChangesAsync();
        return period;
    }

    [McpServerTool, Description("Log reading progress")]
    public async Task<ReadingLog?> LogReading(int readingPeriodId, int startPage, int endPage)
    {
        var period = await _db.ReadingPeriods
            .Include(p => p.Book)
            .FirstOrDefaultAsync(p => p.Id == readingPeriodId);
            
        if (period == null) return null;

        var log = new ReadingLog
        {
            ReadingPeriodId = readingPeriodId,
            Date = DateTime.UtcNow,
            StartPage = startPage,
            EndPage = endPage
        };
        _db.ReadingLogs.Add(log);

        if (endPage >= period.Book.TotalPages)
        {
            period.Status = "Completed";
            period.EndDate = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return log;
    }

    [McpServerTool, Description("Update reading status (e.g. Reading, Paused, Completed)")]
    public async Task<ReadingPeriod?> UpdateReadingStatus(int id, string status)
    {
        var period = await _db.ReadingPeriods.FindAsync(id);
        if (period == null) return null;

        if (status == "Reading")
        {
            var otherActive = await _db.ReadingPeriods.Where(p => p.Status == "Reading" && p.Id != id).ToListAsync();
            foreach (var other in otherActive)
            {
                other.Status = "Paused";
            }
        }

        period.Status = status;
        await _db.SaveChangesAsync();
        return period;
    }

    [McpServerTool, Description("Update reading plans for a period")]
    public async Task<List<ReadingPlan>?> UpdateReadingPlans(int id, List<ReadingEndpoints.PlanDto> plans)
    {
        var period = await _db.ReadingPeriods.Include(p => p.Plans).FirstOrDefaultAsync(p => p.Id == id);
        if (period == null) return null;

        _db.ReadingPlans.RemoveRange(period.Plans);
        period.Plans = plans.Select((p, i) => new ReadingPlan
        {
            Title = p.Title,
            StartPage = p.StartPage,
            EndPage = p.EndPage,
            OrderIndex = i
        }).ToList();

        await _db.SaveChangesAsync();
        return period.Plans;
    }

    [McpServerTool, Description("Delete a reading period")]
    public async Task<bool> DeleteReadingPeriod(int id)
    {
        var period = await _db.ReadingPeriods.FindAsync(id);
        if (period != null)
        {
            _db.ReadingPeriods.Remove(period);
            await _db.SaveChangesAsync();
            return true;
        }
        return false;
    }

    // Goals Tools
    [McpServerTool, Description("Get today's goal")]
    public async Task<DailyGoal?> GetTodaysGoal()
    {
        var dateStr = DateTime.Now.ToString("yyyy-MM-dd");
        return await _db.DailyGoals.FindAsync(dateStr);
    }

    [McpServerTool, Description("Set today's goal")]
    public async Task<DailyGoal> SetTodaysGoal(string goalText)
    {
        var dateStr = DateTime.Now.ToString("yyyy-MM-dd");
        var goal = await _db.DailyGoals.FindAsync(dateStr);
        if (goal == null)
        {
            goal = new DailyGoal { DateStr = dateStr, Goal = goalText };
            _db.DailyGoals.Add(goal);
        }
        else
        {
            goal.Goal = goalText;
        }
        await _db.SaveChangesAsync();
        return goal;
    }
}
