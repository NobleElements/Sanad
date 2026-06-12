using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class FinanceEndpoints
{
    public static void MapFinanceEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/finances/categories", GetCategories);
        app.MapPost("/api/finances/categories", CreateCategory);
        app.MapPut("/api/finances/categories/{id}", UpdateCategory);
        app.MapGet("/api/finances/transactions", GetTransactions);
        app.MapPost("/api/finances/transactions", CreateTransaction);
        app.MapDelete("/api/finances/transactions/{id}", DeleteTransaction);
        app.MapGet("/api/finances/summary", GetSummary);
        app.MapGet("/api/finances/budget", GetMonthlyBudget);
        app.MapPut("/api/finances/budget", SetMonthlyBudget);
    }

    public static async Task<IResult> GetCategories(SanadDbContext db) => 
        Results.Ok(await db.TransactionCategories.ToListAsync());

    public static async Task<IResult> CreateCategory(SanadDbContext db, TransactionCategory category)
    {
        db.TransactionCategories.Add(category);
        await db.SaveChangesAsync();
        return Results.Created($"/api/finances/categories/{category.Id}", category);
    }

    public static async Task<IResult> UpdateCategory(SanadDbContext db, Guid id, TransactionCategory updated)
    {
        var category = await db.TransactionCategories.FindAsync(id);
        if (category is null) return Results.NotFound();

        category.Name = updated.Name;
        category.ColorHex = updated.ColorHex;
        category.MonthlyBudget = updated.MonthlyBudget;

        await db.SaveChangesAsync();
        return Results.Ok(category);
    }

    public static async Task<IResult> GetTransactions(SanadDbContext db, int? month, int? year)
    {
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var targetYear = year ?? DateTime.UtcNow.Year;
        var startDate = new DateTime(targetYear, targetMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1);

        var transactions = await db.Transactions
            .Include(t => t.Category)
            .Where(t => t.Date >= startDate && t.Date < endDate)
            .OrderByDescending(t => t.Date)
            .ToListAsync();
            
        return Results.Ok(transactions);
    }

    public static async Task<IResult> CreateTransaction(SanadDbContext db, Transaction transaction)
    {
        var categoryExists = await db.TransactionCategories.AnyAsync(c => c.Id == transaction.CategoryId);
        if (!categoryExists)
        {
            return Results.BadRequest("Category not found");
        }

        db.Transactions.Add(transaction);
        
        await db.SaveChangesAsync();
        return Results.Created($"/api/finances/transactions/{transaction.Id}", transaction);
    }

    public static async Task<IResult> DeleteTransaction(SanadDbContext db, Guid id)
    {
        var transaction = await db.Transactions.FindAsync(id);
        if (transaction is null) return Results.NotFound();

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public static async Task<IResult> GetSummary(SanadDbContext db, int? month, int? year)
    {
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var targetYear = year ?? DateTime.UtcNow.Year;
        var startDate = new DateTime(targetYear, targetMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1);
        
        var categories = await db.TransactionCategories.ToListAsync();
        var categorySpends = await db.Transactions
            .Where(t => t.Date >= startDate && t.Date < endDate && t.Type == "Expense")
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key, TotalAmount = g.Sum(t => t.Amount) })
            .ToDictionaryAsync(g => g.CategoryId, g => g.TotalAmount);

        var monthlyBudget = await db.MonthlyBudgets
            .FirstOrDefaultAsync(b => b.Year == targetYear && b.Month == targetMonth);

        var categorySummary = categories.Select(c => 
        {
            var spent = categorySpends.GetValueOrDefault(c.Id, 0);
            return new
            {
                Category = c,
                Spent = spent,
                Remaining = c.MonthlyBudget - spent
            };
        });

        return Results.Ok(new
        {
            Categories = categorySummary,
            MonthlyBudget = monthlyBudget?.Amount ?? 0m,
            TotalSpent = categorySpends.Values.Sum()
        });
    }

    public static async Task<IResult> GetMonthlyBudget(SanadDbContext db, int? month, int? year)
    {
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var targetYear = year ?? DateTime.UtcNow.Year;

        var budget = await db.MonthlyBudgets
            .FirstOrDefaultAsync(b => b.Year == targetYear && b.Month == targetMonth);

        return Results.Ok(new { Amount = budget?.Amount ?? 0m, Year = targetYear, Month = targetMonth });
    }

    public static async Task<IResult> SetMonthlyBudget(SanadDbContext db, MonthlyBudgetRequest request)
    {
        var targetMonth = request.Month ?? DateTime.UtcNow.Month;
        var targetYear = request.Year ?? DateTime.UtcNow.Year;

        var budget = await db.MonthlyBudgets
            .FirstOrDefaultAsync(b => b.Year == targetYear && b.Month == targetMonth);

        if (budget is null)
        {
            budget = new MonthlyBudget
            {
                Year = targetYear,
                Month = targetMonth,
                Amount = request.Amount
            };
            db.MonthlyBudgets.Add(budget);
        }
        else
        {
            budget.Amount = request.Amount;
        }

        await db.SaveChangesAsync();
        return Results.Ok(budget);
    }
}

public record MonthlyBudgetRequest(decimal Amount, int? Month, int? Year);
