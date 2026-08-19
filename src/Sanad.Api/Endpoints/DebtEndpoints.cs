using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class DebtEndpoints
{
    public static void MapDebtEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/finances/debts", GetDebts);
        app.MapPost("/api/finances/debts", CreateDebt);
        app.MapPut("/api/finances/debts/{id}", UpdateDebt);
        app.MapDelete("/api/finances/debts/{id}", DeleteDebt);
        app.MapPut("/api/finances/debts/reorder", ReorderDebts);
        app.MapGet("/api/finances/debts/history", GetDebtsHistory);
    }

    public static async Task<IResult> GetDebts(SanadDbContext db) => 
        Results.Ok(await db.Debts.Include(d => d.Currency).OrderBy(d => d.Order).ThenByDescending(d => d.CreatedAt).ToListAsync());

    public static async Task<IResult> CreateDebt(SanadDbContext db, Debt debt)
    {
        debt.Id = Guid.NewGuid();
        debt.CreatedAt = DateTime.UtcNow;
        debt.UpdatedAt = DateTime.UtcNow;
        debt.Order = (await db.Debts.MaxAsync(d => (int?)d.Order) ?? 0) + 1;
        
        db.Debts.Add(debt);
        
        var snapshot = new DebtSnapshot
        {
            DebtId = debt.Id,
            Amount = debt.CurrentAmount,
            RecordedAt = DateTime.UtcNow
        };
        db.DebtSnapshots.Add(snapshot);
        
        await db.SaveChangesAsync();
        return Results.Created($"/api/finances/debts/{debt.Id}", debt);
    }

    public static async Task<IResult> UpdateDebt(SanadDbContext db, Guid id, Debt updated)
    {
        var debt = await db.Debts.FindAsync(id);
        if (debt is null) return Results.NotFound();

        debt.Name = updated.Name;
        debt.Type = updated.Type;
        debt.CurrencyId = updated.CurrencyId;
        debt.Icon = updated.Icon;
        
        if (debt.CurrentAmount != updated.CurrentAmount)
        {
            debt.CurrentAmount = updated.CurrentAmount;
            
            var snapshot = new DebtSnapshot
            {
                DebtId = debt.Id,
                Amount = debt.CurrentAmount,
                RecordedAt = DateTime.UtcNow
            };
            db.DebtSnapshots.Add(snapshot);
        }

        debt.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(debt);
    }

    public static async Task<IResult> DeleteDebt(SanadDbContext db, Guid id)
    {
        var debt = await db.Debts.FindAsync(id);
        if (debt is null) return Results.NotFound();

        var snapshots = await db.DebtSnapshots.Where(s => s.DebtId == id).ToListAsync();
        db.DebtSnapshots.RemoveRange(snapshots);

        db.Debts.Remove(debt);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public static async Task<IResult> ReorderDebts(SanadDbContext db, List<Guid> orderedIds)
    {
        var debts = await db.Debts.Where(d => orderedIds.Contains(d.Id)).ToListAsync();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var debt = debts.FirstOrDefault(d => d.Id == orderedIds[i]);
            if (debt != null)
            {
                debt.Order = i;
            }
        }
        await db.SaveChangesAsync();
        return Results.Ok();
    }

    public static async Task<IResult> GetDebtsHistory(SanadDbContext db)
    {
        var snapshots = await db.DebtSnapshots
            .Include(s => s.Debt)
                .ThenInclude(d => d!.Currency)
            .OrderBy(s => s.RecordedAt)
            .ToListAsync();
            
        return Results.Ok(snapshots.Select(s => new {
            s.Id,
            s.DebtId,
            DebtName = s.Debt?.Name,
            DebtType = s.Debt?.Type,
            s.Amount,
            ExchangeRateToDefault = s.Debt?.Currency?.ExchangeRateToDefault ?? 1m,
            s.RecordedAt
        }));
    }
}
