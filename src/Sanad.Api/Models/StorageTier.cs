namespace Sanad.Api.Models;

public class StorageTier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public long DiskLimitBytes { get; set; }
}
