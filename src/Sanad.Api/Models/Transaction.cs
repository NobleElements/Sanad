using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public decimal Amount { get; set; }
    
    public DateTime Date { get; set; } = DateTime.UtcNow;
    
    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = "Expense"; // "Income" or "Expense"
    
    [Required]
    public Guid CategoryId { get; set; }
    
    public TransactionCategory? Category { get; set; }
}
