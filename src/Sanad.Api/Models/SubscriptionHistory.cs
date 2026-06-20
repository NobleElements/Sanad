namespace Sanad.Api.Models;

public class SubscriptionHistory
{
    public int Id { get; set; }
    
    public Guid UserId { get; set; }
    public AppUser? User { get; set; }
    
    public int TierId { get; set; }
    public StorageTier? Tier { get; set; }
    
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}
