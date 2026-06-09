# Sanad Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core foundation and dashboard for "Sanad", focusing on backend setup, frontend layout, and the thoughts timeline feature.

**Architecture:** Minimal APIs with SQLite backend serving a React SPA frontend.

**Tech Stack:** .NET 8 (or 9), Entity Framework Core SQLite, React, Vite, Tailwind CSS.

---

### Task 1: Scaffold Backend Solution & Models

**Files:**
- Create: `Sanad.sln`
- Create: `src/Sanad.Api/Sanad.Api.csproj`
- Create: `src/Sanad.Api/Program.cs`
- Create: `src/Sanad.Api/Data/SanadDbContext.cs`
- Create: `src/Sanad.Api/Models/Thought.cs`
- Create: `src/Sanad.Api/Models/TimelineItem.cs`

- [ ] **Step 1: Create solution and API project**

```bash
mkdir -p src tests
dotnet new sln -n Sanad
cd src
dotnet new webapi -n Sanad.Api --use-minimal-apis
cd ..
dotnet sln add src/Sanad.Api/Sanad.Api.csproj
```
Expected: Solution file `Sanad.sln` created, API project created and added to solution.

- [ ] **Step 2: Add EF Core SQLite Packages**

```bash
cd src/Sanad.Api
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
cd ../..
```
Expected: Packages added to `Sanad.Api.csproj`.

- [ ] **Step 3: Create Models**

Create `src/Sanad.Api/Models/Thought.cs`:
```csharp
namespace Sanad.Api.Models;

public class Thought
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

Create `src/Sanad.Api/Models/TimelineItem.cs`:
```csharp
namespace Sanad.Api.Models;

public class TimelineItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ItemType { get; set; } = string.Empty; // e.g., "Thought"
    public string ReferenceId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 4: Create DbContext**

Create `src/Sanad.Api/Data/SanadDbContext.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;

namespace Sanad.Api.Data;

public class SanadDbContext : DbContext
{
    public SanadDbContext(DbContextOptions<SanadDbContext> options) : base(options) { }

    public DbSet<Thought> Thoughts => Set<Thought>();
    public DbSet<TimelineItem> TimelineItems => Set<TimelineItem>();
}
```

- [ ] **Step 5: Configure SQLite and Program.cs**

Update `src/Sanad.Api/Program.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// Configure DB
var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "sanad.db");
Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
builder.Services.AddDbContext<SanadDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

var app = builder.Build();

app.UseCors("AllowAll");

// Create DB if not exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SanadDbContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/", () => "Sanad API Running");

app.Run();
```

- [ ] **Step 6: Verify Backend Builds**

Run: `dotnet build`
Expected: Build succeeded with 0 warnings/errors.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold .NET backend and EF Core models"
```

### Task 2: Build API Endpoints

**Files:**
- Modify: `src/Sanad.Api/Program.cs`

- [ ] **Step 1: Add Endpoints to Program.cs**

Append the following before `app.Run();` in `src/Sanad.Api/Program.cs`:
```csharp
// POST a thought
app.MapPost("/api/thoughts", async (SanadDbContext db, Thought input) =>
{
    var thought = new Thought { Content = input.Content };
    db.Thoughts.Add(thought);
    
    var timelineItem = new TimelineItem 
    {
        ItemType = "Thought",
        ReferenceId = thought.Id
    };
    db.TimelineItems.Add(timelineItem);
    
    await db.SaveChangesAsync();
    return Results.Ok(thought);
});

// GET timeline
app.MapGet("/api/timeline", async (SanadDbContext db) =>
{
    var items = await db.TimelineItems
        .OrderByDescending(t => t.CreatedAt)
        .Take(10)
        .ToListAsync();
        
    // For thoughts, we also want the content
    var timelineWithContent = new List<object>();
    foreach (var item in items)
    {
        if (item.ItemType == "Thought")
        {
            var thought = await db.Thoughts.FindAsync(item.ReferenceId);
            timelineWithContent.Add(new { item.Id, item.ItemType, item.CreatedAt, Content = thought?.Content });
        }
    }
    
    return Results.Ok(timelineWithContent);
});
```

- [ ] **Step 2: Build to verify no errors**

Run: `dotnet build`
Expected: Build succeeded.

- [ ] **Step 3: Commit**

```bash
git add src/Sanad.Api/Program.cs
git commit -m "feat: add thoughts and timeline API endpoints"
```

### Task 3: Scaffold Frontend & Tailwind

**Files:**
- Create: `frontend/`

- [ ] **Step 1: Create Vite project**

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```
Expected: `frontend` folder with React template.

- [ ] **Step 2: Install Tailwind CSS**

```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer react-router-dom
npx tailwindcss init -p
```
Expected: `tailwind.config.js` and `postcss.config.js` created.

- [ ] **Step 3: Configure Tailwind**

Modify `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Modify `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-50 text-slate-900;
}
```

- [ ] **Step 4: Clean up defaults**

Run: `rm frontend/src/App.css`

Modify `frontend/src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full bg-slate-50">
        <Routes>
          <Route path="/" element={<div>Dashboard Placeholder</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

Modify `frontend/src/main.jsx` to remove `index.css` if it's already imported, or ensure it's there. It should look like this:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold react frontend with tailwind and routing"
```

### Task 4: Frontend Dashboard Layout

**Files:**
- Create: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Create Sidebar**

Create `frontend/src/components/Sidebar.jsx`:
```jsx
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="w-64 h-full bg-slate-900 text-slate-100 flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-8 text-indigo-400">Sanad</h1>
      <nav className="flex flex-col gap-2">
        <Link to="/" className="p-2 rounded bg-slate-800 text-white">Dashboard</Link>
        <div className="p-2 rounded text-slate-400 cursor-not-allowed">Tasks</div>
        <div className="p-2 rounded text-slate-400 cursor-not-allowed">Finance</div>
        <div className="p-2 rounded text-slate-400 cursor-not-allowed">Notebook</div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Create Dashboard Page Skeleton**

Create `frontend/src/pages/Dashboard.jsx`:
```jsx
export default function Dashboard() {
  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      
      {/* Top row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Balance</h3>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Today's Goals</h3>
          <p className="text-slate-400 mt-2">No goals yet</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Habits</h3>
          <p className="text-slate-400 mt-2">No habits tracked</p>
        </div>
      </div>
      
      {/* Main Area */}
      <div className="flex gap-8">
        <div className="flex-2 w-2/3 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             Thoughts Input
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             Timeline
          </div>
        </div>
        <div className="w-1/3">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             Recent Spending
           </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update App.jsx Layout**

Modify `frontend/src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full bg-slate-50">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "feat: build dashboard layout and sidebar"
```

### Task 5: Thoughts Input and Timeline Features

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Add State and Fetch logic**

Modify `frontend/src/pages/Dashboard.jsx` to be:
```jsx
import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

export default function Dashboard() {
  const [content, setContent] = useState('');
  const [timeline, setTimeline] = useState([]);

  const loadTimeline = async () => {
    try {
      const res = await fetch(`${API_URL}/timeline`);
      const data = await res.json();
      setTimeline(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      await fetch(`${API_URL}/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      setContent('');
      loadTimeline();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Balance</h3>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Today's Goals</h3>
          <p className="text-slate-400 mt-2">No goals yet</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Habits</h3>
          <p className="text-slate-400 mt-2">No habits tracked</p>
        </div>
      </div>
      
      <div className="flex gap-8">
        <div className="flex-2 w-2/3 flex flex-col gap-6">
          {/* Thoughts Input */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">What's on your mind?</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Write a thought..."
                rows="3"
              />
              <button type="submit" className="self-end bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
                Capture
              </button>
            </form>
          </div>
          
          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             <h3 className="text-lg font-semibold mb-4 text-slate-700">Timeline</h3>
             <div className="flex flex-col gap-4">
               {timeline.length === 0 ? (
                 <p className="text-slate-500 italic">No timeline items yet.</p>
               ) : (
                 timeline.map(item => (
                   <div key={item.id} className="p-4 bg-slate-50 rounded border border-slate-100 flex flex-col gap-1">
                     <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()} &bull; {item.itemType}</div>
                     <div className="text-slate-800">{item.content}</div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
        <div className="w-1/3">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             <h3 className="text-lg font-semibold mb-4 text-slate-700">Recent Spending</h3>
             <p className="text-slate-500 italic">Coming soon</p>
           </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: integrate thoughts input and timeline with backend API"
```
