namespace Sanad.Api.Models;

public class Thought
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Content { get; set; } = string.Empty;
    public string? CollectionId { get; set; }
    public ThoughtCollection? Collection { get; set; }
    public bool IsPinned { get; set; } = false;
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
