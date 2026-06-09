# MCP Server Integration Design

## Overview
The goal is to implement an MCP (Model Context Protocol) Server within the Sanad application to allow AI agents to read information and perform actions on user data. The server will provide direct access to Thoughts, Tasks, Transactions, and Notes.

## Architecture Choice
We will build an **Integrated C# MCP Server**.
By adding an MCP SDK (`ModelContextProtocol.AspNetCore` or similar) directly to the `Sanad.Api` project, the MCP Server can leverage the existing Entity Framework core `DbContext` to directly read and write to the database. This approach avoids the overhead of making local HTTP calls from a standalone Node.js server.

The MCP Server will expose the following endpoints over standard IO or SSE (depending on the MCP configuration, usually SSE for ASP.NET applications or stdio if run separately):

## Access (Resources / Tools)

### Thoughts
- **Read**: Fetch a list of thoughts or a specific thought by ID.
- **Actions (Tools)**:
  - `create_thought(content, tags)`
  - `edit_thought(id, content, tags)`
  - `delete_thought(id)`

### Tasks
- **Read**: Fetch a list of tasks or a specific task by ID.
- **Actions (Tools)**:
  - `create_task(title, description, status, columnId)`
  - `edit_task(id, title, description, status, columnId)`
  - `delete_task(id)`

### Transactions
- **Read**: Fetch a list of transactions or a specific transaction by ID.
- **Actions (Tools)**:
  - `create_transaction(amount, category, date, description)`
  - `delete_transaction(id)`

### Notes (Notebook)
- **Read**: Fetch a list of notes or a specific note by ID.
- **Actions (Tools)**:
  - `create_note(title, content, tags)`
  - `edit_note(id, title, content, tags)`
  - `delete_note(id)`

## Implementation Strategy
1. **Package Installation**: Install an MCP SDK for C# (e.g. `ModelContextProtocol` or `Mcp.NET`).
2. **Server Configuration**: Register the MCP server in `Program.cs`.
3. **Tool/Resource Definitions**: Create handlers for each of the tools and resources listed above using the application's `AppDbContext`.
4. **Security/Authentication**: Ensure the MCP server securely connects. If running locally, we may rely on localhost restrictions. If exposed via HTTP, proper authorization headers or tokens must be used.

## Self-Review Checklist
- [x] Placeholder scan: No missing requirements.
- [x] Internal consistency: All requested entities (Thoughts, Tasks, Transactions, Notes) are covered.
- [x] Scope check: Focused explicitly on MCP endpoints.
- [x] Ambiguity check: The architecture is clearly defined as C# integrated.
