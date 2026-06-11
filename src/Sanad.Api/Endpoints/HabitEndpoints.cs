using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class HabitEndpoints
{
    public static void MapHabitEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/habits");

        group.MapGet("/", async (SanadDbContext db) =>
        {
            return await db.Habits
                .Include(h => h.Logs)
                .Where(h => !h.IsDeleted)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();
        });

        group.MapPost("/", async (SanadDbContext db, Habit habit) =>
        {
            habit.Id = Guid.NewGuid().ToString();
            habit.CreatedAt = DateTime.UtcNow;
            db.Habits.Add(habit);
            await db.SaveChangesAsync();
            return Results.Created($"/api/habits/{habit.Id}", habit);
        });

        group.MapPut("/{id}", async (SanadDbContext db, string id, Habit inputHabit) =>
        {
            var habit = await db.Habits.FindAsync(id);
            if (habit is null || habit.IsDeleted) return Results.NotFound();

            habit.Name = inputHabit.Name;
            habit.Icon = inputHabit.Icon;
            habit.Frequency = inputHabit.Frequency;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/{id}", async (SanadDbContext db, string id) =>
        {
            var habit = await db.Habits.FindAsync(id);
            if (habit is null || habit.IsDeleted) return Results.NotFound();

            habit.IsDeleted = true;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapPost("/{id}/toggle", async (SanadDbContext db, string id, ToggleHabitLogRequest req) =>
        {
            var habit = await db.Habits.FindAsync(id);
            if (habit is null || habit.IsDeleted) return Results.NotFound();

            var targetDate = req.Date.Date;

            var log = await db.HabitLogs.FirstOrDefaultAsync(l => l.HabitId == id && l.Date.Date == targetDate);
            if (log != null)
            {
                log.Completed = !log.Completed;
            }
            else
            {
                log = new HabitLog
                {
                    Id = Guid.NewGuid().ToString(),
                    HabitId = id,
                    Date = targetDate,
                    Completed = true
                };
                db.HabitLogs.Add(log);
            }

            await db.SaveChangesAsync();
            return Results.Ok(log);
        });
    }
}

public class ToggleHabitLogRequest
{
    public DateTime Date { get; set; }
}
