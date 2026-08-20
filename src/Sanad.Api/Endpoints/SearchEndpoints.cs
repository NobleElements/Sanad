using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/search")
            .RequireAuthorization();

        group.MapGet("/", HandleSearch);
    }

    public static async Task<IResult> HandleSearch(
        SanadDbContext db,
        string? q,
        string? type,
        int? limit)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Results.Ok(new SearchResponse([], 0));
        }

        var query = q.Trim();
        var maxPerCategory = limit is > 0 and <= 50 ? limit.Value : 10;
        var filterType = type?.Trim().ToLowerInvariant();

        var results = new List<SearchResultItem>();

        // Helper to check if a type filter applies
        bool ShouldSearch(params string[] targetTypes)
        {
            if (string.IsNullOrEmpty(filterType) || filterType == "all") return true;
            return targetTypes.Any(t => t.Equals(filterType, StringComparison.OrdinalIgnoreCase));
        }

        // 1. Thoughts
        if (ShouldSearch("thought", "thoughts"))
        {
            var thoughts = await db.Thoughts
                .Where(t => t.Content != null && EF.Functions.Like(t.Content, $"%{query}%"))
                .OrderByDescending(t => t.CreatedAt)
                .Take(maxPerCategory)
                .Select(t => new { t.Id, t.Content, t.CreatedAt })
                .ToListAsync();

            foreach (var t in thoughts)
            {
                var snippet = ExtractSnippet(t.Content, query, 120);
                results.Add(new SearchResultItem(
                    Id: t.Id,
                    Type: "thought",
                    Category: "Thoughts",
                    Title: TruncateText(t.Content, 60),
                    Snippet: snippet,
                    Url: $"/thoughts?highlight={t.Id}#thought-{t.Id}",
                    Icon: "Lightbulb",
                    CreatedAt: t.CreatedAt
                ));
            }
        }

        // 2. Tasks
        if (ShouldSearch("task", "tasks"))
        {
            var tasks = await db.TaskItems
                .Where(t => EF.Functions.Like(t.Title, $"%{query}%") || (t.Content != null && EF.Functions.Like(t.Content, $"%{query}%")))
                .OrderByDescending(t => t.UpdatedAt)
                .Take(maxPerCategory)
                .Select(t => new { t.Id, t.Title, t.Content, t.Status, t.Project, t.UpdatedAt })
                .ToListAsync();

            foreach (var t in tasks)
            {
                var contentSnippet = !string.IsNullOrEmpty(t.Content) ? ExtractSnippet(StripHtml(t.Content), query, 100) : null;
                results.Add(new SearchResultItem(
                    Id: t.Id.ToString(),
                    Type: "task",
                    Category: "Tasks",
                    Title: t.Title,
                    Snippet: contentSnippet ?? (t.Project != null ? $"Project: {t.Project}" : "Task item"),
                    Url: $"/tasks/{t.Id}",
                    Icon: "CheckSquare",
                    CreatedAt: t.UpdatedAt,
                    Metadata: new Dictionary<string, object?>
                    {
                        ["status"] = t.Status.ToString(),
                        ["project"] = t.Project
                    }
                ));
            }
        }

        // 3. Calendar Events
        if (ShouldSearch("calendar", "event", "events"))
        {
            var events = await db.CalendarEvents
                .Include(e => e.Category)
                .Where(e => EF.Functions.Like(e.Title, $"%{query}%") || (e.Description != null && EF.Functions.Like(e.Description, $"%{query}%")))
                .OrderByDescending(e => e.StartDate)
                .Take(maxPerCategory)
                .Select(e => new { e.Id, e.Title, e.Description, e.StartDate, e.EndDate, e.IsAllDay, CategoryName = e.Category != null ? e.Category.Name : null, CategoryColor = e.Category != null ? e.Category.ColorCode : null })
                .ToListAsync();

            foreach (var e in events)
            {
                var descSnippet = !string.IsNullOrEmpty(e.Description) ? ExtractSnippet(e.Description, query, 100) : null;
                var dateStr = e.StartDate.ToString("MMM dd, yyyy");
                results.Add(new SearchResultItem(
                    Id: e.Id.ToString(),
                    Type: "calendar",
                    Category: "Calendar",
                    Title: e.Title,
                    Snippet: descSnippet ?? $"{dateStr}{(e.CategoryName != null ? $" • {e.CategoryName}" : "")}",
                    Url: $"/calendar?eventId={e.Id}",
                    Icon: "Calendar",
                    CreatedAt: e.StartDate,
                    Metadata: new Dictionary<string, object?>
                    {
                        ["startDate"] = e.StartDate,
                        ["endDate"] = e.EndDate,
                        ["isAllDay"] = e.IsAllDay,
                        ["category"] = e.CategoryName,
                        ["color"] = e.CategoryColor
                    }
                ));
            }
        }

        // 4. Finance (Assets, Transactions/Spending, Debts)
        if (ShouldSearch("finance", "assets", "asset", "spending", "transactions", "debts", "debt"))
        {
            // Assets
            if (ShouldSearch("finance", "assets", "asset"))
            {
                var assets = await db.Assets
                    .Include(a => a.Currency)
                    .Where(a => EF.Functions.Like(a.Name, $"%{query}%"))
                    .OrderBy(a => a.Order)
                    .Take(maxPerCategory)
                    .Select(a => new { a.Id, a.Name, a.Type, a.CurrentAmount, a.Icon, CurrencySymbol = a.Currency != null ? a.Currency.Symbol : "$" })
                    .ToListAsync();

                foreach (var a in assets)
                {
                    results.Add(new SearchResultItem(
                        Id: a.Id.ToString(),
                        Type: "asset",
                        Category: "Finance",
                        Title: a.Name,
                        Snippet: $"Asset ({a.Type}): {a.CurrencySymbol}{a.CurrentAmount:N2}",
                        Url: $"/finance?tab=assets&assetId={a.Id}",
                        Icon: "DollarSign",
                        Metadata: new Dictionary<string, object?>
                        {
                            ["subType"] = "asset",
                            ["amount"] = a.CurrentAmount,
                            ["type"] = a.Type
                        }
                    ));
                }
            }

            // Debts
            if (ShouldSearch("finance", "debts", "debt"))
            {
                var debts = await db.Debts
                    .Include(d => d.Currency)
                    .Where(d => EF.Functions.Like(d.Name, $"%{query}%"))
                    .OrderBy(d => d.Order)
                    .Take(maxPerCategory)
                    .Select(d => new { d.Id, d.Name, d.Type, d.CurrentAmount, d.Icon, CurrencySymbol = d.Currency != null ? d.Currency.Symbol : "$" })
                    .ToListAsync();

                foreach (var d in debts)
                {
                    results.Add(new SearchResultItem(
                        Id: d.Id.ToString(),
                        Type: "debt",
                        Category: "Finance",
                        Title: d.Name,
                        Snippet: $"Debt ({d.Type}): {d.CurrencySymbol}{d.CurrentAmount:N2}",
                        Url: $"/finance?tab=assets&debtId={d.Id}",
                        Icon: "CreditCard",
                        Metadata: new Dictionary<string, object?>
                        {
                            ["subType"] = "debt",
                            ["amount"] = d.CurrentAmount,
                            ["type"] = d.Type
                        }
                    ));
                }
            }

            // Transactions (Spending / Income)
            if (ShouldSearch("finance", "spending", "transactions", "transaction"))
            {
                var transactions = await db.Transactions
                    .Include(t => t.Category)
                    .Where(t => EF.Functions.Like(t.Description, $"%{query}%"))
                    .OrderByDescending(t => t.Date)
                    .Take(maxPerCategory)
                    .Select(t => new { t.Id, t.Description, t.Amount, t.Type, t.Date, CategoryName = t.Category != null ? t.Category.Name : null })
                    .ToListAsync();

                foreach (var t in transactions)
                {
                    var snippet = $"{t.Type} • {t.Amount:N2} • {t.Date:MMM dd, yyyy}{(t.CategoryName != null ? $" • {t.CategoryName}" : "")}";
                    results.Add(new SearchResultItem(
                        Id: t.Id.ToString(),
                        Type: "transaction",
                        Category: "Finance",
                        Title: t.Description,
                        Snippet: snippet,
                        Url: $"/finance?tab=spending&txId={t.Id}&month={t.Date.Month}&year={t.Date.Year}",
                        Icon: "DollarSign",
                        CreatedAt: t.Date,
                        Metadata: new Dictionary<string, object?>
                        {
                            ["subType"] = "transaction",
                            ["amount"] = t.Amount,
                            ["txType"] = t.Type,
                            ["category"] = t.CategoryName
                        }
                    ));
                }
            }
        }

        // 5. Notebooks & Notes
        if (ShouldSearch("notebook", "notebooks", "notes", "note"))
        {
            // Notebooks
            if (ShouldSearch("notebook", "notebooks"))
            {
                var notebooks = await db.Notebooks
                    .Where(nb => EF.Functions.Like(nb.Name, $"%{query}%"))
                    .OrderBy(nb => nb.SortOrder)
                    .Take(maxPerCategory)
                    .Select(nb => new { nb.Id, nb.Name, nb.CreatedAt, NotesCount = nb.Notes.Count })
                    .ToListAsync();

                foreach (var nb in notebooks)
                {
                    results.Add(new SearchResultItem(
                        Id: nb.Id.ToString(),
                        Type: "notebook",
                        Category: "Notes",
                        Title: nb.Name,
                        Snippet: $"Notebook with {nb.NotesCount} note{(nb.NotesCount == 1 ? "" : "s")}",
                        Url: $"/notebook?notebookId={nb.Id}",
                        Icon: "Book",
                        CreatedAt: nb.CreatedAt
                    ));
                }
            }

            // Notes
            if (ShouldSearch("notes", "note"))
            {
                var notes = await db.Notes
                    .Include(n => n.Notebook)
                    .Where(n => EF.Functions.Like(n.Title, $"%{query}%") || (n.Content != null && EF.Functions.Like(n.Content, $"%{query}%")))
                    .OrderByDescending(n => n.UpdatedAt)
                    .Take(maxPerCategory)
                    .Select(n => new { n.Id, n.Title, n.Content, n.NotebookId, NotebookName = n.Notebook.Name, n.UpdatedAt })
                    .ToListAsync();

                foreach (var n in notes)
                {
                    var cleanContent = StripHtml(n.Content ?? string.Empty);
                    var snippet = ExtractSnippet(cleanContent, query, 120);
                    if (string.IsNullOrEmpty(snippet))
                    {
                        snippet = TruncateText(cleanContent, 100);
                    }
                    if (string.IsNullOrEmpty(snippet))
                    {
                        snippet = $"In notebook: {n.NotebookName}";
                    }

                    results.Add(new SearchResultItem(
                        Id: n.Id.ToString(),
                        Type: "note",
                        Category: "Notes",
                        Title: string.IsNullOrWhiteSpace(n.Title) ? "Untitled Note" : n.Title,
                        Snippet: snippet,
                        Url: $"/notebook/{n.Id}",
                        Icon: "FileText",
                        CreatedAt: n.UpdatedAt,
                        Metadata: new Dictionary<string, object?>
                        {
                            ["notebookId"] = n.NotebookId,
                            ["notebookName"] = n.NotebookName
                        }
                    ));
                }
            }
        }

        // 6. Books
        if (ShouldSearch("book", "books", "reading"))
        {
            var books = await db.Books
                .Where(b => EF.Functions.Like(b.Title, $"%{query}%") || EF.Functions.Like(b.Author, $"%{query}%"))
                .OrderByDescending(b => b.CreatedAt)
                .Take(maxPerCategory)
                .Select(b => new { b.Id, b.Title, b.Author, b.TotalPages, b.CoverUrl, b.CreatedAt })
                .ToListAsync();

            foreach (var b in books)
            {
                results.Add(new SearchResultItem(
                    Id: b.Id.ToString(),
                    Type: "book",
                    Category: "Books",
                    Title: b.Title,
                    Snippet: $"Author: {b.Author} • {b.TotalPages} pages",
                    Url: $"/books?tab=shelf&bookId={b.Id}",
                    Icon: "BookOpen",
                    CreatedAt: b.CreatedAt,
                    Metadata: new Dictionary<string, object?>
                    {
                        ["author"] = b.Author,
                        ["totalPages"] = b.TotalPages,
                        ["coverUrl"] = b.CoverUrl
                    }
                ));
            }
        }

        // 7. Files & Folders
        if (ShouldSearch("files", "file", "folders", "folder"))
        {
            // Folders
            if (ShouldSearch("folders", "folder", "files"))
            {
                var folders = await db.Folders
                    .Where(f => EF.Functions.Like(f.Name, $"%{query}%"))
                    .OrderByDescending(f => f.CreatedAt)
                    .Take(maxPerCategory)
                    .Select(f => new { f.Id, f.Name, f.CreatedAt, f.ParentId })
                    .ToListAsync();

                foreach (var f in folders)
                {
                    results.Add(new SearchResultItem(
                        Id: f.Id.ToString(),
                        Type: "folder",
                        Category: "Files",
                        Title: f.Name,
                        Snippet: "Folder in File Manager",
                        Url: $"/files/{f.Id}",
                        Icon: "Folder",
                        CreatedAt: f.CreatedAt
                    ));
                }
            }

            // Files
            if (ShouldSearch("files", "file"))
            {
                var files = await db.FileItems
                    .Include(f => f.Folder)
                    .Where(f => EF.Functions.Like(f.Name, $"%{query}%"))
                    .OrderByDescending(f => f.UploadDate)
                    .Take(maxPerCategory)
                    .Select(f => new { f.Id, f.Name, f.Extension, f.SizeBytes, f.UploadDate, f.FolderId, FolderName = f.Folder != null ? f.Folder.Name : "Home" })
                    .ToListAsync();

                foreach (var f in files)
                {
                    var sizeStr = FormatBytes(f.SizeBytes);
                    results.Add(new SearchResultItem(
                        Id: f.Id.ToString(),
                        Type: "file",
                        Category: "Files",
                        Title: f.Name,
                        Snippet: $"{sizeStr} • In folder: {f.FolderName}",
                        Url: f.FolderId.HasValue ? $"/files/{f.FolderId}?fileId={f.Id}" : $"/files?fileId={f.Id}",
                        Icon: "HardDrive",
                        CreatedAt: f.UploadDate,
                        Metadata: new Dictionary<string, object?>
                        {
                            ["sizeBytes"] = f.SizeBytes,
                            ["extension"] = f.Extension,
                            ["folderId"] = f.FolderId,
                            ["folderName"] = f.FolderName
                        }
                    ));
                }
            }
        }

        // 8. Whiteboards & Whiteboard Content (texts, sticky notes, note/task cards)
        if (ShouldSearch("whiteboard", "whiteboards", "canvas"))
        {
            var whiteboards = await db.Whiteboards
                .Where(w => EF.Functions.Like(w.Name, $"%{query}%") || (w.DocumentJson != null && EF.Functions.Like(w.DocumentJson, $"%{query}%")))
                .OrderByDescending(w => w.UpdatedAt)
                .Take(maxPerCategory * 2)
                .Select(w => new { w.Id, w.Name, w.Icon, w.DocumentJson, w.UpdatedAt })
                .ToListAsync();

            foreach (var w in whiteboards)
            {
                // Match whiteboard name
                var nameMatched = w.Name.Contains(query, StringComparison.OrdinalIgnoreCase);
                if (nameMatched)
                {
                    results.Add(new SearchResultItem(
                        Id: w.Id.ToString(),
                        Type: "whiteboard",
                        Category: "Whiteboards",
                        Title: w.Name,
                        Snippet: "Whiteboard Canvas",
                        Url: $"/whiteboard/{w.Id}",
                        Icon: "Presentation",
                        CreatedAt: w.UpdatedAt
                    ));
                }

                // Match whiteboard content (shapes inside DocumentJson)
                if (!string.IsNullOrEmpty(w.DocumentJson))
                {
                    var shapeMatches = ExtractWhiteboardShapeMatches(w.DocumentJson, query, maxPerCategory);
                    foreach (var sm in shapeMatches)
                    {
                        results.Add(new SearchResultItem(
                            Id: $"{w.Id}:{sm.ShapeId}",
                            Type: "whiteboard_shape",
                            Category: "Whiteboards",
                            Title: $"{w.Name} • {sm.ShapeTypeName}",
                            Snippet: sm.Snippet,
                            Url: $"/whiteboard/{w.Id}?shapeId={sm.ShapeId}",
                            Icon: "Presentation",
                            CreatedAt: w.UpdatedAt,
                            Metadata: new Dictionary<string, object?>
                            {
                                ["whiteboardId"] = w.Id,
                                ["whiteboardName"] = w.Name,
                                ["shapeId"] = sm.ShapeId
                            }
                        ));
                    }
                }
            }
        }

        // 9. Habits
        if (ShouldSearch("habit", "habits"))
        {
            var habits = await db.Habits
                .Where(h => !h.IsDeleted && EF.Functions.Like(h.Name, $"%{query}%"))
                .OrderBy(h => h.Order)
                .Take(maxPerCategory)
                .Select(h => new { h.Id, h.Name, h.Icon, h.Frequency, h.CreatedAt })
                .ToListAsync();

            foreach (var h in habits)
            {
                results.Add(new SearchResultItem(
                    Id: h.Id,
                    Type: "habit",
                    Category: "Habits",
                    Title: h.Name,
                    Snippet: $"{h.Frequency} Habit {(string.IsNullOrWhiteSpace(h.Icon) ? "🌟" : h.Icon)}",
                    Url: $"/habits?habitId={h.Id}",
                    Icon: "Repeat",
                    CreatedAt: h.CreatedAt
                ));
            }
        }

        // 10. Goals
        if (ShouldSearch("goal", "goals"))
        {
            var goals = await db.DailyGoals
                .Where(g => EF.Functions.Like(g.Goal, $"%{query}%"))
                .OrderByDescending(g => g.DateStr)
                .Take(maxPerCategory)
                .Select(g => new { g.DateStr, g.Goal })
                .ToListAsync();

            foreach (var g in goals)
            {
                var snippet = ExtractSnippet(g.Goal, query, 120);
                results.Add(new SearchResultItem(
                    Id: g.DateStr,
                    Type: "goal",
                    Category: "Goals",
                    Title: $"Goal for {g.DateStr}",
                    Snippet: snippet,
                    Url: $"/dashboard?goalDate={g.DateStr}",
                    Icon: "CheckCircle2",
                    Metadata: new Dictionary<string, object?>
                    {
                        ["dateStr"] = g.DateStr
                    }
                ));
            }
        }

        // 11. Custom Apps
        if (ShouldSearch("app", "apps", "customapp", "customapps"))
        {
            var apps = await db.CustomApps
                .Where(a => EF.Functions.Like(a.Name, $"%{query}%"))
                .OrderByDescending(a => a.UpdatedAt)
                .Take(maxPerCategory)
                .Select(a => new { a.Id, a.Name, a.Icon, a.UpdatedAt })
                .ToListAsync();

            foreach (var a in apps)
            {
                results.Add(new SearchResultItem(
                    Id: a.Id.ToString(),
                    Type: "app",
                    Category: "Apps",
                    Title: a.Name,
                    Snippet: "Custom App",
                    Url: $"/apps/{a.Id}",
                    Icon: "AppWindow",
                    CreatedAt: a.UpdatedAt
                ));
            }
        }

        return Results.Ok(new SearchResponse(results, results.Count));
    }

    private static string ExtractSnippet(string text, string query, int maxLength = 120)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var clean = Regex.Replace(text, @"\s+", " ").Trim();
        var index = clean.IndexOf(query, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return TruncateText(clean, maxLength);
        }

        var start = Math.Max(0, index - (maxLength / 3));
        var length = Math.Min(clean.Length - start, maxLength);
        var snippet = clean.Substring(start, length);

        if (start > 0) snippet = "..." + snippet;
        if (start + length < clean.Length) snippet += "...";

        return snippet;
    }

    private static string TruncateText(string text, int max)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= max) return text;
        return text.Substring(0, max).TrimEnd() + "...";
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return string.Empty;
        var stripped = Regex.Replace(html, "<.*?>", " ");
        stripped = System.Net.WebUtility.HtmlDecode(stripped);
        return Regex.Replace(stripped, @"\s+", " ").Trim();
    }

    private static string FormatBytes(long bytes)
    {
        if (bytes == 0) return "0 B";
        string[] sizes = ["B", "KB", "MB", "GB", "TB"];
        int order = 0;
        double len = bytes;
        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len /= 1024;
        }
        return $"{len:0.#} {sizes[order]}";
    }

    private static List<WhiteboardShapeMatch> ExtractWhiteboardShapeMatches(string documentJson, string query, int maxMatches)
    {
        var matches = new List<WhiteboardShapeMatch>();
        try
        {
            using var doc = JsonDocument.Parse(documentJson);
            var root = doc.RootElement;

            // Handle schema: either root.records array/dictionary or root store
            JsonElement recordsElement = default;
            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("records", out var recs))
            {
                recordsElement = recs;
            }
            else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("store", out var store))
            {
                recordsElement = store;
            }
            else
            {
                recordsElement = root;
            }

            void InspectElement(JsonElement item)
            {
                if (matches.Count >= maxMatches) return;
                if (item.ValueKind != JsonValueKind.Object) return;

                // Check shape type
                string shapeType = "Shape";
                if (item.TryGetProperty("type", out var typeProp) && typeProp.ValueKind == JsonValueKind.String)
                {
                    shapeType = typeProp.GetString() ?? "Shape";
                }

                string shapeId = "";
                if (item.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String)
                {
                    shapeId = idProp.GetString() ?? "";
                }

                // Check props
                if (item.TryGetProperty("props", out var props) && props.ValueKind == JsonValueKind.Object)
                {
                    string shapeText = "";
                    if (props.TryGetProperty("text", out var textProp) && textProp.ValueKind == JsonValueKind.String)
                    {
                        shapeText = textProp.GetString() ?? "";
                    }
                    else if (props.TryGetProperty("title", out var titleProp) && titleProp.ValueKind == JsonValueKind.String)
                    {
                        shapeText = titleProp.GetString() ?? "";
                    }
                    else if (props.TryGetProperty("label", out var labelProp) && labelProp.ValueKind == JsonValueKind.String)
                    {
                        shapeText = labelProp.GetString() ?? "";
                    }
                    else if (props.TryGetProperty("snippet", out var snippetProp) && snippetProp.ValueKind == JsonValueKind.String)
                    {
                        shapeText = snippetProp.GetString() ?? "";
                    }

                    if (!string.IsNullOrWhiteSpace(shapeText) && shapeText.Contains(query, StringComparison.OrdinalIgnoreCase))
                    {
                        var typeName = shapeType switch
                        {
                            "note" => "Sticky Note",
                            "text" => "Text",
                            "geo" => "Shape Text",
                            "sanad-note" => "Note Card",
                            "sanad-task" => "Task Card",
                            _ => $"{char.ToUpper(shapeType[0])}{shapeType[1..]} Shape"
                        };

                        matches.Add(new WhiteboardShapeMatch(
                            shapeId,
                            typeName,
                            ExtractSnippet(shapeText, query, 100)
                        ));
                    }
                }
            }

            if (recordsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in recordsElement.EnumerateArray())
                {
                    InspectElement(item);
                }
            }
            else if (recordsElement.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in recordsElement.EnumerateObject())
                {
                    InspectElement(prop.Value);
                }
            }
        }
        catch
        {
            // Silently ignore corrupted / non-json whiteboard document blobs
        }

        return matches;
    }

    private record WhiteboardShapeMatch(string ShapeId, string ShapeTypeName, string Snippet);
}

public record SearchResultItem(
    string Id,
    string Type,
    string Category,
    string Title,
    string Snippet,
    string Url,
    string Icon,
    DateTime? CreatedAt = null,
    Dictionary<string, object?>? Metadata = null
);

public record SearchResponse(
    List<SearchResultItem> Results,
    int TotalCount
);
