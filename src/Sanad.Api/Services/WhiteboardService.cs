using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public class WhiteboardService : IWhiteboardService
{
    private readonly SanadDbContext _db;

    public WhiteboardService(SanadDbContext db)
    {
        _db = db;
    }

    public async Task<List<WhiteboardSummaryDto>> GetWhiteboardsAsync()
    {
        return await _db.Whiteboards
            .OrderByDescending(w => w.UpdatedAt)
            .Select(w => new WhiteboardSummaryDto(
                w.Id,
                w.Name,
                w.Icon,
                w.CameraX,
                w.CameraY,
                w.CameraZ,
                w.IsMinimapOpen,
                w.CreatedAt,
                w.UpdatedAt
            ))
            .ToListAsync();
    }

    public async Task<Whiteboard?> GetWhiteboardAsync(Guid id)
    {
        return await _db.Whiteboards.FindAsync(id);
    }

    public async Task<Whiteboard?> CreateWhiteboardAsync(CreateWhiteboardRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return null;

        var whiteboard = new Whiteboard
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "🎨" : request.Icon.Trim(),
            DocumentJson = request.DocumentJson ?? string.Empty,
            CameraX = request.CameraX,
            CameraY = request.CameraY,
            CameraZ = request.CameraZ,
            IsMinimapOpen = request.IsMinimapOpen ?? true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Whiteboards.Add(whiteboard);
        await _db.SaveChangesAsync();

        return whiteboard;
    }

    public async Task<Whiteboard?> UpdateWhiteboardAsync(Guid id, UpdateWhiteboardRequest request)
    {
        var whiteboard = await _db.Whiteboards.FindAsync(id);
        if (whiteboard == null) return null;

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            whiteboard.Name = request.Name.Trim();
        }

        if (request.Icon != null)
        {
            whiteboard.Icon = string.IsNullOrWhiteSpace(request.Icon) ? "🎨" : request.Icon.Trim();
        }

        if (request.DocumentJson != null)
        {
            whiteboard.DocumentJson = request.DocumentJson;
        }

        if (request.CameraX.HasValue)
        {
            whiteboard.CameraX = request.CameraX.Value;
        }

        if (request.CameraY.HasValue)
        {
            whiteboard.CameraY = request.CameraY.Value;
        }

        if (request.CameraZ.HasValue)
        {
            whiteboard.CameraZ = request.CameraZ.Value;
        }

        if (request.IsMinimapOpen.HasValue)
        {
            whiteboard.IsMinimapOpen = request.IsMinimapOpen.Value;
        }

        whiteboard.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return whiteboard;
    }

    public async Task<bool> DeleteWhiteboardAsync(Guid id)
    {
        var whiteboard = await _db.Whiteboards.FindAsync(id);
        if (whiteboard == null) return false;

        _db.Whiteboards.Remove(whiteboard);
        await _db.SaveChangesAsync();

        return true;
    }
}