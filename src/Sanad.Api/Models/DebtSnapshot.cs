using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class DebtSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid DebtId { get; set; }
    public Debt? Debt { get; set; }

    [Required]
    public decimal Amount { get; set; }
    
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}
