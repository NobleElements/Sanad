using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Sanad.Api.Data;
using Xunit;

namespace Sanad.Api.Tests;

public class AuthIntegrationTests
{
    private record SetupRequest(string Username, string Password);
    private record LoginRequest(string Username, string Password);

    [Fact]
    public async Task Signup_FirstUserIsAdmin_SecondUserIsNotAdmin()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        // 1. First user signup -> Must be Admin
        var firstResponse = await client.PostAsJsonAsync("/api/auth/signup", new SetupRequest("admin_user", "Password123!"));
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        var firstJson = await firstResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(firstJson.GetProperty("isAdmin").GetBoolean());
        Assert.Equal("admin_user", firstJson.GetProperty("username").GetString());

        // 2. Second user signup -> Must NOT be Admin
        var secondResponse = await client.PostAsJsonAsync("/api/auth/signup", new SetupRequest("regular_user", "Password123!"));
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);

        var secondJson = await secondResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(secondJson.GetProperty("isAdmin").GetBoolean());
        Assert.Equal("regular_user", secondJson.GetProperty("username").GetString());
    }

    [Fact]
    public async Task Signup_DuplicateUsername_ReturnsBadRequest()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/auth/signup", new SetupRequest("duplicate_user", "Pass123!"));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var duplicate = await client.PostAsJsonAsync("/api/auth/signup", new SetupRequest("duplicate_user", "DifferentPass!"));
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [Fact]
    public async Task Signup_EmptyCredentials_ReturnsBadRequest()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var res1 = await client.PostAsJsonAsync("/api/auth/signup", new SetupRequest("", "Pass123!"));
        Assert.Equal(HttpStatusCode.BadRequest, res1.StatusCode);

        var res2 = await client.PostAsJsonAsync("/api/auth/signup", new SetupRequest("valid_user", "   "));
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_SetsAuthCookie_AndStatusReturnsAuthenticated()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SignupAsync("alice", "SecurePass123!");

        // Fresh client: signup's cookie must not be what authenticates the status call.
        var client = factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("alice", "SecurePass123!"));
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        var statusJson = await client.GetFromJsonAsync<JsonElement>("/api/auth/status");
        Assert.True(statusJson.GetProperty("authenticated").GetBoolean());
        Assert.Equal("alice", statusJson.GetProperty("username").GetString());
    }

    [Fact]
    public async Task Login_InvalidPasswordOrUnknownUser_ReturnsUnauthorized()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SignupAsync("bob", "CorrectPass123!");
        var client = factory.CreateClient();

        var wrongPassRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("bob", "WrongPassword!"));
        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassRes.StatusCode);

        var unknownUserRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("nobody", "CorrectPass123!"));
        Assert.Equal(HttpStatusCode.Unauthorized, unknownUserRes.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/tasks")).StatusCode);
    }

    [Fact]
    public async Task Login_BlockedUser_IsRejected()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SignupAsync("blocked");
        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            adminDb.Users.Single(u => u.Username == "blocked").IsBlocked = true;
            await adminDb.SaveChangesAsync();
        }

        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("blocked", CustomWebApplicationFactory.DefaultPassword));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/tasks")).StatusCode);
    }

    [Fact]
    public async Task Logout_EndsTheSession()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SignupAsync("leaver");
        using var client = await factory.LoginAsync("leaver");
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/tasks")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/auth/logout", null)).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/tasks")).StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoints_WithoutAuth_ReturnUnauthorized()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        // Anonymous call to protected task endpoint
        var taskRes = await client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, taskRes.StatusCode);

        // Anonymous call to protected thoughts endpoint
        var thoughtRes = await client.GetAsync("/api/thoughts");
        Assert.Equal(HttpStatusCode.Unauthorized, thoughtRes.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoints_EnforceAuthorizationBoundary()
    {
        using var factory = new CustomWebApplicationFactory();

        // 1. Anonymous user accessing admin endpoints -> 401 Unauthorized
        using var anonymous = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/users")).StatusCode);

        // 2. First user becomes admin, second is a regular user
        Assert.True((await factory.SignupAsync("admin_boss")).GetProperty("isAdmin").GetBoolean());
        Assert.False((await factory.SignupAsync("regular_joe")).GetProperty("isAdmin").GetBoolean());

        // 3. Regular user accessing admin endpoints -> 403 Forbidden
        using var joe = await factory.LoginAsync("regular_joe");
        Assert.Equal(HttpStatusCode.Forbidden, (await joe.GetAsync("/api/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joe.GetAsync("/api/admin/datastores")).StatusCode);

        // 4. Admin user accessing admin endpoints -> 200 OK
        using var admin = await factory.LoginAsync("admin_boss");
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/admin/users")).StatusCode);
    }
}
