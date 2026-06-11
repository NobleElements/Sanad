# Task Comments and Attachments Design

This document outlines the technical design for adding comments and attachments to Tasks in Sanad.

## Purpose

To allow users and AI agents to attach files and have rich-text discussions on individual tasks. This enhances task management by keeping relevant context (files, feedback, updates) directly attached to the tasks themselves.

## Backend (API) Changes

File: `src/Sanad.Api/Endpoints/TaskEndpoints.cs`

Currently, `POST` endpoints exist for creating comments and attachments. We will add the corresponding `DELETE` endpoints.

### Delete Comment
- **Endpoint**: `DELETE /api/tasks/{taskId}/comments/{commentId}`
- **Behavior**: Deletes the comment from the database.

### Delete Attachment
- **Endpoint**: `DELETE /api/tasks/{taskId}/attachments/{attachmentId}`
- **Behavior**: Deletes the attachment record from the database AND deletes the physical file from `Data/attachments` to avoid orphaned files.

### Downloading Attachments
- No new endpoint required. Attachments are already served statically at `/attachments/{fileName}` by the web server.

## Backend (MCP) Integration

File: `src/Sanad.Api/Endpoints/McpEndpoints.cs`

We will add specialized tools to allow the LLM to manage task details independently without monolithic updates.

- `GetTaskDetails(Guid taskId)`: Returns a task along with its `Comments` and `Attachments`.
- `AddTaskComment(Guid taskId, string text)`: Appends a new rich-text comment to the task.
- `DeleteTaskComment(Guid commentId)`: Deletes a specific comment by ID.
- `AttachFileToTask(Guid taskId, string localFilePath)`: Reads a file from the user's local disk, copies it into `Data/attachments`, creates a unique filename, and saves an attachment record.
- `DeleteTaskAttachment(Guid attachmentId)`: Removes an attachment record and deletes its physical file.

## Frontend Updates

### State Management (`useTaskStore.js`)
Add the following methods:
- `getTaskDetails(id)`: Fetches full task details from `/api/tasks/{id}`.
- `addTaskComment(taskId, commentText)`: POSTs a new comment.
- `deleteTaskComment(taskId, commentId)`: DELETEs a comment.
- `uploadTaskAttachment(taskId, file)`: POSTs a new multipart form-data attachment.
- `deleteTaskAttachment(taskId, attachmentId)`: DELETEs an attachment.

### User Interface (`TaskModal.jsx`)

**Modal Lifecycle:**
- When editing an existing task, the modal will fetch the full task details via `getTaskDetails` to load comments and attachments.

**Attachments Section:**
- Render an "Attachments" header below the description.
- Include an `<input type="file" />` disguised as an upload button.
- Render a list of attached files.
- Each file name acts as a link (`target="_blank"`) to download/view the file.
- Next to each file, include a Trash icon to delete the attachment.

**Comments Section:**
- Render a "Comments" header at the bottom.
- Render the list of existing comments in chronological order. Since comments use rich text, they will be rendered safely using TipTap or `dangerouslySetInnerHTML`.
- Next to each comment (or on hover), include a Delete button.
- At the bottom of the list, embed a new instance of `TipTapEditor` for composing replies, paired with a "Post Comment" button.
