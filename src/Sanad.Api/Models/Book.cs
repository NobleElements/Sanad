namespace Sanad.Api.Models;

public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public int TotalPages { get; set; }
    public string? ExternalApiId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
