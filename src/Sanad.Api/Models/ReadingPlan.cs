namespace Sanad.Api.Models;

public class ReadingPlan
{
    public int Id { get; set; }
    public int ReadingPeriodId { get; set; }
    public ReadingPeriod ReadingPeriod { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public int StartPage { get; set; }
    public int EndPage { get; set; }
    public int OrderIndex { get; set; }
}
