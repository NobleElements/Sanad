using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class ReadingEndpoints
{
    public static void MapReadingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/reading");

        group.MapGet("/periods", async (SanadDbContext db) =>
        {
            var periods = await db.ReadingPeriods
                .Include(p => p.Book)
                .OrderByDescending(p => p.StartDate)
                .ToListAsync();
            return Results.Ok(periods);
        });

        group.MapPost("/periods", async (SanadDbContext db, StartPeriodDto dto) =>
        {
            var period = new ReadingPeriod
            {
                BookId = dto.BookId,
                Status = "Reading",
                StartDate = DateTime.UtcNow,
                Plans = dto.Plans.Select((p, i) => new ReadingPlan
                {
                    Title = p.Title,
                    StartPage = p.StartPage,
                    EndPage = p.EndPage,
                    OrderIndex = i
                }).ToList()
            };
            db.ReadingPeriods.Add(period);
            await db.SaveChangesAsync();
            return Results.Created($"/api/reading/periods/{period.Id}", period);
        });

        group.MapPost("/logs", async (SanadDbContext db, LogDto dto) =>
        {
            var period = await db.ReadingPeriods
                .Include(p => p.Book)
                .FirstOrDefaultAsync(p => p.Id == dto.ReadingPeriodId);
                
            if (period == null) return Results.NotFound();

            var log = new ReadingLog
            {
                ReadingPeriodId = dto.ReadingPeriodId,
                Date = DateTime.UtcNow,
                StartPage = dto.StartPage,
                EndPage = dto.EndPage
            };
            db.ReadingLogs.Add(log);

            if (dto.EndPage >= period.Book.TotalPages)
            {
                period.Status = "Completed";
                period.EndDate = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();
            return Results.Ok(log);
        });

        group.MapPut("/periods/{id}/plans", async (int id, SanadDbContext db, List<PlanDto> plans) =>
        {
            var period = await db.ReadingPeriods.Include(p => p.Plans).FirstOrDefaultAsync(p => p.Id == id);
            if (period == null) return Results.NotFound();

            db.ReadingPlans.RemoveRange(period.Plans);
            period.Plans = plans.Select((p, i) => new ReadingPlan
            {
                Title = p.Title,
                StartPage = p.StartPage,
                EndPage = p.EndPage,
                OrderIndex = i
            }).ToList();

            await db.SaveChangesAsync();
            return Results.Ok(period.Plans);
        });

        group.MapPut("/periods/{id}/status", async (int id, SanadDbContext db, StatusDto dto) =>
        {
            var period = await db.ReadingPeriods.FindAsync(id);
            if (period == null) return Results.NotFound();

            if (dto.Status == "Reading")
            {
                var otherActive = await db.ReadingPeriods.Where(p => p.Status == "Reading" && p.Id != id).ToListAsync();
                foreach (var other in otherActive)
                {
                    other.Status = "Paused";
                }
            }

            period.Status = dto.Status;
            await db.SaveChangesAsync();
            return Results.Ok(period);
        });

        group.MapGet("/current", async (SanadDbContext db) =>
        {
            var current = await db.ReadingPeriods
                .Include(p => p.Book)
                .Include(p => p.Plans)
                .Include(p => p.Logs)
                .Where(p => p.Status == "Reading")
                .OrderByDescending(p => p.StartDate)
                .FirstOrDefaultAsync();

            if (current == null) return Results.NotFound();

            var highestPage = current.Logs.Any() ? current.Logs.Max(l => l.EndPage) : 0;
            var currentPlan = current.Plans.OrderBy(p => p.OrderIndex)
                .FirstOrDefault(p => highestPage >= p.StartPage && highestPage < p.EndPage) 
                ?? current.Plans.OrderBy(p => p.OrderIndex).FirstOrDefault(p => highestPage < p.StartPage)
                ?? current.Plans.LastOrDefault();

            return Results.Ok(new 
            {
                Period = current,
                CurrentPage = highestPage,
                CurrentChapter = currentPlan?.Title,
                PagesLeftInChapter = currentPlan != null ? (currentPlan.EndPage - highestPage) : 0
            });
        });

        group.MapDelete("/periods/{id}", async (int id, SanadDbContext db) =>
        {
            var period = await db.ReadingPeriods.FindAsync(id);
            if (period == null) return Results.NotFound();

            db.ReadingPeriods.Remove(period);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    public record StartPeriodDto(int BookId, List<PlanDto> Plans);
    public record PlanDto(string Title, int StartPage, int EndPage);
    public record LogDto(int ReadingPeriodId, int StartPage, int EndPage);
    public record StatusDto(string Status);
}
