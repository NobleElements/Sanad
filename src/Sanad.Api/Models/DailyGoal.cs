using System.ComponentModel.DataAnnotations;

namespace Sanad.Api.Models;

public class DailyGoal
{
    [Key]
    public string DateStr { get; set; } = string.Empty; // YYYY-MM-DD
    public string Goal { get; set; } = string.Empty;
}
