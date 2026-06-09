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
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: "FinanceTest")
            .Options;

        using var context = new SanadDbContext(options);
        
        var category = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
        context.TransactionCategories.Add(category);
        await context.SaveChangesAsync();

        var transaction = new Transaction { Amount = 20, CategoryId = category.Id, Description = "Lunch" };
        var result = await FinanceEndpoints.CreateTransaction(context, transaction);
        Assert.IsType<Created<Transaction>>(result);

        Assert.Equal(1, context.TransactionCategories.Count());
        Assert.Equal(1, context.Transactions.Count());
        Assert.Equal("Food", context.Transactions.Include(t => t.Category).First().Category!.Name);
    }

    [Fact]
    public async Task CannotAddTransactionWithInvalidCategory()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);

        var transaction = new Transaction { Amount = 20, CategoryId = Guid.NewGuid(), Description = "Lunch" };
        var result = await FinanceEndpoints.CreateTransaction(context, transaction);
        
        Assert.IsType<BadRequest<string>>(result);
        Assert.Equal(0, context.Transactions.Count());
    }

    [Fact]
    public async Task CanCalculateSummary()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
        var category1 = new TransactionCategory { Name = "Food", MonthlyBudget = 500 };
        var category2 = new TransactionCategory { Name = "Rent", MonthlyBudget = 1000 };
        context.TransactionCategories.AddRange(category1, category2);
        await context.SaveChangesAsync();

        var transaction1 = new Transaction { Amount = 50, CategoryId = category1.Id, Type = "Expense" };
        var transaction2 = new Transaction { Amount = 150, CategoryId = category1.Id, Type = "Expense" };
        var transaction3 = new Transaction { Amount = 800, CategoryId = category2.Id, Type = "Expense" };
        
        // This won't be included as it's not an Expense
        var transaction4 = new Transaction { Amount = 1000, CategoryId = category1.Id, Type = "Income" };
        
        context.Transactions.AddRange(transaction1, transaction2, transaction3, transaction4);
        await context.SaveChangesAsync();
        // Act
        var result = await FinanceEndpoints.GetSummary(context, null, null);

        // Assert
        var statusCodeResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(200, statusCodeResult.StatusCode);

        var valueResult = Assert.IsAssignableFrom<IValueHttpResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(valueResult.Value);
        var summary = System.Text.Json.JsonDocument.Parse(json).RootElement;

        var categories = summary.GetProperty("Categories");
        Assert.Equal(2, categories.GetArrayLength());

        var foodSummary = categories.EnumerateArray().First(s => s.GetProperty("Category").GetProperty("Name").GetString() == "Food");
        Assert.Equal(200m, foodSummary.GetProperty("Spent").GetDecimal());
        Assert.Equal(300m, foodSummary.GetProperty("Remaining").GetDecimal()); // 500 - 200

        var rentSummary = categories.EnumerateArray().First(s => s.GetProperty("Category").GetProperty("Name").GetString() == "Rent");
        Assert.Equal(800m, rentSummary.GetProperty("Spent").GetDecimal());
        Assert.Equal(200m, rentSummary.GetProperty("Remaining").GetDecimal()); // 1000 - 800
    }
}
