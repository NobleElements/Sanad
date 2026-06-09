namespace Sanad.Api.Models;

public class TransactionCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#cccccc";
    public decimal MonthlyBudget { get; set; }
}
