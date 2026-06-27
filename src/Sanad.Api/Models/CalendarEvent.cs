namespace Sanad.Api.Models;

public class CalendarEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsAllDay { get; set; }
    
    // JSON representation of recurrence rule
    public string? RecurrenceRule { get; set; }
    
    // Minutes before event to notify (null = none, 0 = at event time, 5 = 5 min before, etc.)
    public int? NotificationPreference { get; set; }
    
    // Link to category for color coding
    public Guid? CategoryId { get; set; }
    public EventCategory? Category { get; set; }
    
    // Link to task if dragged from tasks list
    public Guid? TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
