using System;
using System.IO;
using System.Text.RegularExpressions;

namespace Sanad.Api.Utils;

public static class FileUtils
{
    // Usernames become folder names under a datastore, so they may only contain characters that can't
    // form a path. Leading/trailing dots are rejected to block "." / ".." and Windows' trailing-dot trimming.
    private static readonly Regex UsernamePattern = new(@"^[A-Za-z0-9_-](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9_-])?$");

    public static bool IsValidUsername(string? username) =>
        !string.IsNullOrEmpty(username) && UsernamePattern.IsMatch(username);

    /// <summary>
    /// Resolves <paramref name="childName"/> as a direct child of <paramref name="parentDirectory"/>.
    /// Returns null if the name contains directory parts or would resolve anywhere else.
    /// </summary>
    public static string? ResolveChildPath(string parentDirectory, string? childName)
    {
        if (string.IsNullOrWhiteSpace(childName) || Path.GetFileName(childName) != childName) return null;

        var parent = Path.TrimEndingDirectorySeparator(Path.GetFullPath(parentDirectory));
        var fullPath = Path.GetFullPath(Path.Combine(parent, childName));

        return string.Equals(Path.GetDirectoryName(fullPath), parent, StringComparison.Ordinal) ? fullPath : null;
    }

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
