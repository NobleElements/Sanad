using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Xunit;

namespace Sanad.Api.Tests;

public class SearchApiTests : IDisposable
{
    private readonly SanadDbContext _context;
    private readonly SqliteConnection _conn;

    public SearchApiTests()
    {
        (_context, _conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
    }

    public void Dispose()
    {
        _context.Dispose();
        _conn.Dispose();
    }

    [Fact]
    public async Task Search_EmptyQuery_ReturnsEmptyResults()
    {
        var result = await SearchEndpoints.HandleSearch(_context, "", null, null);
        var okResult = Assert.IsType<Ok<SearchResponse>>(result);
        Assert.NotNull(okResult.Value);
        Assert.Empty(okResult.Value.Results);
        Assert.Equal(0, okResult.Value.TotalCount);
    }

    [Fact]
    public async Task Search_FindsAcrossAllEntityTypes()
    {
        var testTerm = "AlphaOmega";

        // 1. Thought
        _context.Thoughts.Add(new Thought { Content = $"A random thought about {testTerm} today" });

        // 2. Task
        _context.TaskItems.Add(new TaskItem { Title = $"Finish {testTerm} task", Content = "Details here" });

        // 3. Calendar Event
        _context.CalendarEvents.Add(new CalendarEvent
        {
            Title = $"{testTerm} Meeting",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddHours(1)
        });

        // 4. Finance (Asset, Debt, Transaction)
        _context.Assets.Add(new Asset { Name = $"{testTerm} Gold Reserve", CurrentAmount = 1000, Type = "Cash" });
        _context.Debts.Add(new Debt { Name = $"{testTerm} Car Loan", CurrentAmount = 500, Type = "Loan" });
        var cat = new TransactionCategory { Name = "General", ColorHex = "#000000" };
        _context.TransactionCategories.Add(cat);
        _context.Transactions.Add(new Transaction { Description = $"Buying {testTerm} supplies", Amount = 75, CategoryId = cat.Id, Type = "Expense" });

        // 5. Notebook & Note
        var nb = new Notebook { Name = $"{testTerm} Projects" };
        _context.Notebooks.Add(nb);
        _context.Notes.Add(new Note { NotebookId = nb.Id, Title = $"Deep Dive on {testTerm}", Content = "<p>Here is content</p>" });

        // 6. Book
        _context.Books.Add(new Book { Title = $"The Story of {testTerm}", Author = "Author Name", TotalPages = 250 });

        // 7. Folder & File
        var folder = new Folder { Name = $"{testTerm} Folder" };
        _context.Folders.Add(folder);
        _context.FileItems.Add(new FileItem { Name = $"{testTerm}_Report.pdf", SizeBytes = 2048 });

        // 8. Whiteboard & Whiteboard content
        var canvasDoc = @"{
            ""records"": [
                { ""id"": ""shape:note1"", ""typeName"": ""shape"", ""type"": ""note"", ""props"": { ""text"": ""Remember " + testTerm + @" concept"" } }
            ]
        }";
        _context.Whiteboards.Add(new Whiteboard { Name = $"{testTerm} Board", DocumentJson = canvasDoc });

        // 9. Habit
        _context.Habits.Add(new Habit { Name = $"Daily {testTerm} Routine" });

        // 10. Goal
        _context.DailyGoals.Add(new DailyGoal { DateStr = "2026-08-20", Goal = $"Accomplish {testTerm} goals" });

        // 11. Custom App
        _context.CustomApps.Add(new CustomApp { Name = $"{testTerm} Calculator", HtmlContent = "<div>App</div>" });

        await _context.SaveChangesAsync();

        _context.ChangeTracker.Clear();

        // Perform search
        var result = await SearchEndpoints.HandleSearch(_context, testTerm, "all", 20);
        var okResult = Assert.IsType<Ok<SearchResponse>>(result);
        Assert.NotNull(okResult.Value);

        var results = okResult.Value.Results;
        Assert.Equal(16, results.Count);

        // Verify presence of all expected categories / types
        Assert.Contains(results, r => r.Type == "thought");
        Assert.Contains(results, r => r.Type == "task");
        Assert.Contains(results, r => r.Type == "calendar");
        Assert.Contains(results, r => r.Type == "asset");
        Assert.Contains(results, r => r.Type == "debt");
        Assert.Contains(results, r => r.Type == "transaction");
        Assert.Contains(results, r => r.Type == "notebook");
        Assert.Contains(results, r => r.Type == "note");
        Assert.Contains(results, r => r.Type == "book");
        Assert.Contains(results, r => r.Type == "folder");
        Assert.Contains(results, r => r.Type == "file");
        Assert.Contains(results, r => r.Type == "whiteboard");
        Assert.Contains(results, r => r.Type == "whiteboard_shape");
        Assert.Contains(results, r => r.Type == "habit");
        Assert.Contains(results, r => r.Type == "goal");
        Assert.Contains(results, r => r.Type == "app");
    }

    [Fact]
    public async Task Search_WithTypeFilter_ReturnsOnlyFilteredType()
    {
        _context.Thoughts.Add(new Thought { Content = "TargetKeyword in thought" });
        _context.TaskItems.Add(new TaskItem { Title = "TargetKeyword in task" });
        await _context.SaveChangesAsync();

        _context.ChangeTracker.Clear();

        // Search with filter for 'tasks'
        var taskResult = await SearchEndpoints.HandleSearch(_context, "TargetKeyword", "tasks", 10);
        var okTaskResult = Assert.IsType<Ok<SearchResponse>>(taskResult);
        Assert.NotNull(okTaskResult.Value);
        Assert.Single(okTaskResult.Value.Results);
        Assert.Equal("task", okTaskResult.Value.Results[0].Type);

        // Search with filter for 'thoughts'
        var thoughtResult = await SearchEndpoints.HandleSearch(_context, "TargetKeyword", "thoughts", 10);
        var okThoughtResult = Assert.IsType<Ok<SearchResponse>>(thoughtResult);
        Assert.NotNull(okThoughtResult.Value);
        Assert.Single(okThoughtResult.Value.Results);
        Assert.Equal("thought", okThoughtResult.Value.Results[0].Type);
    }

    [Fact]
    public async Task Search_WhiteboardShapes_ExtractsSnippetAndShapeId()
    {
        var canvasDoc = @"{
            ""records"": [
                { ""id"": ""shape:sticky123"", ""typeName"": ""shape"", ""type"": ""note"", ""props"": { ""text"": ""Brainstorming SecretProject milestone"" } }
            ]
        }";
        var wb = new Whiteboard { Name = "Main Architecture", DocumentJson = canvasDoc };
        _context.Whiteboards.Add(wb);
        await _context.SaveChangesAsync();

        _context.ChangeTracker.Clear();

        var result = await SearchEndpoints.HandleSearch(_context, "SecretProject", "whiteboards", 10);
        var okResult = Assert.IsType<Ok<SearchResponse>>(result);
        Assert.NotNull(okResult.Value);

        var shapeMatch = Assert.Single(okResult.Value.Results, r => r.Type == "whiteboard_shape");
        Assert.Equal($"{wb.Id}:shape:sticky123", shapeMatch.Id);
        Assert.Contains("SecretProject", shapeMatch.Snippet);
        Assert.Equal($"/whiteboard/{wb.Id}?shapeId=shape:sticky123", shapeMatch.Url);
    }
}
