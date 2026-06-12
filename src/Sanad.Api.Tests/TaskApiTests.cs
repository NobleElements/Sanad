using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;
using System.IO;

namespace Sanad.Api.Tests;

public class TaskApiTests
{
    private class DummyTenantProvider : ITenantProvider
    {
        public string GetUsername() => "testuser";
        public Guid GetTenantId() => Guid.Empty;
        public string GetConnectionString() => "";
    }
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

    [Fact]
    public async Task CanDeleteTaskAttachment()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
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

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", "testuser", "attachments");
        Directory.CreateDirectory(uploadsDir);
        var filePath = Path.Combine(uploadsDir, uniqueFileName);
        await File.WriteAllTextAsync(filePath, "dummy content");

        try
        {
            Assert.True(File.Exists(filePath));

            var result = await TaskEndpoints.DeleteTaskAttachment(context, task.Id, attachment.Id, new DummyTenantProvider());
            
            Assert.IsType<NoContent>(result);
            Assert.Equal(0, context.TaskAttachments.Count());
            Assert.False(File.Exists(filePath));
        }
        finally
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
    }

    [Fact]
    public async Task CanDeleteTaskWithAttachments()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
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

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "Data", "testuser", "attachments");
        Directory.CreateDirectory(uploadsDir);
        var filePath = Path.Combine(uploadsDir, uniqueFileName);
        await File.WriteAllTextAsync(filePath, "dummy content");

        try
        {
            Assert.True(File.Exists(filePath));

            var result = await TaskEndpoints.DeleteTask(context, task.Id, new DummyTenantProvider());
            
            Assert.IsType<NoContent>(result);
            Assert.Equal(0, context.TaskItems.Count());
            Assert.Equal(0, context.TaskAttachments.Count());
            Assert.False(File.Exists(filePath));
        }
        finally
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
    }
}
