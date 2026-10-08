using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Sanad.Api.Data;
using Xunit;

namespace Sanad.Api.Tests;

/// <summary>
/// Every request here goes through a client without cookies: signup logs the browser in, and a
/// leftover auth cookie would otherwise make these pass even if API-key auth were broken.
/// </summary>
public class ApiKeyAuthIntegrationTests
{
    [Fact]
    public async Task ApiKeyAuth_ValidXApiKeyHeader_AllowsAccessToProtectedEndpoints()
    {
        using var factory = new CustomWebApplicationFactory();
        var apiKey = (await factory.SignupAsync("dev_user")).GetProperty("apiKey").GetString();
        Assert.False(string.IsNullOrWhiteSpace(apiKey));

        using var client = factory.CreateCookielessClient();
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(WithApiKeyHeader(HttpMethod.Get, "/api/tasks", apiKey!))).StatusCode);
    }

    [Fact]
    public async Task ApiKeyAuth_ValidBearerToken_AllowsAccessToProtectedEndpoints()
    {
        using var factory = new CustomWebApplicationFactory();
        var apiKey = (await factory.SignupAsync("bearer_user")).GetProperty("apiKey").GetString();

        using var client = factory.CreateCookielessClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/thoughts");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task ApiKeyAuth_InvalidApiKey_ReturnsUnauthorized()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateCookielessClient();

        var response = await client.SendAsync(WithApiKeyHeader(HttpMethod.Get, "/api/tasks", "totally-invalid-api-key"));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ApiKeyAuth_RerolledKey_ReplacesTheOldOne()
    {
        using var factory = new CustomWebApplicationFactory();
        var oldKey = (await factory.SignupAsync("reroll_user")).GetProperty("apiKey").GetString()!;

        using var client = factory.CreateCookielessClient();
        var reroll = await client.SendAsync(WithApiKeyHeader(HttpMethod.Post, "/api/auth/api-key/reroll", oldKey));
        Assert.Equal(HttpStatusCode.OK, reroll.StatusCode);
        var newKey = (await reroll.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("apiKey").GetString()!;
        Assert.NotEqual(oldKey, newKey);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(WithApiKeyHeader(HttpMethod.Get, "/api/tasks", oldKey))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(WithApiKeyHeader(HttpMethod.Get, "/api/tasks", newKey))).StatusCode);
    }

    [Fact]
    public async Task ApiKeyAuth_BlockedUser_IsRejected()
    {
        using var factory = new CustomWebApplicationFactory();
        var apiKey = (await factory.SignupAsync("blocked_user")).GetProperty("apiKey").GetString()!;

        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var user = adminDb.Users.Single(u => u.Username == "blocked_user");
            user.IsBlocked = true;
            await adminDb.SaveChangesAsync();
        }

        using var client = factory.CreateCookielessClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(WithApiKeyHeader(HttpMethod.Get, "/api/tasks", apiKey))).StatusCode);
    }

    private static HttpRequestMessage WithApiKeyHeader(HttpMethod method, string url, string apiKey)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Api-Key", apiKey);
        return request;
    }
}
