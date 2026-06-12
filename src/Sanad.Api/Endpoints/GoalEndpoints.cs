using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class GoalEndpoints
{
    public static void MapGoalEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/goals/{dateStr}", GetGoal);
        app.MapPut("/api/goals/{dateStr}", UpdateGoal);
    }

    public static async Task<IResult> GetGoal(SanadDbContext db, string dateStr)
    {
        var goal = await db.DailyGoals.FindAsync(dateStr);
        if (goal == null) return Results.NoContent();
        return Results.Ok(goal);
    }

    public static async Task<IResult> UpdateGoal(SanadDbContext db, string dateStr, DailyGoal input)
    {
        var goal = await db.DailyGoals.FindAsync(dateStr);
        if (goal == null)
        {
            goal = new DailyGoal { DateStr = dateStr, Goal = input.Goal };
            db.DailyGoals.Add(goal);
        }
        else
        {
            goal.Goal = input.Goal;
        }
        await db.SaveChangesAsync();
        return Results.Ok(goal);
    }
}
