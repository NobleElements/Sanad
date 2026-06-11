namespace Sanad.Api.Models;

public class Habit
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Frequency { get; set; } = "Daily"; // Daily, Weekly, Monthly
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public int Order { get; set; } = 0;
    
    public List<HabitLog> Logs { get; set; } = new();
}
