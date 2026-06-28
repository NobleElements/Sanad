namespace Sanad.Api.Models;

public enum SharePermission
{
    View = 0,
    Edit = 1
}

public class SharedLink
{
    public int Id { get; set; }
    
    // The unique string token used in the public URL
    public string Token { get; set; } = Guid.NewGuid().ToString("N");
    
    // Links to the tenant owner in the global Admin database
    public Guid UserId { get; set; }
    public AppUser? User { get; set; }

    // IDs stored in the tenant DB. We cannot have navigation properties
    // here because the target entities live in a different DbContext (SanadDbContext).
    public int? FolderId { get; set; }
    public int? FileItemId { get; set; }

    public SharePermission Permission { get; set; } = SharePermission.View;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
