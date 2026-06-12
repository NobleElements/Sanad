using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public class FileManagerService
{
    private readonly SanadDbContext _db;
    private readonly FileStorageService _storage;

    public FileManagerService(SanadDbContext db, FileStorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task<object> GetFolderContentsPaginatedAsync(
        int? folderId, 
        int page, 
        int pageSize, 
        string? search, 
        string sortBy, 
        string sortOrder)
    {
        var foldersQuery = _db.Folders.Where(f => f.ParentId == folderId);
        var filesQuery = _db.FileItems.Where(f => f.FolderId == folderId);

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            foldersQuery = foldersQuery.Where(f => f.Name.ToLower().Contains(s));
            filesQuery = filesQuery.Where(f => f.Name.ToLower().Contains(s));
        }

        bool isAsc = sortOrder.ToLower() == "asc";

        if (sortBy.ToLower() == "name")
        {
            foldersQuery = isAsc ? foldersQuery.OrderBy(f => f.Name) : foldersQuery.OrderByDescending(f => f.Name);
            filesQuery = isAsc ? filesQuery.OrderBy(f => f.Name) : filesQuery.OrderByDescending(f => f.Name);
        }
        else if (sortBy.ToLower() == "size")
        {
            foldersQuery = isAsc ? foldersQuery.OrderBy(f => f.Name) : foldersQuery.OrderByDescending(f => f.Name);
            filesQuery = isAsc ? filesQuery.OrderBy(f => f.SizeBytes) : filesQuery.OrderByDescending(f => f.SizeBytes);
        }
        else if (sortBy.ToLower() == "date")
        {
            foldersQuery = isAsc ? foldersQuery.OrderBy(f => f.CreatedAt) : foldersQuery.OrderByDescending(f => f.CreatedAt);
            filesQuery = isAsc ? filesQuery.OrderBy(f => f.UploadDate) : filesQuery.OrderByDescending(f => f.UploadDate);
        }

        var totalFolders = await foldersQuery.CountAsync();
        var totalFiles = await filesQuery.CountAsync();

        int offset = (page - 1) * pageSize;
        int foldersToTake = 0;
        int filesToTake = 0;
        int filesOffset = 0;

        if (offset < totalFolders)
        {
            foldersToTake = Math.Min(pageSize, totalFolders - offset);
            filesToTake = pageSize - foldersToTake;
            filesOffset = 0;
        }
        else
        {
            foldersToTake = 0;
            filesToTake = pageSize;
            filesOffset = offset - totalFolders;
        }

        var pagedFolders = foldersToTake > 0 
            ? await foldersQuery.Skip(offset).Take(foldersToTake).ToListAsync() 
            : new List<Folder>();

        var pagedFiles = filesToTake > 0 
            ? await filesQuery.Skip(filesOffset).Take(filesToTake).ToListAsync() 
            : new List<FileItem>();

        Folder? currentFolder = null;
        if (folderId.HasValue)
        {
            currentFolder = await _db.Folders.FindAsync(folderId.Value);
        }

        int totalItems = totalFolders + totalFiles;
        int totalPages = totalItems == 0 ? 1 : (int)Math.Ceiling(totalItems / (double)pageSize);

        return new 
        { 
            Folder = currentFolder, 
            Subfolders = pagedFolders, 
            Files = pagedFiles,
            Pagination = new 
            {
                TotalItems = totalItems,
                TotalFolders = totalFolders,
                TotalFiles = totalFiles,
                TotalPages = totalPages,
                CurrentPage = page,
                PageSize = pageSize
            }
        };
    }

    public async Task<object> GetFolderContentsAsync(int? folderId = null)
    {
        var subfolders = await _db.Folders.Where(f => f.ParentId == folderId).ToListAsync();
        var files = await _db.FileItems.Where(f => f.FolderId == folderId).ToListAsync();
        return new { Folders = subfolders, Files = files };
    }

    public async Task<object> SearchFilesAsync(string query)
    {
        var s = query.ToLower();
        var folders = await _db.Folders.Where(f => f.Name.ToLower().Contains(s)).ToListAsync();
        var files = await _db.FileItems.Where(f => f.Name.ToLower().Contains(s)).ToListAsync();
        return new { Folders = folders, Files = files };
    }

    public async Task DeleteFolderRecursivelyAsync(int folderId)
    {
        var folder = await _db.Folders
            .Include(f => f.Files)
            .Include(f => f.Subfolders)
            .FirstOrDefaultAsync(f => f.Id == folderId);
            
        if (folder == null) return;

        var allFiles = new List<FileItem>();
        await CollectFilesRecursive(folderId, allFiles);

        foreach (var file in allFiles)
        {
            _storage.DeleteFile(file.FileName);
        }

        _db.Folders.Remove(folder); 
        await _db.SaveChangesAsync();
    }

    private async Task CollectFilesRecursive(int folderId, List<FileItem> allFiles)
    {
        var files = await _db.FileItems.Where(f => f.FolderId == folderId).ToListAsync();
        allFiles.AddRange(files);

        var subfolders = await _db.Folders.Where(f => f.ParentId == folderId).Select(f => f.Id).ToListAsync();
        foreach (var subId in subfolders)
        {
            await CollectFilesRecursive(subId, allFiles);
        }
    }

    public async Task<FileItem?> UploadLocalFileAsync(string localFilePath, int? folderId = null)
    {
        if (!File.Exists(localFilePath)) return null;

        var name = Path.GetFileName(localFilePath);
        var ext = Path.GetExtension(localFilePath);
        var fileInfo = new FileInfo(localFilePath);
        var uniqueFileName = $"{Guid.NewGuid()}{ext}";
        
        var destPath = _storage.GetFilePath(uniqueFileName);
        File.Copy(localFilePath, destPath, true);

        var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(name, out var mimeType))
        {
            mimeType = "application/octet-stream";
        }

        var fileItem = new FileItem
        {
            Name = name,
            FileName = uniqueFileName,
            Extension = ext,
            MimeType = mimeType,
            SizeBytes = fileInfo.Length,
            FolderId = folderId
        };
        _db.FileItems.Add(fileItem);
        await _db.SaveChangesAsync();
        return fileItem;
    }

    public async Task<Folder?> UploadLocalFolderAsync(string localFolderPath, int? targetParentId = null)
    {
        if (!Directory.Exists(localFolderPath)) return null;
        
        var folderName = new DirectoryInfo(localFolderPath).Name;
        var folder = new Folder { Name = folderName, ParentId = targetParentId };
        _db.Folders.Add(folder);
        await _db.SaveChangesAsync();

        await UploadFolderRecursive(localFolderPath, folder.Id);
        return folder;
    }

    private async Task UploadFolderRecursive(string localPath, int parentId)
    {
        foreach(var file in Directory.GetFiles(localPath))
        {
            await UploadLocalFileAsync(file, parentId);
        }
        foreach(var dir in Directory.GetDirectories(localPath))
        {
            var dirName = new DirectoryInfo(dir).Name;
            var folder = new Folder { Name = dirName, ParentId = parentId };
            _db.Folders.Add(folder);
            await _db.SaveChangesAsync();
            await UploadFolderRecursive(dir, folder.Id);
        }
    }

    public async Task<bool> DownloadFileToLocalAsync(int fileId, string destinationPath)
    {
        var fileItem = await _db.FileItems.FindAsync(fileId);
        if (fileItem == null) return false;

        var sourcePath = _storage.GetFilePath(fileItem.FileName);
        if (!File.Exists(sourcePath)) return false;

        if (Directory.Exists(destinationPath))
        {
            destinationPath = Path.Combine(destinationPath, fileItem.Name);
        }

        File.Copy(sourcePath, destinationPath, true);
        return true;
    }

    public async Task<bool> DownloadFolderToLocalAsync(int folderId, string destinationDirectory)
    {
        var folder = await _db.Folders.FindAsync(folderId);
        if (folder == null) return false;

        var targetDir = Path.Combine(destinationDirectory, folder.Name);
        Directory.CreateDirectory(targetDir);
        await DownloadFolderToLocalRecursive(folderId, targetDir);
        return true;
    }

    private async Task DownloadFolderToLocalRecursive(int folderId, string destDir)
    {
        var files = await _db.FileItems.Where(f => f.FolderId == folderId).ToListAsync();
        foreach(var file in files)
        {
            var sourcePath = _storage.GetFilePath(file.FileName);
            if (File.Exists(sourcePath))
            {
                File.Copy(sourcePath, Path.Combine(destDir, file.Name), true);
            }
        }

        var subfolders = await _db.Folders.Where(f => f.ParentId == folderId).ToListAsync();
        foreach(var sub in subfolders)
        {
            var subDir = Path.Combine(destDir, sub.Name);
            Directory.CreateDirectory(subDir);
            await DownloadFolderToLocalRecursive(sub.Id, subDir);
        }
    }
}
