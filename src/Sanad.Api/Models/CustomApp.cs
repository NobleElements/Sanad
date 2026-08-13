using System;

namespace Sanad.Api.Models;

public class CustomApp
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public bool ShowInDashboard { get; set; }
    public bool IsStandalone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
