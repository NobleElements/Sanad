using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;

namespace Sanad.Api.Data;

public class SanadDbContext : DbContext
{
    public SanadDbContext(DbContextOptions<SanadDbContext> options) : base(options) { }

    public DbSet<Thought> Thoughts => Set<Thought>();
    public DbSet<TimelineItem> TimelineItems => Set<TimelineItem>();
}
