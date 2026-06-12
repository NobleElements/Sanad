using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Sanad.Api.Data;

public class SanadDbContextFactory : IDesignTimeDbContextFactory<SanadDbContext>
{
    public SanadDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SanadDbContext>();
        
        // For design-time tools (like EF migrations), we use a placeholder database file.
        // This avoids relying on the TenantProvider at design time and prevents the creation of a 'default' folder.
        optionsBuilder.UseSqlite("Data Source=Data/migrations.db");

        return new SanadDbContext(optionsBuilder.Options);
    }
}
