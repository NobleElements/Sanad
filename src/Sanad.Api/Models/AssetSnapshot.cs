using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class AssetSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid AssetId { get; set; }
    
    [Required]
    public decimal Amount { get; set; }
    
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    
    public Asset? Asset { get; set; }
}
