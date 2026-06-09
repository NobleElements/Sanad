namespace Sanad.Api.Models;

public class TimelineItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ItemType { get; set; } = string.Empty; // e.g., "Thought"
    public string ReferenceId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
