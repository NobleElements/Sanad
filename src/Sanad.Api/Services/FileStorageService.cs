using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;

namespace Sanad.Api.Services;

public class FileStorageService
{
    private readonly string _storagePath;

    public FileStorageService(IWebHostEnvironment env)
    {
        // Store files in Data/files
        _storagePath = Path.Combine(env.ContentRootPath, "Data", "files");
        EnsureDirectoryExists(_storagePath);
    }

    private void EnsureDirectoryExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }

    public string GetFilePath(string fileName)
    {
        return Path.Combine(_storagePath, fileName);
    }

    public async Task AppendChunkAsync(string fileName, Stream chunkStream)
    {
        var filePath = GetFilePath(fileName);
        using var fileStream = new FileStream(filePath, FileMode.Append, FileAccess.Write, FileShare.None);
        await chunkStream.CopyToAsync(fileStream);
    }

    public void DeleteFile(string fileName)
    {
        var filePath = GetFilePath(fileName);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }

    public Stream GetFileStream(string fileName)
    {
        var filePath = GetFilePath(fileName);
        if (!File.Exists(filePath))
            throw new FileNotFoundException($"File not found: {fileName}");

        return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }
}
