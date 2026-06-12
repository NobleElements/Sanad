using System;
using System.IO;

namespace Sanad.Api.Utils;

public static class FileUtils
{
    public static (string FileName, string FilePath) GenerateUniqueFile(string directoryPath, string extension)
    {
        string uniqueFileName;
        string filePath;
        do
        {
            uniqueFileName = $"{Guid.NewGuid()}{extension}";
            filePath = Path.Combine(directoryPath, uniqueFileName);
        } while (File.Exists(filePath));
        
        return (uniqueFileName, filePath);
    }

    public static (string FileName, string FilePath) GenerateUniqueFile(Func<string, string> getFilePathFunc, string extension)
    {
        string uniqueFileName;
        string filePath;
        do
        {
            uniqueFileName = $"{Guid.NewGuid()}{extension}";
            filePath = getFilePathFunc(uniqueFileName);
        } while (File.Exists(filePath));
        
        return (uniqueFileName, filePath);
    }
}
