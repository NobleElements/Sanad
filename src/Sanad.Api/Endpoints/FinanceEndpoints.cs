using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class FinanceEndpoints
{
    public static void MapFinanceEndpoints(this WebApplication app)
    {
        app.MapGet("/api/finances/categories", GetCategories);
        app.MapPost("/api/finances/categories", CreateCategory);
        app.MapGet("/api/finances/transactions", GetTransactions);
        app.MapPost("/api/finances/transactions", CreateTransaction);
        app.MapGet("/api/finances/summary", GetSummary);
    }

    public static async Task<IResult> GetCategories(SanadDbContext db) => 
        Results.Ok(await db.TransactionCategories.ToListAsync());

    public static async Task<IResult> CreateCategory(SanadDbContext db, TransactionCategory category)
    {
        db.TransactionCategories.Add(category);
        await db.SaveChangesAsync();
        return Results.Created($"/api/finances/categories/{category.Id}", category);
    }

    public static async Task<IResult> GetTransactions(SanadDbContext db) =>
        Results.Ok(await db.Transactions.Include(t => t.Category).OrderByDescending(t => t.Date).ToListAsync());

    public static async Task<IResult> CreateTransaction(SanadDbContext db, Transaction transaction)
    {
        var categoryExists = await db.TransactionCategories.AnyAsync(c => c.Id == transaction.CategoryId);
        if (!categoryExists)
        {
            return Results.BadRequest("Category not found");
        }

        db.Transactions.Add(transaction);
        
        var timelineItem = new TimelineItem 
        {
            ItemType = "Transaction",
            ReferenceId = transaction.Id.ToString()
        };
        db.TimelineItems.Add(timelineItem);
        
        await db.SaveChangesAsync();
        return Results.Created($"/api/finances/transactions/{transaction.Id}", transaction);
    }

    public static async Task<IResult> GetSummary(SanadDbContext db)
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        
        var categories = await db.TransactionCategories.ToListAsync();
        var transactions = await db.Transactions
            .Where(t => t.Date >= startOfMonth && t.Type == "Expense")
            .ToListAsync();

        var categorySpends = transactions
            .GroupBy(t => t.CategoryId)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount));

        var summary = categories.Select(c => 
        {
            var spent = categorySpends.GetValueOrDefault(c.Id, 0);
            return new
            {
                Category = c,
                Spent = spent,
                Remaining = c.MonthlyBudget - spent
            };
        });

        return Results.Ok(summary);
    }
}
