using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;

namespace Sanad.Api.Data;

public class SanadDbContext : DbContext
{
    public SanadDbContext(DbContextOptions<SanadDbContext> options) : base(options) { }

    public DbSet<Thought> Thoughts => Set<Thought>();
    public DbSet<TimelineItem> TimelineItems => Set<TimelineItem>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<TaskAttachment> TaskAttachments => Set<TaskAttachment>();
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<MonthlyBudget> MonthlyBudgets => Set<MonthlyBudget>();
    public DbSet<Notebook> Notebooks => Set<Notebook>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<User> Users => Set<User>();
    public DbSet<DailyGoal> DailyGoals => Set<DailyGoal>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetSnapshot> AssetSnapshots => Set<AssetSnapshot>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<ReadingPeriod> ReadingPeriods => Set<ReadingPeriod>();
    public DbSet<ReadingPlan> ReadingPlans => Set<ReadingPlan>();
    public DbSet<ReadingLog> ReadingLogs => Set<ReadingLog>();
}
