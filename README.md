# [<img src="frontend/public/logo.png" width="150">](https://sanadcloud.app)

Sanad is a comprehensive personal management application designed to help you organize various aspects of your life. It provides a centralized hub to track your tasks, notes, finances, reading progress, and daily thoughts, giving you a holistic view of your productivity and personal growth.

## Screenshots

<details>
<summary>Dashboard</summary>
<br>

![Dashboard](frontend/public/screenshots/dashboard.png)
</details>

<details>
<summary>Tasks</summary>
<br>

![Tasks](frontend/public/screenshots/tasks.png)
</details>

<details>
<summary>Finance</summary>
<br>

![Finance](frontend/public/screenshots/finance.png)
</details>

<details>
<summary>Habits</summary>
<br>

![Habits](frontend/public/screenshots/habits.png)
</details>

<details>
<summary>Thoughts</summary>
<br>

![Thoughts](frontend/public/screenshots/thoughts.png)
</details>

<details>
<summary>Files</summary>
<br>

![Files](frontend/public/screenshots/files.png)
</details>

## Features
- **Task Management**: Create, organize, and track daily tasks and goals.
- **Calendar**: Integrated view combining your scheduled tasks and daily habits for a clear overview of your schedule.
- **Notes & Thoughts**: Capture thoughts quickly and organize detailed notes into notebooks using a rich-text editor.
- **Finance Tracking**: Manage your transactions, categorize expenses, track budgets, and monitor asset snapshots over time.
- **Books & Reading Progress**: Manage your personal bookshelf, track current reads, log reading progress, and maintain reading plans.
- **Habit Tracking**: Define daily, weekly, or monthly routines, visualize your consistency with a 90-day heat map, and build streaks.
- **File Management**: Upload, organize, and preview files seamlessly. Includes full pagination, server-side sorting/filtering, recursive folder management, chunked uploads for large files, and direct browser-to-disk folder downloads.
- **Multi-Tenancy**: Each user has their own separate database to ensure complete data isolation.
- **MCP Builtin for AI Agents**: connect your favorite AI agents, allowing them to help you organize tasks, sort files, and track finances autonomously and securely.

## Stack
**Frontend**:
- React 19
- Vite
- Tailwind CSS
- Zustand (State Management)
- Recharts (Data Visualization)
- Tiptap (Rich Text Editor)

**Backend**:
- .NET 10 Web API
- C#
- Entity Framework Core (SQLite Database)
- BCrypt (Authentication)
- Model Context Protocol (MCP) for .NET

## Getting Started

### Quick Start (Self-Hosting via Docker)
The easiest way to get Sanad running on your own machine or server is using Docker Compose.

```bash
curl -O https://raw.githubusercontent.com/NobleElements/Sanad/main/docs/docker-compose.yml && docker compose up -d
```
Sanad will now be running and accessible at **http://localhost:5858**.

### Local Development

#### Frontend
To run the frontend development server:
```bash
cd frontend
npm install
npm run dev
```

#### Backend
To run the backend API server:
```bash
cd src/Sanad.Api
dotnet run
```

## Comparisons

<details>
<summary><strong>Sanad vs Notion</strong></summary>
<br>
Notion is a highly flexible workspace, but it often requires you to build your own systems from scratch. Sanad provides a structured, out-of-the-box experience tailored for personal management—including dedicated modules for tasks, habits, finances, calendar, and file storage. Furthermore, Sanad is self-hosted, ensuring complete control over your data privacy.
  
</details>

<details>
<summary><strong>Sanad vs Obsidian</strong></summary>
<br>
While Obsidian is exceptional for connected notes and local markdown files, it relies heavily on community plugins to add features like task management or calendars. Sanad delivers a cohesive, all-in-one application out-of-the-box, combining notes, a full task manager, finance tracking, and file storage into a single unified dashboard.
  
</details>

<details>
<summary><strong>Sanad vs TickTick</strong></summary>
<br>
TickTick is great for tasks and habits, but it stops there. Sanad takes your productivity further by integrating a robust rich-text notebook, a self-hosted file manager, and a comprehensive finance tracker, giving you a holistic view of your entire life in one place.
  
</details>

<details>
<summary><strong>Sanad vs Todoist</strong></summary>
<br>
Todoist is a focused and powerful task manager. However, managing your life often requires more than just to-dos. Sanad brings your tasks, calendar, daily habits, personal notes, and financial transactions into a single, beautifully designed self-hosted platform.
  
</details>

<details>
<summary><strong>Sanad vs Amplenote</strong></summary>
<br>
Amplenote integrates notes, tasks, and a calendar effectively. Sanad expands on this concept by adding complete file management, detailed finance tracking, and habit streaks. Additionally, Sanad's self-hostable nature and multi-tenancy support offer unparalleled data sovereignty.
  
</details>

## License
This project is licensed under the MIT License.
