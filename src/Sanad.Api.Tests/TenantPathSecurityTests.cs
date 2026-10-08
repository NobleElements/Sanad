using System;
using System.IO;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sanad.Api.Data;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Sanad.Api.Utils;
using Xunit;

namespace Sanad.Api.Tests;

/// <summary>
/// Usernames become folder names under a datastore, so they must never be able to point at another
/// tenant's folder or escape the datastore.
/// </summary>
public class TenantPathSecurityTests
{
    private record SetupRequest(string Username, string Password);

    [Theory]
    [InlineData("alice")]
    [InlineData("john.doe")]
    [InlineData("dev_user-2")]
    [InlineData("A")]
    public void IsValidUsername_AcceptsPlainNames(string username)
    {
        Assert.True(FileUtils.IsValidUsername(username));
    }

    [Theory]
    [InlineData("")]
    [InlineData(".")]
    [InlineData("..")]
    [InlineData("x/../alice")]
    [InlineData("..\\alice")]
    [InlineData("/tmp/evil")]
    [InlineData("C:\\evil")]
    [InlineData(".hidden")]
    [InlineData("alice.")]
    [InlineData("al ice")]
    [InlineData("alice\0")]
    public void IsValidUsername_RejectsNamesThatCouldFormAPath(string username)
    {
        Assert.False(FileUtils.IsValidUsername(username));
    }

    [Fact]
    public void IsValidUsername_RejectsNamesLongerThan64Characters()
    {
        Assert.True(FileUtils.IsValidUsername(new string('a', 64)));
        Assert.False(FileUtils.IsValidUsername(new string('a', 65)));
    }

    [Theory]
    [InlineData("..")]
    [InlineData(".")]
    [InlineData("../alice")]
    [InlineData("x/../../etc")]
    [InlineData("/etc/passwd")]
    [InlineData("")]
    [InlineData(null)]
    public void ResolveChildPath_RejectsAnythingButADirectChild(string? childName)
    {
        using var parent = new DisposableTempDirectory();
        Assert.Null(FileUtils.ResolveChildPath(parent.Path, childName));
    }

    [Fact]
    public void ResolveChildPath_ReturnsFullPathOfDirectChild()
    {
        using var parent = new DisposableTempDirectory();
        Assert.Equal(Path.GetFullPath(Path.Combine(parent.Path, "alice")), FileUtils.ResolveChildPath(parent.Path, "alice"));
    }

    [Fact]
    public void TenantProvider_ResolvesUserFolderInsideTheirDatastore()
    {
        using var datastore = new DisposableTempDirectory();
        using var host = new TenantTestHost(datastore.Path, "alice");
        using var scope = host.Services.CreateScope();
        var tenantProvider = scope.ServiceProvider.GetRequiredService<TenantProvider>();
        tenantProvider.SetOverrideUsername("alice");

        Assert.Equal(Path.GetFullPath(Path.Combine(datastore.Path, "alice")), tenantProvider.GetTenantBasePath());
    }

    [Theory]
    [InlineData("x/../alice")]
    [InlineData("..")]
    [InlineData("/tmp/evil")]
    public void TenantProvider_RefusesUsernamesThatEscapeTheirFolder(string username)
    {
        using var datastore = new DisposableTempDirectory();
        using var host = new TenantTestHost(datastore.Path, username);
        using var scope = host.Services.CreateScope();
        var tenantProvider = scope.ServiceProvider.GetRequiredService<TenantProvider>();
        tenantProvider.SetOverrideUsername(username);

        Assert.Throws<InvalidOperationException>(() => tenantProvider.GetTenantBasePath());
        Assert.Throws<InvalidOperationException>(() => tenantProvider.GetConnectionString());
    }

    [Theory]
    [InlineData("../alice")]
    [InlineData("x/../alice")]
    [InlineData("/tmp/evil")]
    [InlineData("..")]
    [InlineData("alice.")]
    public async Task Signup_RejectsUsernamesThatCouldFormAPath(string dangerousUsername)
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/signup", new SetupRequest(dangerousUsername, "SecurePass123!"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        Assert.Equal(0, await adminDb.Users.CountAsync());
    }

    private sealed class TenantTestHost : IDisposable
    {
        public ServiceProvider Services { get; }
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public TenantTestHost(string datastorePath, string username)
        {
            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:;Foreign Keys=True;Pooling=False");
            _connection.Open();

            var services = new ServiceCollection();
            services.AddDbContext<AdminDbContext>(options => options.UseSqlite(_connection));
            services.AddHttpContextAccessor();
            services.AddScoped<TenantProvider>();
            Services = services.BuildServiceProvider();

            using var scope = Services.CreateScope();
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            adminDb.Database.EnsureCreated();
            var datastore = new Datastore { Id = 50, Name = "Test", Path = datastorePath };
            adminDb.Datastores.Add(datastore);
            if (!adminDb.Tiers.Any())
            {
                adminDb.Tiers.Add(new StorageTier { Id = 1, Name = "Free", DiskLimitBytes = 1_000_000_000L });
            }
            adminDb.Users.Add(new AppUser { Id = Guid.NewGuid(), Username = username, Datastore = datastore, TierId = 1 });
            adminDb.SaveChanges();
        }

        public void Dispose()
        {
            Services.Dispose();
            _connection.Dispose();
        }
    }
}
