# Task Comments and Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI and Backend functionality to allow users to add/delete rich-text comments and upload/delete/download file attachments to tasks.

**Architecture:** We will add `DELETE` endpoints for comments and attachments to `TaskEndpoints.cs`, create MCP tools in `McpEndpoints.cs`, add API client wrappers in `useTaskStore.js`, and build the components within `TaskModal.jsx`. 

**Tech Stack:** C#, ASP.NET Core, EF Core, React, Zustand, TipTap, MCP

---

### Task 1: Backend API (Comments and Attachments DELETE endpoints)

**Files:**
- Modify: `src/Sanad.Api/Endpoints/TaskEndpoints.cs`
- Create: `src/Sanad.Api.Tests/TaskApiTests.cs`

- [ ] **Step 1: Write the failing tests**

Create `src/Sanad.Api.Tests/TaskApiTests.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Xunit;
using System.IO;

namespace Sanad.Api.Tests;

public class TaskApiTests
{
    [Fact]
    public async Task CanDeleteTaskComment()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
        var task = new TaskItem { Title = "Test Task" };
        context.TaskItems.Add(task);
        await context.SaveChangesAsync();

        var comment = new TaskComment { TaskItemId = task.Id, Text = "Hello" };
        context.TaskComments.Add(comment);
        await context.SaveChangesAsync();

        var result = await TaskEndpoints.DeleteTaskComment(context, task.Id, comment.Id);
        Assert.IsType<NoContent>(result);
        Assert.Equal(0, context.TaskComments.Count());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test src/Sanad.Api.Tests`
Expected: Compilation failure because `DeleteTaskComment` doesn't exist.

- [ ] **Step 3: Write minimal implementation**

In `src/Sanad.Api/Endpoints/TaskEndpoints.cs`, inside `MapTaskEndpoints`:
```csharp
app.MapDelete("/api/tasks/{id}/comments/{commentId}", DeleteTaskComment);
app.MapDelete("/api/tasks/{id}/attachments/{attachmentId}", DeleteTaskAttachment);
```

Add the methods inside `TaskEndpoints` class:
```csharp
public static async Task<IResult> DeleteTaskComment(SanadDbContext db, Guid id, Guid commentId)
{
    var comment = await db.TaskComments.FirstOrDefaultAsync(c => c.Id == commentId && c.TaskItemId == id);
    if (comment == null) return Results.NotFound();
    
    db.TaskComments.Remove(comment);
    await db.SaveChangesAsync();
    return Results.NoContent();
}

public static async Task<IResult> DeleteTaskAttachment(SanadDbContext db, Guid id, Guid attachmentId)
{
    var attachment = await db.TaskAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.TaskItemId == id);
    if (attachment == null) return Results.NotFound();

    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", attachment.FilePath.TrimStart('/'));
    if (File.Exists(filePath))
    {
        File.Delete(filePath);
    }
    
    db.TaskAttachments.Remove(attachment);
    await db.SaveChangesAsync();
    return Results.NoContent();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test src/Sanad.Api.Tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Sanad.Api/Endpoints/TaskEndpoints.cs src/Sanad.Api.Tests/TaskApiTests.cs
git commit -m "feat(api): add delete endpoints for task comments and attachments"
```

### Task 2: Backend MCP Tools

**Files:**
- Modify: `src/Sanad.Api/Endpoints/McpEndpoints.cs`

- [ ] **Step 1: Write the implementation**

In `src/Sanad.Api/Endpoints/McpEndpoints.cs`, under `// Tasks Tools`, add the new tools:

```csharp
[McpServerTool, Description("Get specific task details including comments and attachments")]
public async Task<object?> GetTaskDetails(Guid id)
{
    var task = await _db.TaskItems
        .Include(t => t.Comments.OrderBy(c => c.CreatedAt))
        .Include(t => t.Attachments)
        .AsNoTracking()
        .FirstOrDefaultAsync(t => t.Id == id);
        
    if (task == null) return null;
    return new { Task = task, Comments = task.Comments, Attachments = task.Attachments };
}

[McpServerTool, Description("Add a rich-text comment to a task")]
public async Task<TaskComment?> AddTaskComment(Guid taskId, string text)
{
    var taskExists = await _db.TaskItems.AnyAsync(t => t.Id == taskId);
    if (!taskExists) return null;

    var comment = new TaskComment { TaskItemId = taskId, Text = text };
    _db.TaskComments.Add(comment);
    await _db.SaveChangesAsync();
    return comment;
}

[McpServerTool, Description("Delete a specific task comment")]
public async Task<bool> DeleteTaskComment(Guid commentId)
{
    var comment = await _db.TaskComments.FindAsync(commentId);
    if (comment == null) return false;

    _db.TaskComments.Remove(comment);
    await _db.SaveChangesAsync();
    return true;
}

[McpServerTool, Description("Attach a local file to a task. Provide the absolute file path on disk.")]
public async Task<TaskAttachment?> AttachFileToTask(Guid taskId, string localFilePath)
{
    var taskExists = await _db.TaskItems.AnyAsync(t => t.Id == taskId);
    if (!taskExists || !System.IO.File.Exists(localFilePath)) return null;

    var uploadsDir = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Data", "attachments");
    System.IO.Directory.CreateDirectory(uploadsDir);

    var fileName = System.IO.Path.GetFileName(localFilePath);
    var uniqueFileName = $"{Guid.NewGuid()}{System.IO.Path.GetExtension(localFilePath)}";
    var destPath = System.IO.Path.Combine(uploadsDir, uniqueFileName);

    System.IO.File.Copy(localFilePath, destPath);

    var attachment = new TaskAttachment
    {
        TaskItemId = taskId,
        FileName = fileName,
        FilePath = $"/attachments/{uniqueFileName}"
    };
    _db.TaskAttachments.Add(attachment);
    await _db.SaveChangesAsync();
    return attachment;
}

[McpServerTool, Description("Delete a specific task attachment")]
public async Task<bool> DeleteTaskAttachment(Guid attachmentId)
{
    var attachment = await _db.TaskAttachments.FindAsync(attachmentId);
    if (attachment == null) return false;

    var filePath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Data", attachment.FilePath.TrimStart('/'));
    if (System.IO.File.Exists(filePath))
    {
        System.IO.File.Delete(filePath);
    }

    _db.TaskAttachments.Remove(attachment);
    await _db.SaveChangesAsync();
    return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Sanad.Api/Endpoints/McpEndpoints.cs
git commit -m "feat(mcp): add task comments and attachments tools"
```

### Task 3: Frontend Store Integration

**Files:**
- Modify: `frontend/src/store/useTaskStore.js`

- [ ] **Step 1: Write the implementation**

Add the new state properties and API client functions to `useTaskStore.js`:

```javascript
// ... existing state ...
activeTaskDetails: null,

getTaskDetails: async (id) => {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`);
    if (res.ok) {
      const data = await res.json();
      set({ activeTaskDetails: data });
      return data;
    }
  } catch (err) {
    useUIStore.getState().showError('Failed to load task details');
  }
  return null;
},

addTaskComment: async (taskId, text) => {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res.ok) {
      await get().getTaskDetails(taskId);
      return true;
    }
    throw new Error('Failed to post comment');
  } catch (err) {
    useUIStore.getState().showError('Failed to post comment');
    return false;
  }
},

deleteTaskComment: async (taskId, commentId) => {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      await get().getTaskDetails(taskId);
      return true;
    }
    throw new Error('Failed to delete comment');
  } catch (err) {
    useUIStore.getState().showError('Failed to delete comment');
    return false;
  }
},

uploadTaskAttachment: async (taskId, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      await get().getTaskDetails(taskId);
      return true;
    }
    throw new Error('Failed to upload file');
  } catch (err) {
    useUIStore.getState().showError('Failed to upload file');
    return false;
  }
},

deleteTaskAttachment: async (taskId, attachmentId) => {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/attachments/${attachmentId}`, { method: 'DELETE' });
    if (res.ok) {
      await get().getTaskDetails(taskId);
      return true;
    }
    throw new Error('Failed to delete attachment');
  } catch (err) {
    useUIStore.getState().showError('Failed to delete attachment');
    return false;
  }
},
```

Also modify `closeTaskModal`:
```javascript
closeTaskModal: () => {
  set({ isTaskModalOpen: false, activeTask: null, activeTaskDetails: null });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/useTaskStore.js
git commit -m "feat(frontend): add task comments and attachments store functions"
```

### Task 4: Frontend UI (Task Modal)

**Files:**
- Modify: `frontend/src/components/TaskModal.jsx`

- [ ] **Step 1: Write the implementation**

In `frontend/src/components/TaskModal.jsx`, import the store and add state logic:

```jsx
// Import at top:
import useTaskStore from '../store/useTaskStore';
import { Trash2, Download } from 'lucide-react'; // Replace coming soon icons if needed

// Inside TaskModal component:
const { 
  activeTaskDetails, getTaskDetails, addTaskComment, deleteTaskComment, 
  uploadTaskAttachment, deleteTaskAttachment 
} = useTaskStore();

const [newComment, setNewComment] = useState('');
const fileInputRef = useRef(null);

useEffect(() => {
  if (isOpen && task && !task.isNew) {
    getTaskDetails(task.id);
  }
}, [isOpen, task]);

const handlePostComment = async () => {
  if (!newComment.trim() || newComment === '<p></p>') return;
  await addTaskComment(task.id, newComment);
  setNewComment('');
};

const handleFileSelect = async (e) => {
  const file = e.target.files?.[0];
  if (file) {
    await uploadTaskAttachment(task.id, file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};
```

Replace the "coming soon" placeholders with:

```jsx
{!task.isNew && activeTaskDetails && (
  <div className="pt-4 space-y-6 border-t border-gray-100 dark:border-gray-800">
    
    {/* Attachments Section */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Attachments
        </label>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          + Upload File
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect} 
        />
      </div>
      
      {activeTaskDetails.attachments?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeTaskDetails.attachments.map(att => (
            <div key={att.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-lg group">
              <a 
                href={`${API_BASE}${att.filePath}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 overflow-hidden hover:opacity-80"
              >
                <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{att.fileName}</span>
              </a>
              <button
                onClick={() => deleteTaskAttachment(task.id, att.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-red-50 dark:hover:bg-red-500/10"
                title="Delete Attachment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 dark:text-gray-500 italic p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
          No attachments yet
        </div>
      )}
    </div>

    {/* Comments Section */}
    <div className="space-y-4">
      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Comments
      </label>
      
      <div className="space-y-3">
        {activeTaskDetails.comments?.map(comment => (
          <div key={comment.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 group relative">
            <button
              onClick={() => deleteTaskComment(task.id, comment.id)}
              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-red-50 dark:hover:bg-red-500/10"
              title="Delete Comment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="text-xs text-gray-400 mb-2">
              {new Date(comment.createdAt).toLocaleString()}
            </div>
            <div 
              className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-1"
              dangerouslySetInnerHTML={{ __html: comment.text }}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <TipTapEditor content={newComment} onChange={setNewComment} onImageUpload={handleImageUpload} />
        <div className="flex justify-end">
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim() || newComment === '<p></p>'}
            className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Post Comment
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/TaskModal.jsx
git commit -m "feat(ui): implement task comments and attachments in modal"
```
