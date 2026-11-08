using Microsoft.EntityFrameworkCore;
using Sanad.Api.Models;

namespace Sanad.Api.Data;

public class SanadDbContext : DbContext
{
    public SanadDbContext(DbContextOptions<SanadDbContext> options) : base(options) { }

    public DbSet<Thought> Thoughts => Set<Thought>();
    public DbSet<ThoughtCollection> ThoughtCollections => Set<ThoughtCollection>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<TaskAttachment> TaskAttachments => Set<TaskAttachment>();
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<MonthlyBudget> MonthlyBudgets => Set<MonthlyBudget>();
    public DbSet<Notebook> Notebooks => Set<Notebook>();
    public DbSet<Note> Notes => Set<Note>();
    
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<EventCategory> EventCategories => Set<EventCategory>();

    public DbSet<DailyGoal> DailyGoals => Set<DailyGoal>();
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetSnapshot> AssetSnapshots => Set<AssetSnapshot>();
    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<DebtSnapshot> DebtSnapshots => Set<DebtSnapshot>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<ReadingPeriod> ReadingPeriods => Set<ReadingPeriod>();
    public DbSet<ReadingPlan> ReadingPlans => Set<ReadingPlan>();
    public DbSet<ReadingLog> ReadingLogs => Set<ReadingLog>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitLog> HabitLogs => Set<HabitLog>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<FileItem> FileItems => Set<FileItem>();
    public DbSet<UserSetting> UserSettings => Set<UserSetting>();
    public DbSet<CustomApp> CustomApps => Set<CustomApp>();
    public DbSet<Whiteboard> Whiteboards => Set<Whiteboard>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserSetting>()
            .HasKey(s => s.Key);

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

        modelBuilder.Entity<Asset>()
            .HasOne(a => a.Currency)
            .WithMany()
            .HasForeignKey(a => a.CurrencyId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Debt>()
            .HasOne(d => d.Currency)
            .WithMany()
            .HasForeignKey(d => d.CurrencyId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.Date);

        modelBuilder.Entity<MonthlyBudget>()
            .HasIndex(b => new { b.Year, b.Month });

        modelBuilder.Entity<Note>()
            .HasIndex(n => n.UpdatedAt);

        modelBuilder.Entity<Note>()
            .HasIndex(n => new { n.NotebookId, n.UpdatedAt });

        modelBuilder.Entity<Thought>()
            .HasOne(t => t.Collection)
            .WithMany()
            .HasForeignKey(t => t.CollectionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Thought>()
            .HasIndex(t => t.CollectionId);

        modelBuilder.Entity<Thought>()
            .HasIndex(t => new { t.IsPinned, t.CreatedAt });

        modelBuilder.Entity<Thought>()
            .HasIndex(t => t.CreatedAt);

        modelBuilder.Entity<HabitLog>()
            .HasIndex(l => new { l.HabitId, l.Date });

        modelBuilder.Entity<Folder>()
            .HasIndex(f => new { f.ParentId, f.Name });

        modelBuilder.Entity<FileItem>()
            .HasIndex(fi => new { fi.FolderId, fi.Name });

        modelBuilder.Entity<TaskItem>()
            .HasIndex(t => new { t.Status, t.Order, t.CreatedAt });

        modelBuilder.Entity<TaskItem>()
            .HasIndex(t => new { t.Order, t.CreatedAt });

        modelBuilder.Entity<AssetSnapshot>()
            .HasIndex(s => s.RecordedAt);

        modelBuilder.Entity<DebtSnapshot>()
            .HasIndex(s => s.RecordedAt);
    }
}
