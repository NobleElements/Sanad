using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class TransactionCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(10)]
    public string ColorHex { get; set; } = "#cccccc";
    
    [Required]
    public decimal MonthlyBudget { get; set; }
}
