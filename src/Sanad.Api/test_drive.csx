using System;
using System.IO;

var path = Directory.GetCurrentDirectory();
var root = new DirectoryInfo(path).Root.FullName;
var drive = new DriveInfo(root);
Console.WriteLine(drive.TotalSize);
Console.WriteLine(drive.AvailableFreeSpace);
