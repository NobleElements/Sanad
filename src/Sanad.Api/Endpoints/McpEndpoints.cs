using System.ComponentModel;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using Sanad.Api.Data;
using Sanad.Api.Models;


namespace Sanad.Api.Endpoints;

[McpServerToolType]
public class McpEndpoints
{
    private readonly SanadDbContext _db;
    private readonly Services.IBookSearchService _searchService;
    private readonly Services.FileManagerService _fileManager;

    private readonly Services.ITenantProvider _tenantProvider;
    private readonly Services.DiskQuotaService _quotaService;
    private readonly AdminDbContext _adminDb;

    public McpEndpoints(SanadDbContext db, Services.IBookSearchService searchService, Services.FileManagerService fileManager, Services.ITenantProvider tenantProvider, Services.DiskQuotaService quotaService, AdminDbContext adminDb)
    {
        _db = db;
        _searchService = searchService;
        _fileManager = fileManager;
        _tenantProvider = tenantProvider;
        _quotaService = quotaService;
        _adminDb = adminDb;
    }



    [McpServerTool, Description("Get all available storage tiers")]
    public async Task<List<StorageTier>> GetTiers()
    {
        return await _adminDb.Tiers.ToListAsync();
    }

    [McpServerTool, Description("Get current storage status for the authenticated user")]
    public async Task<object> GetStorageStatus()
    {
        var username = _tenantProvider.GetUsername();
        var user = await _adminDb.Users.Include(u => u.Tier).FirstOrDefaultAsync(u => u.Username == username);
        
        if (user == null) throw new Exception("User not found");

        var userPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", username);
        var diskUsed = _quotaService.GetDirectorySize(userPath);
        var diskLimitBytes = user.Tier?.DiskLimitBytes ?? (1L * Constants.BytesPerKb * Constants.BytesPerKb * Constants.BytesPerKb);

        return new 
        {
            DiskUsedBytes = diskUsed,
            DiskLimitBytes = diskLimitBytes,
            TierName = user.Tier?.Name ?? "Unknown",
            IsAdmin = user.IsAdmin
        };
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

    [McpServerTool, Description("Get specific task details including comments and attachments")]
    public async Task<object?> GetTaskDetails(Guid id)
    {
        var task = await _db.TaskItems
            .Include(t => t.Comments.OrderBy(c => c.CreatedAt))
            .Include(t => t.Attachments)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);
            
        if (task == null) return null;
        return task;
    }

    [McpServerTool, Description("Update the status of a specific task (e.g. ToDo, InProgress, Done)")]
    public async Task<bool> UpdateTaskStatus(Guid taskId, string statusStr)
    {
        var task = await _db.TaskItems.FindAsync(taskId);
        if (task == null) return false;
        
        if (Enum.TryParse<Sanad.Api.Models.TaskStatus>(statusStr, true, out var newStatus))
        {
            task.Status = newStatus;
            task.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }
        return false;
    }

    [McpServerTool, Description("Add a rich-text comment to a task")]
    public async Task<TaskComment?> AddTaskComment(Guid taskId, string text)
    {
        var taskExists = await _db.TaskItems.AnyAsync(t => t.Id == taskId);
        if (!taskExists) return null;

        var comment = new TaskComment { TaskItemId = taskId, Text = text };
        _db.TaskComments.Add(comment);
        await _db.SaveChangesAsync();
        return comment;
    }

    [McpServerTool, Description("Delete a specific task comment")]
    public async Task<bool> DeleteTaskComment(Guid commentId)
    {
        var comment = await _db.TaskComments.FindAsync(commentId);
        if (comment == null) return false;

        _db.TaskComments.Remove(comment);
        await _db.SaveChangesAsync();
        return true;
    }

    [McpServerTool, Description("Attach a local file to a task. Provide the absolute file path on disk.")]
    public async Task<TaskAttachment?> AttachFileToTask(Guid taskId, string localFilePath)
    {
        var taskExists = await _db.TaskItems.AnyAsync(t => t.Id == taskId);
        if (!taskExists || !File.Exists(localFilePath)) return null;

        var fileInfo = new System.IO.FileInfo(localFilePath);
        var username = _tenantProvider.GetUsername();
        
        var canUpload = await _quotaService.CanUploadAsync(username, fileInfo.Length);
        if (!canUpload) return null;
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", username, "attachments");
        Directory.CreateDirectory(uploadsDir);

        var fileName = Path.GetFileName(localFilePath);
        var (uniqueFileName, destPath) = Utils.FileUtils.GenerateUniqueFile(uploadsDir, Path.GetExtension(localFilePath));

        try
        {
            using var sourceStream = new System.IO.FileStream(localFilePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, true);
            using var destinationStream = new System.IO.FileStream(destPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, true);
            await sourceStream.CopyToAsync(destinationStream);
        }
        catch (Exception)
        {
            return null;
        }

        var attachment = new TaskAttachment
        {
            TaskItemId = taskId,
            FileName = fileName,
            FilePath = $"/api/attachments/{uniqueFileName}"
        };
        _db.TaskAttachments.Add(attachment);
        await _db.SaveChangesAsync();
        return attachment;
    }

    [McpServerTool, Description("Delete a specific task attachment")]
    public async Task<bool> DeleteTaskAttachment(Guid attachmentId)
    {
        var attachment = await _db.TaskAttachments.FindAsync(attachmentId);
        if (attachment == null) return false;

        var username = _tenantProvider.GetUsername();
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", username, attachment.FilePath.TrimStart('/'));

        _db.TaskAttachments.Remove(attachment);
        await _db.SaveChangesAsync();

        if (File.Exists(filePath))
        {
            try
            {
                File.Delete(filePath);
            }
            catch (Exception)
            {
                // Ignore file deletion error if DB update succeeded
            }
        }

        return true;
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

    // Habits Tools
    [McpServerTool, Description("Get all habits and their logs")]
    public async Task<List<Habit>> GetHabits()
    {
        return await _db.Habits
            .Include(h => h.Logs)
            .Where(h => !h.IsDeleted)
            .OrderBy(h => h.Order)
            .ThenByDescending(h => h.CreatedAt)
            .ToListAsync();
    }

    [McpServerTool, Description("Create a new habit")]
    public async Task<Habit> CreateHabit(string name, string icon, string frequency)
    {
        var habit = new Habit
        {
            Id = Guid.NewGuid().ToString(),
            Name = name,
            Icon = icon,
            Frequency = frequency,
            CreatedAt = DateTime.UtcNow
        };
        _db.Habits.Add(habit);
        await _db.SaveChangesAsync();
        return habit;
    }

    [McpServerTool, Description("Update an existing habit")]
    public async Task<Habit?> UpdateHabit(string id, string name, string icon, string frequency)
    {
        var habit = await _db.Habits.FindAsync(id);
        if (habit == null || habit.IsDeleted) return null;

        habit.Name = name;
        habit.Icon = icon;
        habit.Frequency = frequency;

        await _db.SaveChangesAsync();
        return habit;
    }

    [McpServerTool, Description("Delete a habit by ID")]
    public async Task<bool> DeleteHabit(string id)
    {
        var habit = await _db.Habits.FindAsync(id);
        if (habit == null || habit.IsDeleted) return false;

        habit.IsDeleted = true;
        await _db.SaveChangesAsync();
        return true;
    }

    [McpServerTool, Description("Toggle habit completion for a specific date")]
    public async Task<HabitLog?> ToggleHabitLog(string id, DateTime date)
    {
        var habit = await _db.Habits.FindAsync(id);
        if (habit == null || habit.IsDeleted) return null;

        var targetDate = date.Date;
        var log = await _db.HabitLogs.FirstOrDefaultAsync(l => l.HabitId == id && l.Date.Date == targetDate);
        if (log != null)
        {
            log.Completed = !log.Completed;
        }
        else
        {
            log = new HabitLog
            {
                Id = Guid.NewGuid().ToString(),
                HabitId = id,
                Date = targetDate,
                Completed = true
            };
            _db.HabitLogs.Add(log);
        }

        await _db.SaveChangesAsync();
        return log;
    }

    [McpServerTool, Description("Reorder habits using a list of their IDs")]
    public async Task<bool> ReorderHabits(List<string> habitIds)
    {
        var habits = await _db.Habits.Where(h => habitIds.Contains(h.Id)).ToListAsync();
        
        for (int i = 0; i < habitIds.Count; i++)
        {
            var habit = habits.FirstOrDefault(h => h.Id == habitIds[i]);
            if (habit != null)
            {
                habit.Order = i;
            }
        }

        await _db.SaveChangesAsync();
        return true;
    }

    // File Manager Tools
    [McpServerTool, Description("Get contents of a specific folder in the File Manager. If folderId is null, returns the root folder.")]
    public async Task<object> GetFolderContents(int? folderId = null)
    {
        return await _fileManager.GetFolderContentsAsync(folderId);
    }

    [McpServerTool, Description("Search for files and folders in the File Manager by name.")]
    public async Task<object> SearchFiles(string query)
    {
        return await _fileManager.SearchFilesAsync(query);
    }

    [McpServerTool, Description("Upload a local file from disk to the File Manager. Provide the absolute local file path.")]
    public async Task<FileItem?> UploadFileToSanad(string localFilePath, int? folderId = null)
    {
        return await _fileManager.UploadLocalFileAsync(localFilePath, folderId);
    }

    [McpServerTool, Description("Upload a local folder (recursively) to the File Manager. Provide the absolute local folder path and optionally the target parent Folder ID.")]
    public async Task<Folder?> UploadFolderToSanad(string localFolderPath, int? targetParentId = null)
    {
        return await _fileManager.UploadLocalFolderAsync(localFolderPath, targetParentId);
    }

    [McpServerTool, Description("Download a file from the File Manager to a local directory. Provide the File ID and destination absolute path (or directory).")]
    public async Task<bool> DownloadFileFromSanad(int fileId, string destinationPath)
    {
        return await _fileManager.DownloadFileToLocalAsync(fileId, destinationPath);
    }

    [McpServerTool, Description("Download an entire folder (recursively) from the File Manager to a local directory.")]
    public async Task<bool> DownloadFolderFromSanad(int folderId, string destinationDirectory)
    {
        return await _fileManager.DownloadFolderToLocalAsync(folderId, destinationDirectory);
    }
}
