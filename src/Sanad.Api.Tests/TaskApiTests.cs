using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class TaskApiTests
{
    // Real, lightweight stand-ins for the dependencies these tests don't exercise, so a code path that
    // starts using them fails on a real object rather than a null.
    private static DiskQuotaService Quota() => new NoOpDiskQuotaService(TestDbContextFactory.CreateInMemoryAdminDbContext());

    private static McpEndpoints CreateMcp(SanadDbContext context, ITenantProvider tenant)
    {
        var adminDb = TestDbContextFactory.CreateInMemoryAdminDbContext();
        var quota = new NoOpDiskQuotaService(adminDb);
        var fileManager = new FileManagerService(context, new NoOpFileStorageService(), quota, tenant);
        var bookSearch = new BookSearchService(new HttpClient(new MockHttpMessageHandler()));
        return new McpEndpoints(context, bookSearch, fileManager, tenant, quota, adminDb);
    }

    [Fact]
    public async Task CanDeleteTaskComment()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var task = new TaskItem { Title = "Test Task" };
            context.TaskItems.Add(task);
            await context.SaveChangesAsync();

            var comment = new TaskComment { TaskItemId = task.Id, Text = "Hello" };
            context.TaskComments.Add(comment);
            await context.SaveChangesAsync();

            var svc = new TaskService(context, new TestTenantProvider(), Quota());
            var result = await TaskEndpoints.DeleteTaskComment(svc, task.Id, comment.Id);
            Assert.IsType<NoContent>(result);

            context.ChangeTracker.Clear();
            Assert.Equal(0, await context.TaskComments.CountAsync());
        }
    }

    [Fact]
    public async Task CanDeleteTaskAttachment()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var task = new TaskItem { Title = "Test Task" };
            context.TaskItems.Add(task);
            await context.SaveChangesAsync();

            var uniqueFileName = $"{Guid.NewGuid()}.txt";
            var attachment = new TaskAttachment 
            { 
                TaskItemId = task.Id, 
                FileName = "test.txt",
                FilePath = $"/attachments/{uniqueFileName}"
            };
            context.TaskAttachments.Add(attachment);
            await context.SaveChangesAsync();

            using var tempDir = new DisposableTempDirectory();
            var uploadsDir = Path.Combine(tempDir.Path, "attachments");
            Directory.CreateDirectory(uploadsDir);
            var filePath = Path.Combine(uploadsDir, uniqueFileName);
            await File.WriteAllTextAsync(filePath, "dummy content");

            Assert.True(File.Exists(filePath));

            var tenant = new TestTenantProvider("testuser", tenantBasePath: tempDir.Path);
            var svc = new TaskService(context, tenant, Quota());
            var result = await TaskEndpoints.DeleteTaskAttachment(svc, task.Id, attachment.Id);
            
            Assert.IsType<NoContent>(result);

            context.ChangeTracker.Clear();
            Assert.Equal(0, await context.TaskAttachments.CountAsync());
            Assert.False(File.Exists(filePath));
        }
    }

    [Fact]
    public async Task CanDeleteTaskWithAttachments()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var task = new TaskItem { Title = "Test Task to Delete" };
            context.TaskItems.Add(task);
            await context.SaveChangesAsync();

            var uniqueFileName = $"{Guid.NewGuid()}.txt";
            var attachment = new TaskAttachment 
            { 
                TaskItemId = task.Id, 
                FileName = "test.txt",
                FilePath = $"/attachments/{uniqueFileName}"
            };
            context.TaskAttachments.Add(attachment);
            await context.SaveChangesAsync();

            using var tempDir = new DisposableTempDirectory();
            var uploadsDir = Path.Combine(tempDir.Path, "attachments");
            Directory.CreateDirectory(uploadsDir);
            var filePath = Path.Combine(uploadsDir, uniqueFileName);
            await File.WriteAllTextAsync(filePath, "dummy content");

            Assert.True(File.Exists(filePath));

            var tenant = new TestTenantProvider("testuser", tenantBasePath: tempDir.Path);
            var svc = new TaskService(context, tenant, Quota());
            var result = await TaskEndpoints.DeleteTask(svc, task.Id);
            
            Assert.IsType<NoContent>(result);

            context.ChangeTracker.Clear();
            Assert.Equal(0, await context.TaskItems.CountAsync());
            Assert.Equal(0, await context.TaskAttachments.CountAsync());
            Assert.False(File.Exists(filePath));
        }
    }

    [Fact]
    public async Task McpCreateTask_WithProject_SetsProjectProperty()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var mcpEndpoints = CreateMcp(context, new TestTenantProvider());

            var createdTask = await mcpEndpoints.CreateTask("New Task", "Task details", "My Project");

            Assert.NotNull(createdTask);
            Assert.Equal("New Task", createdTask.Title);
            Assert.Equal("Task details", createdTask.Content);
            Assert.Equal("My Project", createdTask.Project);

            context.ChangeTracker.Clear();
            var dbTask = await context.TaskItems.FirstOrDefaultAsync(t => t.Id == createdTask.Id);
            Assert.NotNull(dbTask);
            Assert.Equal("My Project", dbTask.Project);
        }
    }

    [Fact]
    public async Task GetTasks_WithNoProjectFilter_ReturnsOnlyUnassociatedTasks()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            context.TaskItems.AddRange(
                new TaskItem { Title = "Task 1", Project = "Project Alpha" },
                new TaskItem { Title = "Task 2", Project = null },
                new TaskItem { Title = "Task 3", Project = "" }
            );
            await context.SaveChangesAsync();

            var svc = new TaskService(context, new TestTenantProvider(), Quota());
            var result = await TaskEndpoints.GetTasks(svc, "__NONE__", null, null);
            var okResult = Assert.IsType<Microsoft.AspNetCore.Http.HttpResults.Ok<List<TaskItem>>>(result);
            Assert.NotNull(okResult.Value);
            Assert.Equal(2, okResult.Value.Count);
            Assert.All(okResult.Value, t => Assert.True(string.IsNullOrEmpty(t.Project)));
        }
    }

    [Fact]
    public async Task McpGetTasks_WithNoProjectFilter_ReturnsOnlyUnassociatedTasks()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            context.TaskItems.AddRange(
                new TaskItem { Title = "Task A", Project = "Project Beta" },
                new TaskItem { Title = "Task B", Project = null },
                new TaskItem { Title = "Task C", Project = "" }
            );
            await context.SaveChangesAsync();

            var mcpEndpoints = CreateMcp(context, new TestTenantProvider());
            var result = await mcpEndpoints.GetTasks("NONE", null, null);
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.All(result, t => Assert.True(string.IsNullOrEmpty(t.Project)));
        }
    }
}
