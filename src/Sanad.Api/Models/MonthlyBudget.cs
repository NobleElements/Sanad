using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class MonthlyBudget
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public int Year { get; set; }
    
    [Required]
    public int Month { get; set; }
    
    [Required]
    public decimal Amount { get; set; }
}
