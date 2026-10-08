using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Xunit;

namespace Sanad.Api.Tests;

public class FinanceApiTests
{
    [Fact]
    public async Task CanAddCategoryAndTransaction()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var category = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
            context.TransactionCategories.Add(category);
            await context.SaveChangesAsync();

            var transaction = new Transaction { Amount = 20, CategoryId = category.Id, Description = "Lunch" };
            var result = await FinanceEndpoints.CreateTransaction(context, transaction);
            Assert.IsType<Created<Transaction>>(result);

            // Clear tracker to verify actual database state rather than cached identity map
            context.ChangeTracker.Clear();

            Assert.Equal(1, await context.TransactionCategories.CountAsync());
            Assert.Equal(1, await context.Transactions.CountAsync());
            var persisted = await context.Transactions.Include(t => t.Category).FirstAsync();
            Assert.Equal("Food", persisted.Category!.Name);
        }
    }

    [Fact]
    public async Task CannotAddTransactionWithInvalidCategory()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var transaction = new Transaction { Amount = 20, CategoryId = Guid.NewGuid(), Description = "Lunch" };
            var result = await FinanceEndpoints.CreateTransaction(context, transaction);

            Assert.IsType<BadRequest<string>>(result);

            context.ChangeTracker.Clear();
            Assert.Equal(0, await context.Transactions.CountAsync());
        }
    }

    [Fact]
    public async Task CanCalculateSummary()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var category1 = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
            var category2 = new TransactionCategory { Name = "Rent", MonthlyBudget = 1000 };
            context.TransactionCategories.AddRange(category1, category2);
            await context.SaveChangesAsync();

            // Explicit dates and month so the test doesn't depend on (or break at) the current month
            var march = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc);
            var transaction1 = new Transaction { Amount = 50, CategoryId = category1.Id, Type = "Expense", Date = march.AddDays(4) };
            var transaction2 = new Transaction { Amount = 150, CategoryId = category1.Id, Type = "Expense", Date = march.AddDays(30).AddHours(23) };
            var transaction3 = new Transaction { Amount = 800, CategoryId = category2.Id, Type = "Expense", Date = march };

            // This won't be included as it's not an Expense
            var transaction4 = new Transaction { Amount = 1000, CategoryId = category1.Id, Type = "Income", Date = march.AddDays(9) };

            // These won't be included as they fall outside March
            var transaction5 = new Transaction { Amount = 70, CategoryId = category1.Id, Type = "Expense", Date = march.AddMonths(1) };
            var transaction6 = new Transaction { Amount = 90, CategoryId = category2.Id, Type = "Expense", Date = march.AddTicks(-1) };

            context.Transactions.AddRange(transaction1, transaction2, transaction3, transaction4, transaction5, transaction6);
            await context.SaveChangesAsync();

            context.ChangeTracker.Clear();

            // Act
            var result = await FinanceEndpoints.GetSummary(context, 3, 2026);

            // Assert
            var statusCodeResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
            Assert.Equal(200, statusCodeResult.StatusCode);

            var valueResult = Assert.IsAssignableFrom<IValueHttpResult>(result);
            // Serialized the way the HTTP response is (camelCase)
            var summary = System.Text.Json.JsonSerializer.SerializeToElement(valueResult.Value, WireJson.Http);

            Assert.Equal(1000m, summary.GetProperty("totalSpent").GetDecimal()); // 50 + 150 + 800

            var categories = summary.GetProperty("categories");
            Assert.Equal(2, categories.GetArrayLength());

            var foodSummary = categories.EnumerateArray().First(s => s.GetProperty("category").GetProperty("name").GetString() == "Food");
            Assert.Equal(200m, foodSummary.GetProperty("spent").GetDecimal());
            Assert.Equal(300m, foodSummary.GetProperty("remaining").GetDecimal()); // 500 - 200

            var rentSummary = categories.EnumerateArray().First(s => s.GetProperty("category").GetProperty("name").GetString() == "Rent");
            Assert.Equal(800m, rentSummary.GetProperty("spent").GetDecimal());
            Assert.Equal(200m, rentSummary.GetProperty("remaining").GetDecimal()); // 1000 - 800
        }
    }
}
