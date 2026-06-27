namespace Sanad.Api.Models;

public class EventCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string ColorCode { get; set; } = "#3B82F6"; // default blue
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
