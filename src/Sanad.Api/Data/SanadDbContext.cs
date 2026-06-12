using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;

namespace Sanad.Api.Data;

public class SanadDbContext : DbContext
{
    public SanadDbContext(DbContextOptions<SanadDbContext> options) : base(options) { }

    public DbSet<Thought> Thoughts => Set<Thought>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<TaskAttachment> TaskAttachments => Set<TaskAttachment>();
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<MonthlyBudget> MonthlyBudgets => Set<MonthlyBudget>();
    public DbSet<Notebook> Notebooks => Set<Notebook>();
    public DbSet<Note> Notes => Set<Note>();

    public DbSet<DailyGoal> DailyGoals => Set<DailyGoal>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetSnapshot> AssetSnapshots => Set<AssetSnapshot>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<ReadingPeriod> ReadingPeriods => Set<ReadingPeriod>();
    public DbSet<ReadingPlan> ReadingPlans => Set<ReadingPlan>();
    public DbSet<ReadingLog> ReadingLogs => Set<ReadingLog>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitLog> HabitLogs => Set<HabitLog>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<FileItem> FileItems => Set<FileItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Folder>()
            .HasMany(f => f.Subfolders)
            .WithOne(f => f.Parent)
            .HasForeignKey(f => f.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Folder>()
            .HasMany(f => f.Files)
            .WithOne(fi => fi.Folder)
            .HasForeignKey(fi => fi.FolderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
