# Reading Tracker Design Spec

## Goal
Implement a reading tracking feature for the Sanad application that allows users to add books, plan reading sessions by chapters, track daily reading progress, and view yearly statistics.

## Architecture

### Data Models
Four new tables will be added to the Entity Framework Core context:
1. `Book`: Id, Title, Author, CoverUrl, TotalPages, ExternalApiId.
2. `ReadingPeriod`: Id, BookId, StartDate, EndDate, Status (Planning, Reading, Completed).
3. `ReadingPlan`: Id, ReadingPeriodId, Title, StartPage, EndPage, OrderIndex.
4. `ReadingLog`: Id, ReadingPeriodId, Date, StartPage, EndPage.

### External Integrations
- **OpenLibrary API**: Used to fetch book details and covers without requiring an API key. 
  - Search: `https://openlibrary.org/search.json?q={query}`
  - Cover Images: `https://covers.openlibrary.org/b/id/{cover_id}-L.jpg`

### Backend Endpoints
- `GET /api/books/search`: Proxies OpenLibrary search.
- `POST /api/books`: Adds a book to the library.
- `GET /api/reading-periods`: Lists reading periods with history/stats.
- `POST /api/reading-periods`: Starts a reading session and saves the chapter plan.
- `POST /api/reading-logs`: Logs reading progress.
- `GET /api/reading-periods/current`: Returns the active reading session and calculates the current chapter and pages left based on the most recent log.

### Frontend UI
- **Bookshelf Page**: Search/add books, view history/stats, and list active/completed books.
- **Planning Modal**: UI to add chapter rows (Title, Start, End) when starting a reading period.
- **Active Reading View**: Progress bar for the book, and localized chapter progress (e.g., "15 pages left in Chapter 2").
- **Dashboard Integration**: A new "Current Read" widget on the main dashboard showing the active book cover, current chapter, and a quick-log input field.

## State Transitions
- **Planning**: Book added to period, but chapters are being configured.
- **Reading**: First log is recorded. System checks highest `EndPage` in `ReadingLog` against `ReadingPlan` ranges to determine current chapter.
- **Completed**: Highest `EndPage` reaches the book's `TotalPages`.

## Scope & Constraints
- No PDF reader or content rendering. Management and tracking only.
- A user can read the same book multiple times (handled by multiple `ReadingPeriod` entries for a single `Book`).
