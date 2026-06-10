using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class TimelineEndpoints
{
    public static void MapTimelineEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/timeline", GetTimeline);
    }

    public static async Task<IResult> GetTimeline(SanadDbContext db)
    {
        var items = await db.TimelineItems
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .ToListAsync();
            
        // For thoughts and tasks, we also want the content/title
        var timelineWithContent = new List<object>();
        foreach (var item in items)
        {
            if (item.ItemType == "Thought")
            {
                var thought = await db.Thoughts.FindAsync(item.ReferenceId);
                timelineWithContent.Add(new { item.Id, item.ItemType, item.CreatedAt, Content = thought?.Content });
            }
            else if (item.ItemType == "Task")
            {
                if (Guid.TryParse(item.ReferenceId, out var taskId))
                {
                    var task = await db.TaskItems.FindAsync(taskId);
                    timelineWithContent.Add(new { item.Id, item.ItemType, item.CreatedAt, Title = task?.Title, Content = task?.Content });
                }
            }
        }
        
        return Results.Ok(timelineWithContent);
    }
}
