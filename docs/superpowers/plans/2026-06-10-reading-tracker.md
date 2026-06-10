# Reading Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a reading tracker that lets users search books via OpenLibrary, plan chapters, log reading progress, and view it on the dashboard.

**Architecture:** We will create EF Core entities (`Book`, `ReadingPeriod`, `ReadingPlan`, `ReadingLog`), expose Minimal API endpoints (`BookEndpoints`, `ReadingEndpoints`), and build a React frontend with a new `/books` route, Zustand store (`useBookStore`), and a Dashboard widget.

**Tech Stack:** .NET 8/9, EF Core, Minimal APIs, React, TailwindCSS, Zustand.

---

### Task 1: Backend Models & DbContext

**Files:**
- Create: `src/Sanad.Api/Models/Book.cs`
- Create: `src/Sanad.Api/Models/ReadingPeriod.cs`
- Create: `src/Sanad.Api/Models/ReadingPlan.cs`
- Create: `src/Sanad.Api/Models/ReadingLog.cs`
- Modify: `src/Sanad.Api/Data/SanadDbContext.cs`

- [ ] **Step 1: Write the models**

Create `src/Sanad.Api/Models/Book.cs`:
```csharp
namespace Sanad.Api.Models;

public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public int TotalPages { get; set; }
    public string? ExternalApiId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

Create `src/Sanad.Api/Models/ReadingPeriod.cs`:
```csharp
namespace Sanad.Api.Models;

public class ReadingPeriod
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = "Planning"; // Planning, Reading, Completed
    public List<ReadingPlan> Plans { get; set; } = new();
    public List<ReadingLog> Logs { get; set; } = new();
}
```

Create `src/Sanad.Api/Models/ReadingPlan.cs`:
```csharp
namespace Sanad.Api.Models;

public class ReadingPlan
{
    public int Id { get; set; }
    public int ReadingPeriodId { get; set; }
    public ReadingPeriod ReadingPeriod { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public int StartPage { get; set; }
    public int EndPage { get; set; }
    public int OrderIndex { get; set; }
}
```

Create `src/Sanad.Api/Models/ReadingLog.cs`:
```csharp
namespace Sanad.Api.Models;

public class ReadingLog
{
    public int Id { get; set; }
    public int ReadingPeriodId { get; set; }
    public ReadingPeriod ReadingPeriod { get; set; } = null!;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public int StartPage { get; set; }
    public int EndPage { get; set; }
}
```

- [ ] **Step 2: Update DbContext**

Modify `src/Sanad.Api/Data/SanadDbContext.cs` to include DbSets:
```csharp
    public DbSet<Book> Books => Set<Book>();
    public DbSet<ReadingPeriod> ReadingPeriods => Set<ReadingPeriod>();
    public DbSet<ReadingPlan> ReadingPlans => Set<ReadingPlan>();
    public DbSet<ReadingLog> ReadingLogs => Set<ReadingLog>();
```

- [ ] **Step 3: Create EF Core Migration**

Run: `cd src/Sanad.Api && dotnet ef migrations add AddReadingTracker`
Expected: Migration generated successfully.

- [ ] **Step 4: Update Database**

Run: `cd src/Sanad.Api && dotnet ef database update`
Expected: Database updated.

- [ ] **Step 5: Commit**

```bash
git add src/Sanad.Api/Models src/Sanad.Api/Data/SanadDbContext.cs src/Sanad.Api/Migrations
git commit -m "feat: add reading tracker database models and migration"
```

---

### Task 2: Backend Book Endpoints (Search & Add)

**Files:**
- Create: `src/Sanad.Api/Endpoints/BookEndpoints.cs`
- Modify: `src/Sanad.Api/Program.cs`

- [ ] **Step 1: Write BookEndpoints**

Create `src/Sanad.Api/Endpoints/BookEndpoints.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class BookEndpoints
{
    public static void MapBookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/books");

        group.MapGet("/search", async (string query) =>
        {
            var httpClient = new HttpClient();
            var url = $"https://openlibrary.org/search.json?q={Uri.EscapeDataString(query)}&limit=10";
            var response = await httpClient.GetFromJsonAsync<OpenLibraryResponse>(url);
            
            var results = response?.Docs?.Select(d => new 
            {
                Title = d.Title,
                Author = d.Author_name?.FirstOrDefault() ?? "Unknown",
                ExternalApiId = d.Key,
                CoverUrl = d.Cover_i != null ? $"https://covers.openlibrary.org/b/id/{d.Cover_i}-L.jpg" : null,
                TotalPages = d.Number_of_pages_median ?? 0
            }).ToList();

            return Results.Ok(results ?? new object());
        });

        group.MapPost("/", async (SanadDbContext db, Book book) =>
        {
            db.Books.Add(book);
            await db.SaveChangesAsync();
            return Results.Created($"/api/books/{book.Id}", book);
        });

        group.MapGet("/", async (SanadDbContext db) =>
        {
            var books = await db.Books.OrderByDescending(b => b.CreatedAt).ToListAsync();
            return Results.Ok(books);
        });
    }

    private class OpenLibraryResponse
    {
        public List<OpenLibraryDoc>? Docs { get; set; }
    }

    private class OpenLibraryDoc
    {
        public string? Title { get; set; }
        public List<string>? Author_name { get; set; }
        public string? Key { get; set; }
        public int? Cover_i { get; set; }
        public int? Number_of_pages_median { get; set; }
    }
}
```

- [ ] **Step 2: Map Endpoints in Program.cs**

Modify `src/Sanad.Api/Program.cs` by adding `app.MapBookEndpoints();`:
```csharp
using Sanad.Api.Endpoints;
// ...
app.MapBookEndpoints();
```

- [ ] **Step 3: Run Build to verify**

Run: `cd src/Sanad.Api && dotnet build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/Sanad.Api/Endpoints/BookEndpoints.cs src/Sanad.Api/Program.cs
git commit -m "feat: add book search and management endpoints"
```

---

### Task 3: Backend Reading Endpoints (Periods, Plans, Logs)

**Files:**
- Create: `src/Sanad.Api/Endpoints/ReadingEndpoints.cs`
- Modify: `src/Sanad.Api/Program.cs`

- [ ] **Step 1: Write ReadingEndpoints**

Create `src/Sanad.Api/Endpoints/ReadingEndpoints.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class ReadingEndpoints
{
    public static void MapReadingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reading");

        group.MapGet("/periods", async (SanadDbContext db) =>
        {
            var periods = await db.ReadingPeriods
                .Include(p => p.Book)
                .OrderByDescending(p => p.StartDate)
                .ToListAsync();
            return Results.Ok(periods);
        });

        group.MapPost("/periods", async (SanadDbContext db, StartPeriodDto dto) =>
        {
            var period = new ReadingPeriod
            {
                BookId = dto.BookId,
                Status = "Reading",
                StartDate = DateTime.UtcNow,
                Plans = dto.Plans.Select((p, i) => new ReadingPlan
                {
                    Title = p.Title,
                    StartPage = p.StartPage,
                    EndPage = p.EndPage,
                    OrderIndex = i
                }).ToList()
            };
            db.ReadingPeriods.Add(period);
            await db.SaveChangesAsync();
            return Results.Created($"/api/reading/periods/{period.Id}", period);
        });

        group.MapPost("/logs", async (SanadDbContext db, LogDto dto) =>
        {
            var period = await db.ReadingPeriods
                .Include(p => p.Book)
                .FirstOrDefaultAsync(p => p.Id == dto.ReadingPeriodId);
                
            if (period == null) return Results.NotFound();

            var log = new ReadingLog
            {
                ReadingPeriodId = dto.ReadingPeriodId,
                Date = DateTime.UtcNow,
                StartPage = dto.StartPage,
                EndPage = dto.EndPage
            };
            db.ReadingLogs.Add(log);

            if (dto.EndPage >= period.Book.TotalPages)
            {
                period.Status = "Completed";
                period.EndDate = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();
            return Results.Ok(log);
        });

        group.MapGet("/current", async (SanadDbContext db) =>
        {
            var current = await db.ReadingPeriods
                .Include(p => p.Book)
                .Include(p => p.Plans)
                .Include(p => p.Logs)
                .Where(p => p.Status == "Reading")
                .OrderByDescending(p => p.StartDate)
                .FirstOrDefaultAsync();

            if (current == null) return Results.NotFound();

            var highestPage = current.Logs.Any() ? current.Logs.Max(l => l.EndPage) : 0;
            var currentPlan = current.Plans.OrderBy(p => p.OrderIndex)
                .FirstOrDefault(p => highestPage >= p.StartPage && highestPage < p.EndPage) 
                ?? current.Plans.OrderBy(p => p.OrderIndex).FirstOrDefault(p => highestPage < p.StartPage)
                ?? current.Plans.LastOrDefault();

            return Results.Ok(new 
            {
                Period = current,
                CurrentPage = highestPage,
                CurrentChapter = currentPlan?.Title,
                PagesLeftInChapter = currentPlan != null ? (currentPlan.EndPage - highestPage) : 0
            });
        });
    }

    public record StartPeriodDto(int BookId, List<PlanDto> Plans);
    public record PlanDto(string Title, int StartPage, int EndPage);
    public record LogDto(int ReadingPeriodId, int StartPage, int EndPage);
}
```

- [ ] **Step 2: Map Endpoints in Program.cs**

Modify `src/Sanad.Api/Program.cs` by adding `app.MapReadingEndpoints();`:
```csharp
app.MapReadingEndpoints();
```

- [ ] **Step 3: Run Build to verify**

Run: `cd src/Sanad.Api && dotnet build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/Sanad.Api/Endpoints/ReadingEndpoints.cs src/Sanad.Api/Program.cs
git commit -m "feat: add reading progress endpoints"
```

---

### Task 4: Frontend Router & Sidebar

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Update App.jsx**

Modify `frontend/src/App.jsx` to import `Books` and add `<Route path="/books" element={<Books />} />`.

```jsx
import Books from './pages/Books';
// ...
<Route path="/books" element={<Books />} />
```

- [ ] **Step 2: Update Sidebar.jsx**

Modify `frontend/src/components/Sidebar.jsx` to add a link to `/books`.
```jsx
import { BookOpenIcon } from '@heroicons/react/24/outline';
// ... Add to Navigation items:
{ name: 'Reading', href: '/books', icon: BookOpenIcon },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Sidebar.jsx
git commit -m "feat: add books route and sidebar link"
```

---

### Task 5: Frontend Zustand Store

**Files:**
- Create: `frontend/src/store/useBookStore.js`

- [ ] **Step 1: Write useBookStore.js**

Create `frontend/src/store/useBookStore.js`:
```javascript
import { create } from 'zustand';
import { API_BASE_URL } from '../config';

const useBookStore = create((set, get) => ({
    books: [],
    searchResults: [],
    periods: [],
    currentRead: null,
    
    searchBooks: async (query) => {
        const res = await fetch(`${API_BASE_URL}/books/search?query=${query}`);
        const data = await res.json();
        set({ searchResults: data });
    },
    
    addBook: async (book) => {
        const res = await fetch(`${API_BASE_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });
        const savedBook = await res.json();
        set(state => ({ books: [savedBook, ...state.books] }));
        return savedBook;
    },
    
    fetchCurrentRead: async () => {
        const res = await fetch(`${API_BASE_URL}/reading/current`);
        if (res.ok) {
            const data = await res.json();
            set({ currentRead: data });
        } else {
            set({ currentRead: null });
        }
    },
    
    startReadingPeriod: async (bookId, plans) => {
        await fetch(`${API_BASE_URL}/reading/periods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, plans })
        });
        await get().fetchCurrentRead();
    },
    
    logProgress: async (periodId, startPage, endPage) => {
        await fetch(`${API_BASE_URL}/reading/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ readingPeriodId: periodId, startPage, endPage })
        });
        await get().fetchCurrentRead();
    }
}));

export default useBookStore;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/useBookStore.js
git commit -m "feat: add zustand store for books and reading tracking"
```

---

### Task 6: Frontend Books Page & Modals

**Files:**
- Create: `frontend/src/pages/Books.jsx`

- [ ] **Step 1: Write Books.jsx**

Create `frontend/src/pages/Books.jsx`. Implement basic search UI, listing current read, and an interface to add a book to the database and start a period.
*(To keep the plan concise, implement a full page that uses `useBookStore` to search, select a book, and start a reading plan with at least 1 default chapter).*

```javascript
import React, { useState, useEffect } from 'react';
import useBookStore from '../store/useBookStore';

export default function Books() {
  const { searchBooks, searchResults, addBook, startReadingPeriod, currentRead, fetchCurrentRead } = useBookStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchCurrentRead();
  }, []);

  const handleSearch = () => searchBooks(query);

  const handleAddAndStart = async (book) => {
    const saved = await addBook(book);
    // Auto-create a simple plan for demo
    await startReadingPeriod(saved.id, [{ title: "Chapter 1", startPage: 1, endPage: book.totalPages }]);
  };

  return (
    <div className="p-8 w-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Reading Tracker</h1>
      
      {currentRead && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h2 className="font-semibold text-lg">Currently Reading: {currentRead.period.book.title}</h2>
          <p>Chapter: {currentRead.currentChapter} | Pages Left: {currentRead.pagesLeftInChapter}</p>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <input 
          className="border border-slate-300 rounded-lg p-2 w-96"
          placeholder="Search OpenLibrary..."
          value={query} onChange={e => setQuery(e.target.value)} 
        />
        <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Search</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {searchResults.map((b, i) => (
          <div key={i} className="border border-slate-200 p-4 rounded-xl flex flex-col items-center">
            {b.coverUrl && <img src={b.coverUrl} className="h-40 object-cover mb-4 rounded shadow-sm" alt="cover"/>}
            <h3 className="font-semibold text-center">{b.title}</h3>
            <button onClick={() => handleAddAndStart(b)} className="mt-auto pt-4 text-blue-600 font-medium">Add to Shelf</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Books.jsx
git commit -m "feat: add books and reading management page"
```

---

### Task 7: Dashboard Widget Integration

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Add Current Read Widget**

Modify `frontend/src/pages/Dashboard.jsx`. Import `useBookStore`, call `fetchCurrentRead` on mount, and render a simple widget displaying the current chapter and a button to log pages.

```jsx
import useBookStore from '../store/useBookStore';
// inside Dashboard:
const { currentRead, fetchCurrentRead, logProgress } = useBookStore();
useEffect(() => { fetchCurrentRead(); }, []);

// Render Widget:
{currentRead && (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <h3 className="text-lg font-semibold mb-4 text-slate-800">Current Read</h3>
    <div className="flex gap-4">
      {currentRead.period.book.coverUrl && (
         <img src={currentRead.period.book.coverUrl} className="h-24 rounded shadow-sm" />
      )}
      <div>
        <p className="font-medium">{currentRead.period.book.title}</p>
        <p className="text-sm text-slate-600">Chapter: {currentRead.currentChapter}</p>
        <p className="text-sm text-slate-600">{currentRead.pagesLeftInChapter} pages left in session</p>
        <div className="mt-2 flex gap-2">
           <input type="number" id="logPageInput" className="w-20 border rounded p-1 text-sm" placeholder="Page" />
           <button onClick={() => {
              const val = document.getElementById('logPageInput').value;
              logProgress(currentRead.period.id, currentRead.currentPage, parseInt(val));
           }} className="text-xs bg-slate-100 px-3 py-1 rounded hover:bg-slate-200">Log</button>
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: add reading progress widget to dashboard"
```
