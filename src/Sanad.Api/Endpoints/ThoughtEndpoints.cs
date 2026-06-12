using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class ThoughtEndpoints
{
    public static void MapThoughtEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/thoughts", CreateThought);
        app.MapGet("/api/thoughts", GetThoughts);
        app.MapPut("/api/thoughts/{id}", UpdateThought);
        app.MapDelete("/api/thoughts/{id}", DeleteThought);
    }

    public static async Task<IResult> CreateThought(SanadDbContext db, Thought input)
    {
        var thought = new Thought { Content = input.Content };
        db.Thoughts.Add(thought);
        
        var timelineItem = new TimelineItem 
        {
            ItemType = "Thought",
            ReferenceId = thought.Id
        };
        db.TimelineItems.Add(timelineItem);
        
        await db.SaveChangesAsync();
        return Results.Ok(thought);
    }

    public static async Task<IResult> GetThoughts(SanadDbContext db, int? page, int? pageSize, string? search)
    {
        var p = page ?? 1;
        var size = pageSize ?? 20;
        var query = db.Thoughts.AsQueryable();
        
        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowerSearch = search.ToLower();
            query = query.Where(t => t.Content != null && t.Content.ToLower().Contains(lowerSearch));
        }
        
        var thoughts = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((p - 1) * size)
            .Take(size)
            .ToListAsync();
        return Results.Ok(thoughts);
    }

    public static async Task<IResult> UpdateThought(SanadDbContext db, string id, Thought updated)
    {
        var thought = await db.Thoughts.FindAsync(id);
        if (thought == null) return Results.NotFound();
        
        thought.Content = updated.Content;
        await db.SaveChangesAsync();
        return Results.Ok(thought);
    }

    public static async Task<IResult> DeleteThought(SanadDbContext db, string id)
    {
        var thought = await db.Thoughts.FindAsync(id);
        if (thought == null) return Results.NotFound();
        
        var timelineItem = await db.TimelineItems.FirstOrDefaultAsync(t => t.ItemType == "Thought" && t.ReferenceId == id);
        if (timelineItem != null)
        {
            db.TimelineItems.Remove(timelineItem);
        }

        db.Thoughts.Remove(thought);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
