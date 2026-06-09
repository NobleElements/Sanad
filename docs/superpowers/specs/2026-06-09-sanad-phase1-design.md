# Sanad - Phase 1 Design Spec

## Goal
Build the core foundation and dashboard for "Sanad", a personal life organizing system. This phase sets up the .NET backend, React frontend, and implements the main dashboard view where thoughts and a vertical timeline are captured.

## System Architecture

### Backend
- **Framework:** .NET 8/9 Minimal APIs
- **Database:** SQLite via Entity Framework Core
- **Storage:** Local file system (`/Data/sanad.db`, `/Data/Files/`)

### Frontend
- **Framework:** React + Vite (SPA)
- **Styling:** Tailwind CSS
- **Routing:** React Router

## Component Design

### 1. Backend Data Models
- **Thought**: `Id` (string/guid), `Content` (string), `CreatedAt` (datetime)
- **TimelineItem**: `Id` (string/guid), `ItemType` (string - e.g., "Thought", "Task", "Spending"), `ReferenceId` (string), `CreatedAt` (datetime)

### 2. Frontend Layout & Components
- **SidebarNav:** Left-side navigation menu (Dashboard, Tasks, Notebook, Finance). Only Dashboard is active in Phase 1.
- **DashboardGrid:** 
  - **Top Row:** MetricCards for Balance, Goals, Habits (placeholders for now).
  - **Main Area:** ThoughtsInput (textbox for quick capture) sitting above a VerticalTimeline (feed of the last 10 TimelineItems).
- **ThoughtsInput:** Text area that posts a new Thought and automatically creates a TimelineItem.
- **VerticalTimeline:** Reads the latest 10 TimelineItems and displays them in descending order.

## Constraints & Assumptions
- The system is for personal use, so authentication is out of scope for Phase 1.
- The UI should have a modern, rich aesthetic with smooth interactions.
- Other subsystems (Tasks, Notebook, Finance, MCP server) are explicitly deferred to later phases.

## Verification
- Can run the .NET backend and Vite frontend concurrently.
- User can enter a thought in the ThoughtsInput.
- Thought saves to SQLite and appears immediately in the VerticalTimeline.
