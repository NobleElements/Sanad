namespace Sanad.Api.Models;

public class ReadingLog
{
    public int Id { get; set; }
    public int ReadingPeriodId { get; set; }
    public ReadingPeriod ReadingPeriod { get; set; } = null!;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public int StartPage { get; set; }
    public int EndPage { get; set; }
}
