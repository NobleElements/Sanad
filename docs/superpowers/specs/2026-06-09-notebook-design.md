# Notebook Feature - Design Spec

## Goal
Add a knowledge base / wiki feature to Sanad. Users organize notes into folders (notebooks), with a sidebar+editor layout. Notes support rich text editing with code blocks, syntax highlighting, and image embedding. Full-text search across all notes.

## System Architecture

### Backend
- **Two new models:** `Notebook` (folder) and `Note` (page within a folder)
- **Endpoint class:** `NotebookEndpoints.cs` following the `FinanceEndpoints` pattern
- **Image uploads:** Reuse the existing `/Data/attachments/` directory
- **Database:** Add DbSets + EF migration. Database must NOT be deleted — migration-only.

### Frontend
- **New page:** `Notebook.jsx` — sidebar+editor layout
- **Reuse:** Extend existing `TipTapEditor.jsx` with CodeBlock + Image extensions
- **Route:** `/notebook` added to App.jsx
- **Sidebar nav:** Update "Coming Soon" to active link

## Data Models

### Notebook (folder)
| Field | Type | Notes |
|-------|------|-------|
| Id | Guid | PK, auto-generated |
| Name | string | Required |
| SortOrder | int | Default 0, for ordering |
| CreatedAt | DateTime | Auto UTC |

### Note (page)
| Field | Type | Notes |
|-------|------|-------|
| Id | Guid | PK, auto-generated |
| NotebookId | Guid | FK to Notebook, required |
| Title | string | Required |
| Content | string? | TipTap HTML content |
| CreatedAt | DateTime | Auto UTC |
| UpdatedAt | DateTime | Auto UTC |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notebooks | List all notebooks |
| POST | /api/notebooks | Create notebook |
| PUT | /api/notebooks/{id} | Rename notebook |
| DELETE | /api/notebooks/{id} | Delete notebook + its notes |
| GET | /api/notebooks/{id}/notes | List notes in a notebook |
| POST | /api/notebooks/{id}/notes | Create note in notebook |
| GET | /api/notes/{id} | Get single note |
| PUT | /api/notes/{id} | Update note (title/content) |
| DELETE | /api/notes/{id} | Delete note |
| GET | /api/notes/search?q= | Search notes by title/content |
| POST | /api/notes/{id}/images | Upload image to note |

## Frontend Layout

**Sidebar (~260px, left panel):**
- Search input at top (filters across all notes)
- "Notebooks" header with + button to create
- List of notebook names (click to select, right-click or icon for rename/delete)
- Divider
- "Notes" header with + button to create note in selected notebook
- List of note titles in selected notebook (click to open in editor)

**Main area (right):**
- Note title as editable input field
- "Last edited X ago" subtitle
- TipTap editor with extended toolbar (bold, italic, strike, lists, headings, code block, image upload)
- Auto-save with debounce (1s after last keystroke)

**Empty states:**
- No notebooks: prompt to create first notebook
- No notes in notebook: prompt to create first note
- No note selected: show a welcome/instruction message

## Features NOT included (YAGNI)
- Tags, favorites, pinning
- Markdown mode / export
- Sharing / collaboration
- Version history
- Drag-and-drop reordering

## Verification
- Can create, rename, delete notebooks
- Can create, edit, delete notes within notebooks
- Rich text editing works (bold, italic, lists, headings, code blocks)
- Image upload and embedding works
- Search filters notes across all notebooks
- Auto-save persists content without manual save
- Existing database data (tasks, transactions, etc.) is preserved
