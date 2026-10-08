using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class FinanceServiceTests
{
    [Fact]
    public async Task Currency_DefaultRulesAndExchangeRateRebasing_Work()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new FinanceService(db);

        // 1. First currency created automatically becomes default
        var usd = await service.CreateCurrencyAsync(new Currency { Code = "USD", Name = "US Dollar", Symbol = "$", ExchangeRateToDefault = 1.0m });
        Assert.True(usd.IsDefault);
        Assert.Equal(1.0m, usd.ExchangeRateToDefault);

        // 2. Second currency is not default
        var eur = await service.CreateCurrencyAsync(new Currency { Code = "EUR", Name = "Euro", Symbol = "€", ExchangeRateToDefault = 2.0m });
        Assert.False(eur.IsDefault);

        // 3. Deleting default currency is rejected
        var deleteDefaultResult = await service.DeleteCurrencyAsync(usd.Id);
        Assert.False(deleteDefaultResult);

        // 4. Set EUR as new default -> Rebases USD to 0.5 (1.0 / 2.0)
        var setDefaultResult = await service.SetDefaultCurrencyAsync(eur.Id);
        Assert.True(setDefaultResult);

        // Read back from the store, not the tracked instances, to prove the rebase was saved
        db.ChangeTracker.Clear();
        var updatedCurrencies = await service.GetCurrenciesAsync();
        var updatedEur = updatedCurrencies.Single(c => c.Id == eur.Id);
        var updatedUsd = updatedCurrencies.Single(c => c.Id == usd.Id);

        Assert.True(updatedEur.IsDefault);
        Assert.Equal(1.0m, updatedEur.ExchangeRateToDefault);
        Assert.False(updatedUsd.IsDefault);
        Assert.Equal(0.5m, updatedUsd.ExchangeRateToDefault);

        // 5. Cannot delete currency if referenced by an Asset
        db.Assets.Add(new Asset { Name = "USD Account", Type = "Bank", CurrentAmount = 500, CurrencyId = usd.Id });
        await db.SaveChangesAsync();
        Assert.False(await service.DeleteCurrencyAsync(usd.Id));
    }

    [Fact]
    public async Task DeleteCurrency_RemovesUnreferencedCurrency_AndRefusesOneUsedByADebt()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new FinanceService(db);

        await service.CreateCurrencyAsync(new Currency { Code = "USD", Name = "US Dollar", Symbol = "$" });
        var eur = await service.CreateCurrencyAsync(new Currency { Code = "EUR", Name = "Euro", Symbol = "€", ExchangeRateToDefault = 2.0m });
        var gbp = await service.CreateCurrencyAsync(new Currency { Code = "GBP", Name = "Pound", Symbol = "£", ExchangeRateToDefault = 2.5m });

        // 1. Unknown id
        Assert.False(await service.DeleteCurrencyAsync(Guid.NewGuid()));

        // 2. Referenced by a debt -> refused and kept
        db.Debts.Add(new Debt { Name = "GBP Loan", Type = "Loan", CurrentAmount = 100, CurrencyId = gbp.Id });
        await db.SaveChangesAsync();
        Assert.False(await service.DeleteCurrencyAsync(gbp.Id));

        // 3. Non-default and unreferenced -> deleted
        Assert.True(await service.DeleteCurrencyAsync(eur.Id));

        db.ChangeTracker.Clear();

        Assert.Null(await db.Currencies.FindAsync(eur.Id));
        Assert.NotNull(await db.Currencies.FindAsync(gbp.Id));
        Assert.Equal(2, await db.Currencies.CountAsync());
    }

    [Fact]
    public async Task SetDefaultCurrency_RejectsNonPositiveRate_AndLeavesRatesUntouched()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new FinanceService(db);

        var usd = await service.CreateCurrencyAsync(new Currency { Code = "USD", Name = "US Dollar", Symbol = "$" });
        var zero = await service.CreateCurrencyAsync(new Currency { Code = "ZRO", Name = "Zero", Symbol = "Z", ExchangeRateToDefault = 0m });
        var negative = await service.CreateCurrencyAsync(new Currency { Code = "NEG", Name = "Negative", Symbol = "N", ExchangeRateToDefault = -1.5m });

        Assert.False(await service.SetDefaultCurrencyAsync(zero.Id));
        Assert.False(await service.SetDefaultCurrencyAsync(negative.Id));
        Assert.False(await service.SetDefaultCurrencyAsync(Guid.NewGuid()));

        db.ChangeTracker.Clear();

        var currencies = await service.GetCurrenciesAsync();
        Assert.Equal(usd.Id, Assert.Single(currencies, c => c.IsDefault).Id);
        Assert.Equal(1.0m, currencies.Single(c => c.Id == usd.Id).ExchangeRateToDefault);
        Assert.Equal(0m, currencies.Single(c => c.Id == zero.Id).ExchangeRateToDefault);
        Assert.Equal(-1.5m, currencies.Single(c => c.Id == negative.Id).ExchangeRateToDefault);
    }

    [Fact]
    public async Task SetDefaultCurrency_RoundsRebasedRatesToSixDecimals()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new FinanceService(db);

        var usd = await service.CreateCurrencyAsync(new Currency { Code = "USD", Name = "US Dollar", Symbol = "$" });
        var eur = await service.CreateCurrencyAsync(new Currency { Code = "EUR", Name = "Euro", Symbol = "€", ExchangeRateToDefault = 2.0m });
        var gbp = await service.CreateCurrencyAsync(new Currency { Code = "GBP", Name = "Pound", Symbol = "£", ExchangeRateToDefault = 3.0m });

        // 1 GBP = 3 USD, so 1 USD = 1/3 GBP and 1 EUR = 2/3 GBP; neither division terminates.
        Assert.True(await service.SetDefaultCurrencyAsync(gbp.Id));

        db.ChangeTracker.Clear();

        var currencies = await service.GetCurrenciesAsync();
        var newDefault = currencies.Single(c => c.Id == gbp.Id);
        Assert.True(newDefault.IsDefault);
        Assert.Equal(1.0m, newDefault.ExchangeRateToDefault);
        Assert.Equal(0.333333m, currencies.Single(c => c.Id == usd.Id).ExchangeRateToDefault);
        Assert.Equal(0.666667m, currencies.Single(c => c.Id == eur.Id).ExchangeRateToDefault);
        Assert.Single(currencies, c => c.IsDefault);
    }

    [Fact]
    public async Task Transactions_PaginationAndFiltering_Work()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new FinanceService(db);

        var catA = await service.CreateCategoryAsync("Groceries", 300);
        var catB = await service.CreateCategoryAsync("Utilities", 150);

        var targetMonth = 8;
        var targetYear = 2026;

        // Add 5 transactions in August 2026
        for (int i = 1; i <= 5; i++)
        {
            db.Transactions.Add(new Transaction
            {
                Id = Guid.NewGuid(),
                Amount = 10 * i,
                Description = $"Item {i}",
                CategoryId = (i % 2 == 0) ? catA.Id : catB.Id,
                Date = new DateTime(targetYear, targetMonth, i, 12, 0, 0, DateTimeKind.Utc),
                Type = "Expense"
            });
        }

        // Add 1 transaction in September 2026 (outside target month)
        db.Transactions.Add(new Transaction
        {
            Id = Guid.NewGuid(),
            Amount = 999,
            Description = "September Item",
            CategoryId = catA.Id,
            Date = new DateTime(targetYear, targetMonth + 1, 1, 12, 0, 0, DateTimeKind.Utc),
            Type = "Expense"
        });
        await db.SaveChangesAsync();

        // 1. Query August: Page 1 with pageSize 3 -> returns 3 items, HasMore = true, TotalCount = 5
        var (itemsPage1, totalCount, hasMore) = await service.GetTransactionsPaginatedAsync(targetMonth, targetYear, 1, 3);
        Assert.Equal(3, itemsPage1.Count);
        Assert.Equal(5, totalCount);
        Assert.True(hasMore);

        // 2. Filter by Category catA
        var (catAItems, catACount, _) = await service.GetTransactionsPaginatedAsync(targetMonth, targetYear, 1, 10, null, catA.Id);
        Assert.Equal(2, catAItems.Count);
        Assert.Equal(2, catACount);

        // 3. Search filter by description
        var (searchedItems, searchCount, _) = await service.GetTransactionsPaginatedAsync(targetMonth, targetYear, 1, 10, "Item 4");
        Assert.Single(searchedItems);
        Assert.Equal(1, searchCount);
        Assert.Equal("Item 4", searchedItems[0].Description);
    }

    [Fact]
    public async Task FinanceSummary_CalculatesAccurately()
    {
        using var db = TestDbContextFactory.CreateInMemorySanadDbContext();
        var service = new FinanceService(db);

        var month = 9;
        var year = 2026;

        // Set monthly overall budget
        await service.SetMonthlyBudgetAsync(month, year, 1200m);

        var food = await service.CreateCategoryAsync("Food", 400m);
        var rent = await service.CreateCategoryAsync("Rent", 700m);

        db.Transactions.AddRange(
            new Transaction { Amount = 150m, CategoryId = food.Id, Type = "Expense", Date = new DateTime(year, month, 5, 0, 0, 0, DateTimeKind.Utc) },
            new Transaction { Amount = 50m, CategoryId = food.Id, Type = "Expense", Date = new DateTime(year, month, 12, 0, 0, 0, DateTimeKind.Utc) },
            new Transaction { Amount = 700m, CategoryId = rent.Id, Type = "Expense", Date = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc) },
            // Income should not be counted toward expenses
            new Transaction { Amount = 3000m, CategoryId = food.Id, Type = "Income", Date = new DateTime(year, month, 15, 0, 0, 0, DateTimeKind.Utc) }
        );
        await db.SaveChangesAsync();

        var summary = await service.GetSummaryAsync(month, year);
        var json = JsonSerializer.SerializeToElement(summary);

        Assert.Equal(1200m, json.GetProperty("MonthlyBudget").GetDecimal());
        Assert.Equal(900m, json.GetProperty("TotalSpent").GetDecimal()); // 150 + 50 + 700

        var categories = json.GetProperty("Categories").EnumerateArray().ToList();
        var foodSummary = categories.Single(c => c.GetProperty("Category").GetProperty("Name").GetString() == "Food");
        Assert.Equal(200m, foodSummary.GetProperty("Spent").GetDecimal()); // 150 + 50
        Assert.Equal(200m, foodSummary.GetProperty("Remaining").GetDecimal()); // 400 - 200
    }
}
