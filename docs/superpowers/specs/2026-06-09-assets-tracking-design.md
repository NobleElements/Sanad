# Assets Tracking Feature Design

## Overview
This feature introduces the ability for users to track their financial assets (e.g., cash, gold, bank accounts, credit cards). Users will be able to manually update the current value of each asset, and the system will automatically maintain a historical record of these updates (snapshots) to generate a history chart showing net worth over time.

## 1. Data Architecture

### `Asset` Model
- `Id` (Guid)
- `Name` (String) - e.g., "Chase Checking"
- `Type` (String) - e.g., "Cash", "Gold", "Bank Account", "Card"
- `CurrentAmount` (Decimal)
- `CreatedAt` (DateTime)
- `UpdatedAt` (DateTime)

### `AssetSnapshot` Model
- `Id` (Guid)
- `AssetId` (Guid) - Foreign Key to Asset
- `Amount` (Decimal) - The value recorded at the snapshot time
- `RecordedAt` (DateTime)

## 2. API Architecture

Add the following endpoints to `FinanceEndpoints.cs` (or create `AssetEndpoints.cs`):
- `GET /api/finances/assets`: Retrieve all assets.
- `POST /api/finances/assets`: Create a new asset. Automatically generates an initial `AssetSnapshot`.
- `PUT /api/finances/assets/{id}`: Update an asset's `CurrentAmount`. Automatically generates a new `AssetSnapshot` for the current date.
- `DELETE /api/finances/assets/{id}`: Delete an asset and its associated snapshots.
- `GET /api/finances/assets/history`: Returns a time-series list of snapshot sums to power the historical chart.

## 3. Frontend Architecture

### UI Layout
- **Tabbed Interface:** Refactor `FinanceDashboard.jsx` to introduce two top-level tabs:
  1. **Spending & Budget:** The existing dashboard content.
  2. **Assets & Net Worth:** The new content for this feature.

### Assets & Net Worth Tab
- **Add Asset Section:** A simple input form to create a new asset, specifying Name, Type, and Initial Amount.
- **Assets List:** A display of all current assets, grouped or ordered cleanly. Users can click the amount of an asset to edit it inline (similar to the current budget editing experience).
- **History Chart:** A `Recharts` `LineChart` visualizing total net worth over time, derived from the historical snapshots of all assets.
