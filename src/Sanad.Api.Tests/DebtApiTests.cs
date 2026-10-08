using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class DebtApiTests
{
    [Fact]
    public async Task CanCreateDebtAndSnapshot()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var svc = new DebtService(context);
            var debt = new Debt { Name = "Car Loan", Type = "Loan", CurrentAmount = 5000 };
            var result = await DebtEndpoints.CreateDebt(svc, debt);

            Assert.IsType<Created<Debt>>(result);

            context.ChangeTracker.Clear();

            Assert.Equal(1, await context.Debts.CountAsync());
            Assert.Equal(1, await context.DebtSnapshots.CountAsync());

            var snapshot = await context.DebtSnapshots.FirstAsync();
            Assert.Equal(5000, snapshot.Amount);
            Assert.Equal(debt.Id, snapshot.DebtId);
        }
    }

    [Fact]
    public async Task CanUpdateDebtAndCreatesNewSnapshot()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var svc = new DebtService(context);
            var debt = new Debt { Name = "Credit Card", Type = "Credit Card", CurrentAmount = 1200 };
            await DebtEndpoints.CreateDebt(svc, debt);

            var updated = new Debt { Name = "Credit Card", Type = "Credit Card", CurrentAmount = 900 };
            var result = await DebtEndpoints.UpdateDebt(svc, debt.Id, updated);

            Assert.IsType<Ok<Debt>>(result);

            context.ChangeTracker.Clear();

            var dbDebt = await context.Debts.FirstAsync();
            Assert.Equal(900, dbDebt.CurrentAmount);

            Assert.Equal(2, await context.DebtSnapshots.CountAsync());
            // Snapshots created in the same tick tie on RecordedAt, so compare the set of amounts instead of picking a "latest"
            var amounts = (await context.DebtSnapshots.Select(s => s.Amount).ToListAsync()).OrderBy(a => a);
            Assert.Equal(new[] { 900m, 1200m }, amounts);
        }
    }

    [Fact]
    public async Task CanDeleteDebtAndCleanUpSnapshots()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var svc = new DebtService(context);
            var debt = new Debt { Name = "Personal Loan", Type = "Loan", CurrentAmount = 300 };
            await DebtEndpoints.CreateDebt(svc, debt);
            Assert.Equal(1, await context.Debts.CountAsync());
            Assert.Equal(1, await context.DebtSnapshots.CountAsync());

            var result = await DebtEndpoints.DeleteDebt(svc, debt.Id);
            Assert.IsType<NoContent>(result);

            context.ChangeTracker.Clear();

            Assert.Equal(0, await context.Debts.CountAsync());
            Assert.Equal(0, await context.DebtSnapshots.CountAsync());
        }
    }

    [Fact]
    public async Task CanReorderDebts()
    {
        var (context, conn) = TestDbContextFactory.CreateSqliteInMemorySanadDbContext();
        using (conn)
        using (context)
        {
            var svc = new DebtService(context);
            var debt1 = new Debt { Name = "Debt 1", Type = "Loan", CurrentAmount = 100 };
            var debt2 = new Debt { Name = "Debt 2", Type = "Loan", CurrentAmount = 200 };
            await DebtEndpoints.CreateDebt(svc, debt1);
            await DebtEndpoints.CreateDebt(svc, debt2);

            var reorderList = new List<Guid> { debt2.Id, debt1.Id };
            var result = await DebtEndpoints.ReorderDebts(svc, reorderList);
            Assert.IsType<Ok>(result);

            context.ChangeTracker.Clear();

            var debts = await context.Debts.OrderBy(d => d.Order).ToListAsync();
            Assert.Equal(debt2.Id, debts[0].Id);
            Assert.Equal(debt1.Id, debts[1].Id);
        }
    }
}
