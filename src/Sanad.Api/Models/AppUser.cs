using System.Text.Json.Serialization;

namespace Sanad.Api.Models;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    
    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;
    
    public string ApiKey { get; set; } = Guid.NewGuid().ToString("N");
    
    public bool IsAdmin { get; set; }
    public bool IsBlocked { get; set; }
    
    public int TierId { get; set; }
    public StorageTier? Tier { get; set; }
    
    public DateTime TierStartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? TierExpiresAt { get; set; }
    
    public int DatastoreId { get; set; } = 1;
    public Datastore? Datastore { get; set; }
    
    public bool IsMigrating { get; set; }
    public int? TargetDatastoreId { get; set; }
    
    public long DiskUsed { get; set; }
    
    // Paddle integration fields
    public string? PaddleCustomerId { get; set; }
    public string? PaddleSubscriptionId { get; set; }
    public string? PaddleSubscriptionStatus { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastVisitAt { get; set; }
    public string CreatedIpAddress { get; set; } = string.Empty;
}
