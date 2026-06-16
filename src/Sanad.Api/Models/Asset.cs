using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class Asset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = "Cash"; 
    
    public Guid? CurrencyId { get; set; }
    public Currency? Currency { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    [Required]
    public decimal CurrentAmount { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
