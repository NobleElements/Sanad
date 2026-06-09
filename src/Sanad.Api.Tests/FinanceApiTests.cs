using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
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
        context.Transactions.Add(transaction);
        await context.SaveChangesAsync();

        Assert.Equal(1, context.TransactionCategories.Count());
        Assert.Equal(1, context.Transactions.Count());
        Assert.Equal("Food", context.Transactions.Include(t => t.Category).First().Category!.Name);
    }
}
