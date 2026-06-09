# Financial Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Financial Tracking subsystem with category-based budgeting and transaction logging.

**Architecture:** Minimal API backend with EF Core SQLite, feeding a dashboard-first React UI using TailwindCSS and Recharts for visualizing budget vs. spend.

**Tech Stack:** .NET 8 Minimal APIs, EF Core SQLite, React, Vite, Tailwind CSS, Recharts.

---

### Task 1: Backend Test Setup & DB Models
**Files:**
- Create: `src/Sanad.Api/Models/TransactionCategory.cs`
- Create: `src/Sanad.Api/Models/Transaction.cs`
- Modify: `src/Sanad.Api/Data/SanadDbContext.cs`

- [ ] **Step 1: Create Backend Test Project**
```bash
cd src
dotnet new xunit -n Sanad.Api.Tests
cd Sanad.Api.Tests
dotnet add reference ../Sanad.Api/Sanad.Api.csproj
dotnet add package Microsoft.EntityFrameworkCore.InMemory
cd ../..
dotnet sln add src/Sanad.Api.Tests/Sanad.Api.Tests.csproj
```

- [ ] **Step 2: Create EF Core Models**
Create `src/Sanad.Api/Models/TransactionCategory.cs`:
```csharp
namespace Sanad.Api.Models;

public class TransactionCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#cccccc";
    public decimal MonthlyBudget { get; set; }
}
```

Create `src/Sanad.Api/Models/Transaction.cs`:
```csharp
namespace Sanad.Api.Models;

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public decimal Amount { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "Expense"; // "Income" or "Expense"
    public Guid CategoryId { get; set; }
    
    public TransactionCategory? Category { get; set; }
}
```

- [ ] **Step 3: Update DbContext**
Modify `src/Sanad.Api/Data/SanadDbContext.cs`:
```csharp
// Add to SanadDbContext inside the class:
public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
public DbSet<Transaction> Transactions => Set<Transaction>();
```

- [ ] **Step 4: Commit**
```bash
git add src/Sanad.Api.Tests src/Sanad.Api/Models src/Sanad.Api/Data Sanad.sln
git commit -m "feat(finance): add models and test project"
```

### Task 2: Backend Endpoints for Categories & Transactions
**Files:**
- Modify: `src/Sanad.Api/Program.cs`
- Create: `src/Sanad.Api.Tests/FinanceApiTests.cs`

- [ ] **Step 1: Write Endpoint Tests**
Create `src/Sanad.Api.Tests/FinanceApiTests.cs` using InMemory DB to test adding a category and logging a transaction.
```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Xunit;

namespace Sanad.Api.Tests;

public class FinanceApiTests
{
    [Fact]
    public async Task CanAddCategoryAndTransaction()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: "FinanceTest")
            .Options;

        using var context = new SanadDbContext(options);
        
        var category = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
        context.TransactionCategories.Add(category);
        await context.SaveChangesAsync();

        var transaction = new Transaction { Amount = 20, CategoryId = category.Id, Description = "Lunch" };
        context.Transactions.Add(transaction);
        await context.SaveChangesAsync();

        Assert.Equal(1, context.TransactionCategories.Count());
        Assert.Equal(1, context.Transactions.Count());
        Assert.Equal("Food", context.Transactions.Include(t => t.Category).First().Category!.Name);
    }
}
```

- [ ] **Step 2: Run test (should pass since logic is just EF)**
```bash
dotnet test src/Sanad.Api.Tests
```

- [ ] **Step 3: Add Endpoints in Program.cs**
Add these endpoints above `app.Run();` in `src/Sanad.Api/Program.cs`:
```csharp
// GET categories
app.MapGet("/api/finances/categories", async (SanadDbContext db) => 
    Results.Ok(await db.TransactionCategories.ToListAsync()));

// POST category
app.MapPost("/api/finances/categories", async (SanadDbContext db, TransactionCategory category) =>
{
    db.TransactionCategories.Add(category);
    await db.SaveChangesAsync();
    return Results.Created($"/api/finances/categories/{category.Id}", category);
});

// GET transactions
app.MapGet("/api/finances/transactions", async (SanadDbContext db) =>
    Results.Ok(await db.Transactions.Include(t => t.Category).OrderByDescending(t => t.Date).ToListAsync()));

// POST transaction
app.MapPost("/api/finances/transactions", async (SanadDbContext db, Transaction transaction) =>
{
    db.Transactions.Add(transaction);
    
    // Add to timeline
    var timelineItem = new TimelineItem 
    {
        ItemType = "Transaction",
        ReferenceId = transaction.Id.ToString()
    };
    db.TimelineItems.Add(timelineItem);
    
    await db.SaveChangesAsync();
    return Results.Created($"/api/finances/transactions/{transaction.Id}", transaction);
});

// GET summary (spend vs budget)
app.MapGet("/api/finances/summary", async (SanadDbContext db) =>
{
    var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
    
    var categories = await db.TransactionCategories.ToListAsync();
    var transactions = await db.Transactions
        .Where(t => t.Date >= startOfMonth && t.Type == "Expense")
        .ToListAsync();

    var summary = categories.Select(c => new
    {
        Category = c,
        Spent = transactions.Where(t => t.CategoryId == c.Id).Sum(t => t.Amount),
        Remaining = c.MonthlyBudget - transactions.Where(t => t.CategoryId == c.Id).Sum(t => t.Amount)
    });

    return Results.Ok(summary);
});
```

- [ ] **Step 4: Commit**
```bash
git add src/Sanad.Api/Program.cs src/Sanad.Api.Tests/FinanceApiTests.cs
git commit -m "feat(finance): add endpoints for transactions and categories"
```

### Task 3: Frontend Finance Dashboard
**Files:**
- Create: `frontend/src/pages/FinanceDashboard.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Install Recharts**
```bash
cd frontend
npm install recharts
cd ..
```

- [ ] **Step 2: Create FinanceDashboard Component**
Create `frontend/src/pages/FinanceDashboard.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = 'http://localhost:5186/api';

export default function FinanceDashboard() {
  const [summary, setSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // form state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [desc, setDesc] = useState('');

  const loadData = async () => {
    const sumRes = await fetch(`${API_URL}/finances/summary`);
    const sumData = await sumRes.json();
    setSummary(sumData);
    
    const catRes = await fetch(`${API_URL}/finances/categories`);
    setCategories(await catRes.json());
    
    const txRes = await fetch(`${API_URL}/finances/transactions`);
    setTransactions(await txRes.json());
  };

  useEffect(() => { loadData(); }, []);

  const handleLog = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/finances/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(amount),
        categoryId,
        description: desc,
        type: 'Expense',
        date: new Date().toISOString()
      })
    });
    setAmount(''); setDesc('');
    loadData();
  };

  const totalBudget = summary.reduce((acc, curr) => acc + curr.category.monthlyBudget, 0);
  const totalSpent = summary.reduce((acc, curr) => acc + curr.spent, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6">Financial Tracking</h1>
      
      {/* Top Metrics */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400">Total Spent</p>
          <p className="text-3xl font-semibold">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400">Total Budget</p>
          <p className="text-3xl font-semibold">${totalBudget.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400">Remaining</p>
          <p className="text-3xl font-semibold">${(totalBudget - totalSpent).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Budget vs Spend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary} dataKey="spent" nameKey="category.name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                  {summary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.category.colorHex} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Log Form */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Quick Log</h2>
          <form onSubmit={handleLog} className="flex flex-col gap-4">
            <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-white" required />
            <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-white" required>
              <option value="">Select Category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-white" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 p-2 rounded font-semibold transition-colors">Log Expense</button>
          </form>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
        <div className="flex flex-col gap-2">
          {transactions.map(tx => (
            <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-900 rounded border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tx.category?.colorHex }}></div>
                <span className="font-medium">{tx.description || 'No description'}</span>
                <span className="text-sm text-gray-400">{tx.category?.name}</span>
              </div>
              <span className="font-semibold">${tx.amount.toFixed(2)}</span>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-gray-500">No transactions yet.</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Modify App.jsx**
Modify `frontend/src/App.jsx` to import and route to the new dashboard (assume react-router-dom is used from Phase 1/2). Add `import FinanceDashboard from './pages/FinanceDashboard';` and `<Route path="/finance" element={<FinanceDashboard />} />`.

- [ ] **Step 4: Commit**
```bash
git add frontend/package.json frontend/package-lock.json frontend/src/pages/FinanceDashboard.jsx frontend/src/App.jsx
git commit -m "feat(finance): build frontend dashboard and integrate Recharts"
```
