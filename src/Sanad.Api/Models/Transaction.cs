namespace Sanad.Api.Models;

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public decimal Amount { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "Expense"; // "Income" or "Expense"
    public Guid CategoryId { get; set; }
    
    public TransactionCategory? Category { get; set; }
}
