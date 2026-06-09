using System;
using System.Linq;
using System.Threading.Tasks;
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
}
