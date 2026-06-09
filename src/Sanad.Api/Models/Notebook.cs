namespace Sanad.Api.Models;

public class Notebook
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Note> Notes { get; set; } = new List<Note>();
}
