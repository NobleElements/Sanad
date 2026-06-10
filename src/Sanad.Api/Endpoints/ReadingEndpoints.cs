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
    }

    public record StartPeriodDto(int BookId, List<PlanDto> Plans);
    public record PlanDto(string Title, int StartPage, int EndPage);
    public record LogDto(int ReadingPeriodId, int StartPage, int EndPage);
}
