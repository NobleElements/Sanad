using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class CalendarEndpoints
{
    public static void MapCalendarEndpoints(this RouteGroupBuilder group)
    {
        var calendar = group.MapGroup("/api/calendar");

        // --- Categories ---

        calendar.MapGet("/categories", async (SanadDbContext db) =>
        {
            var categories = await db.EventCategories
                .OrderBy(c => c.Name)
                .ToListAsync();
            return Results.Ok(categories);
        });

        calendar.MapPost("/categories", async (EventCategory category, SanadDbContext db) =>
        {
            category.Id = Guid.NewGuid();
            category.CreatedAt = DateTime.UtcNow;
            
            db.EventCategories.Add(category);
            await db.SaveChangesAsync();
            
            return Results.Created($"/api/calendar/categories/{category.Id}", category);
        });

        calendar.MapPut("/categories/{id:guid}", async (Guid id, EventCategory updated, SanadDbContext db) =>
        {
            var category = await db.EventCategories.FindAsync(id);
            if (category == null) return Results.NotFound();

            category.Name = updated.Name;
            category.ColorCode = updated.ColorCode;

            await db.SaveChangesAsync();
            return Results.Ok(category);
        });

        calendar.MapDelete("/categories/{id:guid}", async (Guid id, SanadDbContext db) =>
        {
            var category = await db.EventCategories.FindAsync(id);
            if (category == null) return Results.NotFound();

            // Optional: Set CategoryId to null for events using this category
            var events = await db.CalendarEvents.Where(e => e.CategoryId == id).ToListAsync();
            foreach (var evt in events)
            {
                evt.CategoryId = null;
            }

            db.EventCategories.Remove(category);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // --- Events ---

        calendar.MapGet("/events", async (DateTime? start, DateTime? end, SanadDbContext db) =>
        {
            var query = db.CalendarEvents
                .Include(e => e.Category)
                .Include(e => e.TaskItem)
                .AsQueryable();

            if (start.HasValue)
            {
                // We also include recurring events that might not fit this exact start/end
                // but for now we fetch events that overlap or have RecurrenceRule
                query = query.Where(e => (e.EndDate >= start.Value) || e.RecurrenceRule != null);
            }
            if (end.HasValue)
            {
                query = query.Where(e => (e.StartDate <= end.Value) || e.RecurrenceRule != null);
            }

            var events = await query.ToListAsync();
            return Results.Ok(events);
        });

        calendar.MapPost("/events", async (CalendarEvent evt, SanadDbContext db) =>
        {
            evt.Id = Guid.NewGuid();
            evt.CreatedAt = DateTime.UtcNow;
            evt.UpdatedAt = DateTime.UtcNow;

            db.CalendarEvents.Add(evt);
            
            if (evt.TaskItemId.HasValue)
            {
                var task = await db.TaskItems.FindAsync(evt.TaskItemId.Value);
                if (task != null)
                {
                    task.StartDate = evt.StartDate;
                    task.EndDate = evt.EndDate;
                    task.UpdatedAt = DateTime.UtcNow;
                }
            }

            await db.SaveChangesAsync();
            
            var created = await db.CalendarEvents
                .Include(e => e.Category)
                .Include(e => e.TaskItem)
                .FirstOrDefaultAsync(e => e.Id == evt.Id);
                
            return Results.Created($"/api/calendar/events/{evt.Id}", created);
        });

        calendar.MapPut("/events/{id:guid}", async (Guid id, CalendarEvent updated, SanadDbContext db) =>
        {
            var evt = await db.CalendarEvents.FindAsync(id);
            if (evt == null) return Results.NotFound();

            evt.Title = updated.Title;
            evt.Description = updated.Description;
            evt.StartDate = updated.StartDate;
            evt.EndDate = updated.EndDate;
            evt.IsAllDay = updated.IsAllDay;
            evt.RecurrenceRule = updated.RecurrenceRule;
            evt.CategoryId = updated.CategoryId;
            evt.TaskItemId = updated.TaskItemId;
            evt.NotificationPreference = updated.NotificationPreference;
            evt.UpdatedAt = DateTime.UtcNow;

            if (evt.TaskItemId.HasValue)
            {
                var task = await db.TaskItems.FindAsync(evt.TaskItemId.Value);
                if (task != null)
                {
                    task.StartDate = evt.StartDate;
                    task.EndDate = evt.EndDate;
                    task.UpdatedAt = DateTime.UtcNow;
                }
            }

            await db.SaveChangesAsync();
            
            var saved = await db.CalendarEvents
                .Include(e => e.Category)
                .Include(e => e.TaskItem)
                .FirstOrDefaultAsync(e => e.Id == evt.Id);
                
            return Results.Ok(saved);
        });

        calendar.MapDelete("/events/{id:guid}", async (Guid id, SanadDbContext db) =>
        {
            var evt = await db.CalendarEvents.FindAsync(id);
            if (evt == null) return Results.NotFound();
            
            if (evt.TaskItemId.HasValue)
            {
                var task = await db.TaskItems.FindAsync(evt.TaskItemId.Value);
                if (task != null)
                {
                    task.StartDate = null;
                    task.EndDate = null;
                    task.UpdatedAt = DateTime.UtcNow;
                }
            }

            db.CalendarEvents.Remove(evt);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
