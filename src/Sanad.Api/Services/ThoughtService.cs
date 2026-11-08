using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public class ThoughtService : IThoughtService
{
    private readonly SanadDbContext _db;

    public ThoughtService(SanadDbContext db)
    {
        _db = db;
    }

    public async Task<List<Thought>> GetThoughtsAsync(int page = 1, int pageSize = 20, string? search = null, string? collectionId = null)
    {
        var p = page < 1 ? 1 : page;
        var size = pageSize < 1 ? 20 : pageSize;
        var query = _db.Thoughts.Include(t => t.Collection).AsQueryable();

        if (!string.IsNullOrWhiteSpace(collectionId))
        {
            if (collectionId.Equals("__UNCATEGORIZED__", StringComparison.OrdinalIgnoreCase) || collectionId.Equals("null", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(t => t.CollectionId == null);
            }
            else
            {
                query = query.Where(t => t.CollectionId == collectionId);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowerSearch = search.ToLower();
            query = query.Where(t => t.Content != null && t.Content.ToLower().Contains(lowerSearch));
        }

        return await query
            .OrderByDescending(t => t.IsPinned)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((p - 1) * size)
            .Take(size)
            .ToListAsync();
    }

    public async Task<Thought> CreateThoughtAsync(string content, string? collectionId = null, string? color = null, bool isPinned = false)
    {
        var thought = new Thought
        {
            Content = content,
            CollectionId = string.IsNullOrWhiteSpace(collectionId) ? null : collectionId,
            Color = color,
            IsPinned = isPinned,
            CreatedAt = DateTime.UtcNow
        };
        _db.Thoughts.Add(thought);
        await _db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(thought.CollectionId))
        {
            await _db.Entry(thought).Reference(t => t.Collection).LoadAsync();
        }

        return thought;
    }

    public async Task<Thought?> UpdateThoughtAsync(string id, string? content = null, string? collectionId = null, string? color = null, bool? isPinned = null, bool clearCollection = false)
    {
        var thought = await _db.Thoughts.Include(t => t.Collection).FirstOrDefaultAsync(t => t.Id == id);
        if (thought == null) return null;

        if (content != null) thought.Content = content;
        if (color != null) thought.Color = string.IsNullOrWhiteSpace(color) ? null : color;
        if (isPinned.HasValue) thought.IsPinned = isPinned.Value;
        if (clearCollection)
        {
            thought.CollectionId = null;
            thought.Collection = null;
        }
        else if (collectionId != null)
        {
            thought.CollectionId = string.IsNullOrWhiteSpace(collectionId) || collectionId == "__UNCATEGORIZED__" ? null : collectionId;
        }

        thought.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(thought.CollectionId) && thought.Collection == null)
        {
            await _db.Entry(thought).Reference(t => t.Collection).LoadAsync();
        }

        return thought;
    }

    public async Task<bool> DeleteThoughtAsync(string id)
    {
        var thought = await _db.Thoughts.FindAsync(id);
        if (thought == null) return false;

        _db.Thoughts.Remove(thought);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ThoughtCollectionDto>> GetCollectionsAsync()
    {
        var collections = await _db.ThoughtCollections
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync();

        var counts = await _db.Thoughts
            .Where(t => t.CollectionId != null)
            .GroupBy(t => t.CollectionId!)
            .Select(g => new { CollectionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CollectionId, x => x.Count);

        return collections.Select(c => new ThoughtCollectionDto(
            c.Id,
            c.Name,
            c.Color,
            c.SortOrder,
            counts.TryGetValue(c.Id, out var count) ? count : 0,
            c.CreatedAt
        )).ToList();
    }

    public async Task<ThoughtCollection> CreateCollectionAsync(string name, string? color = null)
    {
        var collection = new ThoughtCollection
        {
            Name = name.Trim(),
            Color = string.IsNullOrWhiteSpace(color) ? "#6366F1" : color.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        _db.ThoughtCollections.Add(collection);
        await _db.SaveChangesAsync();
        return collection;
    }

    public async Task<ThoughtCollection?> UpdateCollectionAsync(string id, string name, string? color = null)
    {
        var collection = await _db.ThoughtCollections.FindAsync(id);
        if (collection == null) return null;

        if (!string.IsNullOrWhiteSpace(name)) collection.Name = name.Trim();
        if (color != null) collection.Color = color.Trim();

        await _db.SaveChangesAsync();
        return collection;
    }

    public async Task<bool> DeleteCollectionAsync(string id, bool deleteThoughts = false)
    {
        var collection = await _db.ThoughtCollections.FindAsync(id);
        if (collection == null) return false;

        if (deleteThoughts)
        {
            var thoughts = await _db.Thoughts.Where(t => t.CollectionId == id).ToListAsync();
            _db.Thoughts.RemoveRange(thoughts);
        }
        else
        {
            var thoughts = await _db.Thoughts.Where(t => t.CollectionId == id).ToListAsync();
            foreach (var t in thoughts)
            {
                t.CollectionId = null;
            }
        }

        _db.ThoughtCollections.Remove(collection);
        await _db.SaveChangesAsync();
        return true;
    }
}
