using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Xunit;

namespace Sanad.Api.Tests;

public class DebtApiTests
{
    [Fact]
    public async Task CanCreateDebtAndSnapshot()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
        var debt = new Debt { Name = "Car Loan", Type = "Loan", CurrentAmount = 5000 };
        var result = await DebtEndpoints.CreateDebt(context, debt);
        
        Assert.IsType<Created<Debt>>(result);
        Assert.Equal(1, await context.Debts.CountAsync());
        Assert.Equal(1, await context.DebtSnapshots.CountAsync());
        
        var snapshot = await context.DebtSnapshots.FirstAsync();
        Assert.Equal(5000, snapshot.Amount);
        Assert.Equal(debt.Id, snapshot.DebtId);
    }

    [Fact]
    public async Task CanUpdateDebtAndCreatesNewSnapshot()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
        var debt = new Debt { Name = "Credit Card", Type = "Credit Card", CurrentAmount = 1200 };
        await DebtEndpoints.CreateDebt(context, debt);
        
        var updated = new Debt { Name = "Credit Card", Type = "Credit Card", CurrentAmount = 900 };
        var result = await DebtEndpoints.UpdateDebt(context, debt.Id, updated);
        
        Assert.IsType<Ok<Debt>>(result);
        
        var dbDebt = await context.Debts.FirstAsync();
        Assert.Equal(900, dbDebt.CurrentAmount);
        
        Assert.Equal(2, await context.DebtSnapshots.CountAsync());
        var latestSnapshot = await context.DebtSnapshots.OrderByDescending(s => s.RecordedAt).FirstAsync();
        Assert.Equal(900, latestSnapshot.Amount);
    }

    [Fact]
    public async Task CanDeleteDebtAndCleanUpSnapshots()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);
        
        var debt = new Debt { Name = "Personal Loan", Type = "Loan", CurrentAmount = 300 };
        await DebtEndpoints.CreateDebt(context, debt);
        Assert.Equal(1, await context.Debts.CountAsync());
        Assert.Equal(1, await context.DebtSnapshots.CountAsync());

        var result = await DebtEndpoints.DeleteDebt(context, debt.Id);
        Assert.IsType<NoContent>(result);

        Assert.Equal(0, await context.Debts.CountAsync());
        Assert.Equal(0, await context.DebtSnapshots.CountAsync());
    }

    [Fact]
    public async Task CanReorderDebts()
    {
        var options = new DbContextOptionsBuilder<SanadDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new SanadDbContext(options);

        var debt1 = new Debt { Name = "Debt 1", Type = "Loan", CurrentAmount = 100 };
        var debt2 = new Debt { Name = "Debt 2", Type = "Loan", CurrentAmount = 200 };
        await DebtEndpoints.CreateDebt(context, debt1);
        await DebtEndpoints.CreateDebt(context, debt2);

        var reorderList = new List<Guid> { debt2.Id, debt1.Id };
        var result = await DebtEndpoints.ReorderDebts(context, reorderList);
        Assert.IsType<Ok>(result);

        var debts = await context.Debts.OrderBy(d => d.Order).ToListAsync();
        Assert.Equal(debt2.Id, debts[0].Id);
        Assert.Equal(debt1.Id, debts[1].Id);
    }
}
