# Phase 3: Financial Tracking Design Spec

## Overview
Phase 3 introduces a Financial Tracking subsystem to the Sanad Personal Organizer. The goal is to provide a comprehensive financial tracker that enables both quick logging of day-to-day transactions and proactive monthly budgeting using a fixed set of categories. The UI will prioritize a "dashboard-first" layout, placing heavy emphasis on visual data, charts, and budget progress over raw transaction ledgers.

## Architecture & Data Model

### Backend Models (Entity Framework Core / SQLite)
Two new models will be introduced to the SQLite database:

1. **TransactionCategory**
   - `Id` (Primary Key, GUID)
   - `Name` (String) - e.g., "Food", "Housing"
   - `ColorHex` (String) - Used for charting to keep visual consistency.
   - `MonthlyBudget` (Decimal) - The target budget limit for this category.

2. **Transaction**
   - `Id` (Primary Key, GUID)
   - `Amount` (Decimal) - The value of the transaction.
   - `Date` (DateTime) - When the transaction occurred.
   - `Description` (String) - Optional note for the transaction.
   - `Type` (Enum/String) - Income or Expense.
   - `CategoryId` (Foreign Key -> TransactionCategory.Id) - Every transaction must map to exactly one fixed category.

### API Endpoints (Minimal APIs)
- `GET /api/finances/categories` - Fetch all categories with their budget limits.
- `POST /api/finances/categories` - Create or edit a category.
- `GET /api/finances/transactions` - Fetch a list of transactions, filterable by date.
- `POST /api/finances/transactions` - Log a new transaction.
- `GET /api/finances/summary` - Calculate and return the monthly spend vs budget grouped by category.

### Integration with Sanad Core
- When a new transaction is logged, a corresponding entry will be appended to the central `TimelineItem` feed, allowing financial activities to organically surface on the user's primary dashboard.

## Frontend & UI

### Dashboard Layout
A new route (`/finance`) will be added to the React frontend. The page will use a Dashboard-First layout:

1. **Top Metrics Row**
   - Total Spend this Month
   - Total Budget
   - Remaining Balance

2. **Main Chart Area**
   - A ring chart or bar chart displaying spend vs. budget per category.
   - Will utilize the `ColorHex` from `TransactionCategory` for aesthetic cohesion.
   - Tools: Recharts or simple Tailwind/Framer Motion custom components.

3. **Quick Logging Form**
   - A low-friction inline form or modal to quickly input an Amount, Description, and select a Category from a dropdown. 

4. **Recent Transactions**
   - Located below or to the side of the charts.
   - Displays a clean list of the 10-15 most recent transactions.
   - Uses category colors as visual accents.

## Non-Goals & Out of Scope
- Direct bank integration (Plaid/etc).
- CSV imports (manual entry only for this phase).
- Multi-currency support.
- Hierarchical categories.
