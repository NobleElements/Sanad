namespace Sanad.Api.Models;

public class Note
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid NotebookId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Notebook Notebook { get; set; } = null!;
}
