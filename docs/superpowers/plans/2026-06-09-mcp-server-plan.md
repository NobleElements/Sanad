# MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an MCP Server integrated into the ASP.NET Core `Sanad.Api` project.

**Architecture:** Use `ModelContextProtocol.AspNetCore` SDK to expose tools for Thoughts, Tasks, Transactions, and Notes.

**Tech Stack:** C#, ASP.NET Core, Entity Framework Core, MCP SDK.

---

### Task 1: Package Installation & Configuration

**Files:**
- Modify: `src/Sanad.Api/Sanad.Api.csproj`
- Modify: `src/Sanad.Api/Program.cs`

- [ ] **Step 1: Install Package**

```bash
cd src/Sanad.Api
dotnet add package ModelContextProtocol.AspNetCore
```

- [ ] **Step 2: Register MCP Services in Program.cs**

Modify `src/Sanad.Api/Program.cs` to add MCP services before `var app = builder.Build();`:

```csharp
builder.Services.AddMcpServer();
```

- [ ] **Step 3: Map MCP Server Endpoints**

Modify `src/Sanad.Api/Program.cs` after `app.MapNotebookEndpoints();`:

```csharp
app.MapMcpServer("/mcp");
app.MapMcpEndpoints();
```

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(mcp): add mcp server package and services"
```

### Task 2: Implement MCP Endpoints (Thoughts & Tasks)

**Files:**
- Create: `src/Sanad.Api/Endpoints/McpEndpoints.cs`

- [ ] **Step 1: Create McpEndpoints.cs with Thoughts**

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class McpEndpoints
{
    public static void MapMcpEndpoints(this IEndpointRouteBuilder app)
    {
        // Thoughts Tools
        app.MapTool("get_thoughts", "Get a list of thoughts", async (SanadDbContext db) =>
        {
            return await db.Thoughts.OrderByDescending(t => t.CreatedAt).Take(20).ToListAsync();
        });

        app.MapTool("create_thought", "Create a new thought", async (SanadDbContext db, string content) =>
        {
            var thought = new Thought { Content = content };
            db.Thoughts.Add(thought);
            await db.SaveChangesAsync();
            return thought;
        });

        app.MapTool("delete_thought", "Delete a thought by ID", async (SanadDbContext db, string id) =>
        {
            var thought = await db.Thoughts.FindAsync(id);
            if (thought != null) { db.Thoughts.Remove(thought); await db.SaveChangesAsync(); }
            return new { success = thought != null };
        });
    }
}
```

- [ ] **Step 2: Add Tasks Tools**

```csharp
// Add inside MapMcpEndpoints
app.MapTool("get_tasks", "Get tasks", async (SanadDbContext db) =>
{
    return await db.TaskItems.OrderByDescending(t => t.CreatedAt).Take(20).ToListAsync();
});

app.MapTool("create_task", "Create a task", async (SanadDbContext db, string title, string? content) =>
{
    var task = new TaskItem { Title = title, Content = content, Status = Models.TaskStatus.Todo };
    db.TaskItems.Add(task);
    await db.SaveChangesAsync();
    return task;
});

app.MapTool("delete_task", "Delete a task", async (SanadDbContext db, Guid id) =>
{
    var task = await db.TaskItems.FindAsync(id);
    if (task != null) { db.TaskItems.Remove(task); await db.SaveChangesAsync(); }
    return new { success = task != null };
});
```

- [ ] **Step 3: Commit**

```bash
git add src/Sanad.Api/Endpoints/McpEndpoints.cs
git commit -m "feat(mcp): implement thoughts and tasks mcp tools"
```

### Task 3: Implement MCP Endpoints (Transactions & Notes)

**Files:**
- Modify: `src/Sanad.Api/Endpoints/McpEndpoints.cs`

- [ ] **Step 1: Add Transactions Tools**

```csharp
// Add inside MapMcpEndpoints
app.MapTool("get_transactions", "Get recent transactions", async (SanadDbContext db) =>
{
    return await db.Transactions.OrderByDescending(t => t.Date).Take(20).ToListAsync();
});

app.MapTool("create_transaction", "Create a transaction", async (SanadDbContext db, decimal amount, string category, string description) =>
{
    var tx = new Transaction { Amount = amount, Category = category, Description = description, Date = DateTime.UtcNow };
    db.Transactions.Add(tx);
    await db.SaveChangesAsync();
    return tx;
});
```

- [ ] **Step 2: Add Notes Tools**

```csharp
// Add inside MapMcpEndpoints
app.MapTool("get_notes", "Get notes", async (SanadDbContext db) =>
{
    return await db.Notes.OrderByDescending(n => n.UpdatedAt).Take(20).ToListAsync();
});

app.MapTool("create_note", "Create a note", async (SanadDbContext db, string title, string content, Guid notebookId) =>
{
    var note = new Note { Title = title, Content = content, NotebookId = notebookId };
    db.Notes.Add(note);
    await db.SaveChangesAsync();
    return note;
});
```

- [ ] **Step 3: Test Build**

Run: `dotnet build src/Sanad.Api/Sanad.Api.csproj`
Expected: PASS with 0 Errors.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(mcp): implement transactions and notes mcp tools"
```
