using System;

namespace Sanad.Api.Models;

public class FileItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // original name
    public string FileName { get; set; } = string.Empty; // Guid name on disk
    public string Extension { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    public DateTime LastModifiedDate { get; set; } = DateTime.UtcNow;
    public int? FolderId { get; set; }
    public Folder? Folder { get; set; }
}
