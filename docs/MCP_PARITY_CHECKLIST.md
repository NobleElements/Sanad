# MCP Parity Checklist

Goal: every user-facing REST endpoint in `src/Sanad.Api/Endpoints/*.cs` has an equivalent MCP tool in `src/Sanad.Api/Endpoints/McpEndpoints.cs`.

## Ground rules for the agent

- MCP tools live in `McpEndpoints.cs` as `[McpServerTool, Description("...")]` methods. Follow the existing style (expression-bodied, one-line descriptions, nullable optional params with defaults).
- Both REST and MCP must call the same `I*Service` method. Never duplicate logic in the tool.
- If a REST handler uses `SanadDbContext` directly in its lambda (no service), first extract an `I<Name>Service` + implementation in `src/Sanad.Api/Services/` (see commit `5f99774` for the pattern), switch the REST endpoint to use it, register it in DI, then add the MCP tool.
- New services must also be added to BOTH constructors of `McpEndpoints` (the DI one and the `SanadDbContext` one).
- Add tests in `src/Sanad.Api.Tests/` (see `NotebookMcpTests.cs` for the pattern). Run `dotnet build` and `dotnet test` after each phase.
- Do not change REST behavior/response shapes while extracting services.
- Tick the box (`[x]`) here when a tool is implemented AND tested. Commit per phase.
- Do NOT implement anything under "Out of scope".

---

## Phase 1: Fix existing tools that expose less than REST

- [x] `GetThoughts`: add `page`, `pageSize`, `search` params (currently hardcoded 1/20)
- [x] `GetTransactions`: add `month`, `year`, `page`, `pageSize`, `search`, `categoryId` (currently hardcoded 20 most recent)
- [x] `CreateTransaction`: accept optional `date` (currently always `UtcNow`) and any other fields REST accepts
- [x] `CreateTask`: expose remaining `TaskItem` fields (due date, priority, etc. — mirror REST `TaskItem` body)
- [x] Goals: add `GetGoal(dateStr)` and `SetGoal(dateStr, goalText)`; keep Today variants
- [x] `GetNotes`: consider paging (optional, low priority)

## Phase 2: Missing operations on areas that already have tools (services exist)

### Thoughts
- [x] `UpdateThought(id, content)` ← PUT `/api/thoughts/{id}`

### Tasks
- [x] `UpdateTask(id, ...)` ← PUT `/api/tasks/{id}` (full update)
- [x] `ReorderTasks(...)` ← PATCH `/api/tasks/reorder`
- [x] `RenameTaskProject(oldName, newName)` ← PUT `/api/tasks/projects/rename`
- [x] `DeleteTaskProject(projectName)` ← DELETE `/api/tasks/projects/{projectName}`

### Finance
- [x] `UpdateCategory(id, ...)` ← PUT `/api/finances/categories/{id}`
- [x] `UpdateTransaction(id, ...)` ← PUT `/api/finances/transactions/{id}`
- [x] `GetFinanceSummary(month?, year?)` ← GET `/api/finances/summary`
- [x] `GetMonthlyBudget(month?, year?)` ← GET `/api/finances/budget`
- [x] `SetMonthlyBudget(...)` ← PUT `/api/finances/budget`

### Currencies
- [x] `GetCurrencies` ← GET `/api/finances/currencies`
- [x] `CreateCurrency(...)` ← POST
- [x] `UpdateCurrency(id, ...)` ← PUT `/{id}`
- [x] `DeleteCurrency(id)` ← DELETE `/{id}`
- [x] `SetDefaultCurrency(id)` ← PUT `/{id}/set-default`

### Debts
- [x] `ReorderDebts(orderedIds)` ← PUT `/api/finances/debts/reorder`
- [x] `GetDebtsHistory` ← GET `/api/finances/debts/history`

### Calendar
- [x] `GetEventCategoryEventCount(id)` ← GET `/api/calendar/categories/{id}/event-count`

### Storage
- [x] `GetStorageHistory` ← GET `/api/storage/history`

## Phase 3: Assets (new area; has `AssetEndpoints.cs` handlers — check whether an `IAssetService` exists, otherwise extract one)

- [x] `GetAssets` ← GET `/api/finances/assets`
- [x] `CreateAsset(...)` ← POST
- [x] `UpdateAsset(id, ...)` ← PUT `/{id}`
- [x] `DeleteAsset(id)` ← DELETE `/{id}`
- [x] `ReorderAssets(orderedIds)` ← PUT `/reorder`
- [x] `GetAssetsHistory` ← GET `/history`

## Phase 4: Areas needing service extraction (REST uses `SanadDbContext` directly)

### Whiteboards (`WhiteboardEndpoints.cs`) — create `IWhiteboardService`
- [x] `GetWhiteboards` ← GET `/api/whiteboards`
- [x] `GetWhiteboard(id)` ← GET `/{id}`
- [x] `CreateWhiteboard(...)` ← POST
- [x] `UpdateWhiteboard(id, ...)` ← PUT `/{id}`
- [x] `DeleteWhiteboard(id)` ← DELETE `/{id}`

### Folders (`FolderEndpoints.cs`) — extend `FileManagerService` or add `IFolderService`
- [x] `CreateFolder(name, parentId?)` ← POST `/api/folders`
- [x] `UpdateFolder(id, name?, parentId?)` ← PUT `/{id}` (rename/move)
- [x] `DeleteFolder(id)` ← DELETE `/{id}` (REST already uses `FileManagerService`)

### Files (`FileEndpoints.cs`) — extend `FileManagerService`
- [x] `GetFile(id)` ← GET `/api/files/{id}`
- [x] `UpdateFile(id, name?, folderId?)` ← PUT `/{id}` (rename/move)
- [x] `DeleteFile(id)` ← DELETE `/{id}` (must also free quota like REST does)

### Share links (`ShareEndpoints.cs`, authenticated routes only) — create `IShareService`
- [x] `CreateFolderShare(folderId, ...)` ← POST `/api/share/folder/{id}`
- [x] `CreateFileShare(fileId, ...)` ← POST `/api/share/file/{id}`
- [x] `ListShares` ← GET `/api/share`
- [x] `UpdateSharePermission(token, ...)` ← PUT `/api/share/{token}`
- [x] `RevokeShare(token)` ← DELETE `/api/share/{token}`

### User settings (`SettingsEndpoints.cs`) — create `ISettingsService`
- [x] `GetSettings` ← GET `/api/settings`
- [x] `UpdateSetting(key, value)` ← PUT `/api/settings/{key}`

### Global search (`SearchEndpoints.cs`) — extract `HandleSearch` into `ISearchService`
- [x] `GlobalSearch(query, ...)` ← GET `/api/search`

## Phase 5: Needs a product decision before starting (skip unless told otherwise)

Subscription / billing:
- [ ] `GetSubscriptionTransactions` ← GET `/api/subscription/transactions`
- [ ] `CancelSubscription` ← POST `/api/subscription/cancel`
- [ ] `ChangeSubscriptionTier(tierId)` ← POST `/api/subscription/change-tier`
- [ ] `VerifyCheckout(...)` ← POST `/api/subscription/verify-checkout`
- [ ] `BackupDatabase(destinationPath)` ← GET `/api/subscription/backup/database` (local-path download pattern, like `DownloadFileFromSanad`)
- [ ] `BackupAttachments(destinationPath)` ← GET `/api/subscription/backup/attachments`

Minor / low value:
- [ ] `GetBookCover(url)` ← GET `/api/books/cover`
- [ ] Attachment/image upload & download by filename (`/api/upload/image`, `/api/attachments/{fileName}`) — already covered for tasks/notes via local-path tools; only add if a gap is found

## Out of scope (do NOT expose via MCP)

- `/api/auth/*` (login, signup, logout, change-password, `api-key/reroll`): MCP authenticates with the API key
- `/api/admin/*` and `/api/admin/settings/*`: admin-only management
- `/api/webhooks/paddle`: inbound webhook
- `/api/settings/public` and `/api/public/share/*`: anonymous, browser-facing
- `/api/files/upload/*` chunked upload: replaced by `UploadFileToSanad` / `UploadFolderToSanad`
- `POST /api/apps/proxy`: SSRF-style proxy
- `GET /api/storage/paddle-config`: billing client config

## Definition of done

- [x] Every box in Phases 1–4 ticked
- [x] `dotnet build` and `dotnet test` pass
- [x] Each new tool has a test in `src/Sanad.Api.Tests/`
- [x] No REST response shape changed

## Verification notes

Phase 5 is deliberately left unticked: the checklist says to skip it unless told otherwise.
The notebook/note CRUD routes (`/api/notebooks*`, `GET|PUT /api/notes/{id}`, `/api/notes/latest`,
`/api/notes/sync`, `/api/notes/{id}/images`) were never listed as required work in Phases 1–4,
so they remain uncovered as well.

Tools are verified two ways:

1. **Unit/integration tests** — `src/Sanad.Api.Tests/McpParityTests.cs` calls every MCP tool
   added or changed in Phases 1–4 against an in-memory database.
   `src/Sanad.Api.Tests/RestContractTests.cs` pins the REST result types and JSON property
   names of every handler that was rewired to a domain service.
2. **Reflection-reachability audit** — the MCP SDK discovers tools and builds their JSON
   schemas reflectively, so a tool whose parameter or return types were trimmed away would
   silently disappear. `.mcp-probe/` is a throwaway harness that publishes the API trimmed
   (`TrimMode=full`) with ILLink's `--dump-dependencies`, which records every member the
   trimmer kept *because reflection reached it*. The audit confirms all **110** tool methods
   are reflection-reachable with zero IL warnings, i.e. no tool is broken by trimming.

   ```bash
   cd .mcp-probe
   NUGET_PACKAGES=$PWD/nugetpkgs dotnet publish -c Debug -p:DumpTrimFacts=true \
     -p:SelfContained=true -p:RuntimeIdentifier=osx-arm64
   ```
