namespace Sanad.Api.Models;

public class Folder
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public Folder? Parent { get; set; }
    public ICollection<Folder> Subfolders { get; set; } = new List<Folder>();
    public ICollection<FileItem> Files { get; set; } = new List<FileItem>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
