using System;

namespace Sanad.Api.Models;

public class Whiteboard
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "🎨";
    public string DocumentJson { get; set; } = string.Empty;
    public double? CameraX { get; set; }
    public double? CameraY { get; set; }
    public double? CameraZ { get; set; }
    public bool IsMinimapOpen { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
