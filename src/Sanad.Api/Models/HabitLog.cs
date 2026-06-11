using System.Text.Json.Serialization;

namespace Sanad.Api.Models;

public class HabitLog
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string HabitId { get; set; } = string.Empty;
    public DateTime Date { get; set; } // Only the Date part should be significant
    public bool Completed { get; set; } = false;
    
    [JsonIgnore]
    public Habit Habit { get; set; } = null!;
}
