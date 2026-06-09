# Phase 2: Task Management Design Spec

## Goal
Implement a robust task management subsystem for the Sanad Personal Organizer that features highly scannable list views and rich document editing capabilities.

## Architecture & Data Model

### Database (EF Core / SQLite)
We will introduce three new entities:
1. **`TaskItem`**
   - `Id` (Guid or Int)
   - `Title` (String)
   - `Content` (String, stores the rich HTML/Markdown from the editor)
   - `Status` (Enum or String: ToDo, InProgress, Done)
   - `Tags` (String, comma-separated for simplicity)
   - `CreatedAt` and `UpdatedAt` (DateTime)

2. **`TaskComment`**
   - `Id` (Guid or Int)
   - `TaskItemId` (Foreign Key)
   - `Text` (String)
   - `CreatedAt` (DateTime)

3. **`TaskAttachment`**
   - `Id` (Guid or Int)
   - `TaskItemId` (Foreign Key)
   - `FileName` (String)
   - `FilePath` (String, relative path on local disk)
   - `CreatedAt` (DateTime)

### Storage
- Attachments will be uploaded via multipart form data and saved to a local directory (e.g., `.sanad_data/attachments`).

## Backend API

Minimal API endpoints in `Sanad.Api`:
- `GET /api/tasks` - Retrieve all tasks (optionally filtered by status/tags).
- `GET /api/tasks/{id}` - Retrieve a single task with its comments and attachments.
- `POST /api/tasks` - Create a new task.
- `PUT /api/tasks/{id}` - Update a task (title, content, status, tags).
- `DELETE /api/tasks/{id}` - Delete a task and its related data.
- `POST /api/tasks/{id}/comments` - Add a comment to a task.
- `POST /api/tasks/{id}/attachments` - Upload a file and attach it to the task.

## Frontend UI (React)

### 1. Main View: Simple List
- A high-density, easily scannable list or table view displaying tasks.
- Columns/Indicators: Title, Status (color-coded badge), Tags, and a paperclip icon if attachments exist.
- Clicking on a row opens the Side Panel Drawer.

### 2. Task Details: Side Panel Drawer
- Slides in from the right edge of the screen, overlaying the right side of the list while keeping the left side visible.
- Contains the task title (editable) and metadata (status, tags).

### 3. Rich Document Editor
- Embedded within the Drawer.
- Uses a rich text library (e.g., TipTap or React-Quill) to allow robust formatting.
- Checklists are handled natively within the rich text editor (e.g., Markdown-style task lists `- [ ]`).

### 4. Activity & Attachments Section
- Located at the bottom of the Drawer below the rich text editor.
- **Attachments**: Drag-and-drop zone for files, displaying a list of uploaded files with download/view links.
- **Comments**: A chronological feed of comments with a text input at the bottom to add new ones.

## Testing Strategy
- **Backend**: Unit tests for endpoints and EF Core database operations.
- **Frontend**: Component testing for the Drawer and Rich Text Editor rendering.
