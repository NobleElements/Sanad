namespace Sanad.Api.Models;

public class TaskComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
