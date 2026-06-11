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
