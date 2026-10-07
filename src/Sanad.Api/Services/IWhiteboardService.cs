using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

/// <summary>
/// Summary projection returned by the whiteboard list endpoint: everything except
/// the (potentially very large) canvas document.
/// </summary>
public record WhiteboardSummaryDto(
    Guid Id,
    string Name,
    string Icon,
    double? CameraX,
    double? CameraY,
    double? CameraZ,
    bool IsMinimapOpen,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateWhiteboardRequest(
    string Name,
    string? Icon,
    string? DocumentJson,
    double? CameraX = null,
    double? CameraY = null,
    double? CameraZ = null,
    bool? IsMinimapOpen = null
);

public record UpdateWhiteboardRequest(
    string? Name = null,
    string? Icon = null,
    string? DocumentJson = null,
    double? CameraX = null,
    double? CameraY = null,
    double? CameraZ = null,
    bool? IsMinimapOpen = null
);

public interface IWhiteboardService
{
    Task<List<WhiteboardSummaryDto>> GetWhiteboardsAsync();
    Task<Whiteboard?> GetWhiteboardAsync(Guid id);

    /// <summary>Returns null when the name is blank.</summary>
    Task<Whiteboard?> CreateWhiteboardAsync(CreateWhiteboardRequest request);

    Task<Whiteboard?> UpdateWhiteboardAsync(Guid id, UpdateWhiteboardRequest request);
    Task<bool> DeleteWhiteboardAsync(Guid id);
}