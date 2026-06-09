# Assets Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add, edit, and track the value of financial assets over time through a tabbed interface on the Finance Dashboard.

**Architecture:** We will create `Asset` and `AssetSnapshot` EF Core models in the backend. An `AssetEndpoints` file will handle CRUD and historical data aggregation. The frontend `FinanceDashboard.jsx` will be split into two tabs, integrating a list for assets and a Recharts line chart for the historical net worth.

**Tech Stack:** React, Tailwind CSS, Recharts (Frontend) / ASP.NET Core Minimal APIs, Entity Framework Core, SQLite (Backend).

## Proposed Changes

---

### Backend Data Layer

#### [NEW] [Asset.cs](file:///Users/yousefbalout/dev/yousef/sanad/src/Sanad.Api/Models/Asset.cs)
#### [NEW] [AssetSnapshot.cs](file:///Users/yousefbalout/dev/yousef/sanad/src/Sanad.Api/Models/AssetSnapshot.cs)
#### [MODIFY] [SanadDbContext.cs](file:///Users/yousefbalout/dev/yousef/sanad/src/Sanad.Api/Data/SanadDbContext.cs)

### Task 1: Create Backend Models & Context

**Files:**
- Create: `src/Sanad.Api/Models/Asset.cs`
- Create: `src/Sanad.Api/Models/AssetSnapshot.cs`
- Modify: `src/Sanad.Api/Data/SanadDbContext.cs`

- [ ] **Step 1: Write `Asset` model**
```csharp
using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class Asset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = "Cash"; 
    
    [Required]
    public decimal CurrentAmount { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 2: Write `AssetSnapshot` model**
```csharp
using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class AssetSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid AssetId { get; set; }
    
    [Required]
    public decimal Amount { get; set; }
    
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    
    public Asset? Asset { get; set; }
}
```

- [ ] **Step 3: Update `SanadDbContext.cs`**
Add `DbSet<Asset> Assets` and `DbSet<AssetSnapshot> AssetSnapshots`.

- [ ] **Step 4: Create EF Core Migration**
Run: `dotnet ef migrations add AddAssets --project src/Sanad.Api`

- [ ] **Step 5: Commit**
```bash
git add src/Sanad.Api/Models/Asset.cs src/Sanad.Api/Models/AssetSnapshot.cs src/Sanad.Api/Data/SanadDbContext.cs src/Sanad.Api/Migrations/
git commit -m "feat: add Asset and AssetSnapshot models and migration"
```

---

### Backend Endpoints & Tests

#### [NEW] [AssetEndpoints.cs](file:///Users/yousefbalout/dev/yousef/sanad/src/Sanad.Api/Endpoints/AssetEndpoints.cs)
#### [NEW] [AssetApiTests.cs](file:///Users/yousefbalout/dev/yousef/sanad/src/Sanad.Api.Tests/AssetApiTests.cs)
#### [MODIFY] [Program.cs](file:///Users/yousefbalout/dev/yousef/sanad/src/Sanad.Api/Program.cs)

### Task 2: Implement Asset Endpoints with Tests

**Files:**
- Create: `src/Sanad.Api/Endpoints/AssetEndpoints.cs`
- Create: `src/Sanad.Api.Tests/AssetApiTests.cs`
- Modify: `src/Sanad.Api/Program.cs`

- [ ] **Step 1: Write Endpoint tests in `AssetApiTests.cs`**
Create tests for creating an asset (verifying it creates a snapshot), updating an asset (verifying it creates a new snapshot), and fetching history.

- [ ] **Step 2: Implement `AssetEndpoints.cs`**
```csharp
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class AssetEndpoints
{
    public static void MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/finances/assets", GetAssets);
        app.MapPost("/api/finances/assets", CreateAsset);
        app.MapPut("/api/finances/assets/{id}", UpdateAsset);
        app.MapDelete("/api/finances/assets/{id}", DeleteAsset);
        app.MapGet("/api/finances/assets/history", GetAssetsHistory);
    }
    
    // Implementations for Get, Create, Update, Delete, and History endpoints
    // ...
}
```
*Note: Create logic will insert `Asset` and `AssetSnapshot`. Update logic will update `Asset.CurrentAmount` and insert `AssetSnapshot`.*

- [ ] **Step 3: Register in `Program.cs`**
Add `api.MapAssetEndpoints();` near `api.MapFinanceEndpoints();`.

- [ ] **Step 4: Run Tests**
Run `dotnet test src/Sanad.Api.Tests/Sanad.Api.Tests.csproj`

- [ ] **Step 5: Commit**
```bash
git add src/Sanad.Api/Endpoints/AssetEndpoints.cs src/Sanad.Api/Program.cs src/Sanad.Api.Tests/AssetApiTests.cs
git commit -m "feat: implement asset endpoints and tests"
```

---

### Frontend UI Component

#### [MODIFY] [FinanceDashboard.jsx](file:///Users/yousefbalout/dev/yousef/sanad/frontend/src/pages/FinanceDashboard.jsx)
#### [NEW] [AssetsTab.jsx](file:///Users/yousefbalout/dev/yousef/sanad/frontend/src/pages/AssetsTab.jsx)

### Task 3: Build Assets UI and Tab Navigation

**Files:**
- Create: `frontend/src/pages/AssetsTab.jsx`
- Modify: `frontend/src/pages/FinanceDashboard.jsx`

- [ ] **Step 1: Extract Assets UI to a component (`AssetsTab.jsx`)**
Implement `AssetsTab` component that fetches `/api/finances/assets` and `/api/finances/assets/history`. Include form for adding an asset, a list of assets with inline editing, and a `LineChart` using `recharts` for history.

- [ ] **Step 2: Update `FinanceDashboard.jsx` to support Tabs**
Introduce a state `activeTab` ('spending' | 'assets'). Wrap the existing spending dashboard in conditionally rendered block and render `AssetsTab` when active.

- [ ] **Step 3: Verify visually**
Start the frontend server and verify that the user can switch tabs, create an asset, edit its amount, and see the history chart updating.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/FinanceDashboard.jsx frontend/src/pages/AssetsTab.jsx
git commit -m "feat: add assets tab to finance dashboard"
```

## Verification Plan

### Automated Tests
- Run `dotnet test src/Sanad.Api.Tests/Sanad.Api.Tests.csproj` to ensure Asset endpoint tests pass and Finance endpoints aren't broken.

### Manual Verification
- Start backend (`dotnet run`) and frontend (`npm run dev`).
- Navigate to Finance Dashboard, click "Assets & Net Worth" tab.
- Add "Cash", Amount "1000". Verify it appears in the list and chart.
- Edit "Cash" to "1200". Verify the chart shows an increase line to 1200.
