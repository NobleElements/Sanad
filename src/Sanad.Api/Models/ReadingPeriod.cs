namespace Sanad.Api.Models;

public class ReadingPeriod
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = "Planning"; // Planning, Reading, Completed
    public List<ReadingPlan> Plans { get; set; } = new();
    public List<ReadingLog> Logs { get; set; } = new();
}
