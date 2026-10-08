using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sanad.Api.Data;
using Sanad.Api.Endpoints;
using Sanad.Api.Models;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class PaddleBillingTests
{
    [Fact]
    public async Task PaddleService_VerifyConfigurationAsync_ValidatesConnection()
    {
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                Assert.Equal(HttpMethod.Get, req.Method);
                Assert.Contains("/products", req.RequestUri?.ToString());
                Assert.Equal("Bearer test_key", req.Headers.Authorization?.ToString());
                return new HttpResponseMessage(HttpStatusCode.OK);
            }
        };

        var (adminDb, connection) = TestDbContextFactory.CreateSqliteInMemoryAdminDbContext();
        using (connection)
        using (adminDb)
        {
            var httpClient = new HttpClient(mockHandler);
            var paddleService = new PaddleService(httpClient, adminDb);

            var result = await paddleService.VerifyConfigurationAsync("sandbox", "test_key");
            Assert.True(result);
        }
    }

    [Fact]
    public async Task PaddleService_CreateOrUpdateProductAsync_CreatesWhenNoExistingId()
    {
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                if (req.Method == HttpMethod.Post && req.RequestUri?.AbsolutePath == "/products")
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(
                            JsonSerializer.Serialize(new { data = new { id = "prod_new_123" } }),
                            Encoding.UTF8,
                            "application/json")
                    };
                }
                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }
        };

        var (adminDb, connection) = TestDbContextFactory.CreateSqliteInMemoryAdminDbContext();
        using (connection)
        using (adminDb)
        {
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleApiKey", Value = "pdl_key" });
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleEnvironment", Value = "sandbox" });
            await adminDb.SaveChangesAsync();

            var httpClient = new HttpClient(mockHandler);
            var paddleService = new PaddleService(httpClient, adminDb);

            var prodId = await paddleService.CreateOrUpdateProductAsync("Pro Plan", null);
            Assert.Equal("prod_new_123", prodId);
        }
    }

    [Fact]
    public async Task PaddleService_CreatePriceAsync_CalculatesAnnualCentsCorrectly()
    {
        string? capturedBody = null;
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                if (req.Method == HttpMethod.Post && req.RequestUri?.AbsolutePath == "/prices")
                {
                    capturedBody = req.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(
                            JsonSerializer.Serialize(new { data = new { id = "pri_annual_456" } }),
                            Encoding.UTF8,
                            "application/json")
                    };
                }
                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }
        };

        var (adminDb, connection) = TestDbContextFactory.CreateSqliteInMemoryAdminDbContext();
        using (connection)
        using (adminDb)
        {
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleApiKey", Value = "pdl_key" });
            await adminDb.SaveChangesAsync();

            var httpClient = new HttpClient(mockHandler);
            var paddleService = new PaddleService(httpClient, adminDb);

            // $5/month -> $60/year -> 6000 cents
            var priceId = await paddleService.CreatePriceAsync("prod_1", "Pro Plan", 5m);
            Assert.Equal("pri_annual_456", priceId);

            Assert.NotNull(capturedBody);
            var parsed = JsonNode.Parse(capturedBody);
            Assert.Equal("6000", parsed?["unit_price"]?["amount"]?.ToString());
            Assert.Equal("USD", parsed?["unit_price"]?["currency_code"]?.ToString());
            Assert.Equal("year", parsed?["billing_cycle"]?["interval"]?.ToString());
        }
    }

    [Fact]
    public async Task PaddleService_CancelSubscriptionAsync_SendsCorrectRequest()
    {
        HttpRequestMessage? sentRequest = null;
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                sentRequest = req;
                return new HttpResponseMessage(HttpStatusCode.OK);
            }
        };

        var (adminDb, connection) = TestDbContextFactory.CreateSqliteInMemoryAdminDbContext();
        using (connection)
        using (adminDb)
        {
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleApiKey", Value = "pdl_key" });
            await adminDb.SaveChangesAsync();

            var httpClient = new HttpClient(mockHandler);
            var paddleService = new PaddleService(httpClient, adminDb);

            await paddleService.CancelSubscriptionAsync("sub_cancel_789");

            Assert.NotNull(sentRequest);
            Assert.Equal(HttpMethod.Post, sentRequest.Method);
            Assert.Contains("/subscriptions/sub_cancel_789/cancel", sentRequest.RequestUri?.AbsolutePath);
        }
    }

    [Fact]
    public async Task PaddleService_VerifyTransactionAsync_ReturnsIdentifiersWhenCompleted()
    {
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                var payload = new
                {
                    data = new
                    {
                        id = "txn_123",
                        status = "completed",
                        customer_id = "ctm_999",
                        subscription_id = "sub_888",
                        items = new[]
                        {
                            new { price = new { id = "pri_pro_555" }, id = "item_1" }
                        }
                    }
                };

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };
            }
        };

        var (adminDb, connection) = TestDbContextFactory.CreateSqliteInMemoryAdminDbContext();
        using (connection)
        using (adminDb)
        {
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleApiKey", Value = "pdl_key" });
            await adminDb.SaveChangesAsync();

            var httpClient = new HttpClient(mockHandler);
            var paddleService = new PaddleService(httpClient, adminDb);

            var (custId, subId, priceId) = await paddleService.VerifyTransactionAsync("txn_123");
            Assert.Equal("ctm_999", custId);
            Assert.Equal("sub_888", subId);
            Assert.Equal("pri_pro_555", priceId);
        }
    }

    private static string ComputePaddleHash(string payload, string secret, long ts)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{ts}:{payload}"))).ToLowerInvariant();
    }

    private static string GeneratePaddleSignature(string payload, string secret, long? ts = null)
    {
        var timestamp = ts ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return $"ts={timestamp};h1={ComputePaddleHash(payload, secret, timestamp)}";
    }

    private static readonly DateTimeOffset SignatureNow = DateTimeOffset.FromUnixTimeSeconds(1_800_000_000);
    private const string SignatureBody = "{\"event_type\":\"transaction.completed\"}";
    private const string SignatureSecret = "whsec_test";

    [Fact]
    public void VerifySignature_AcceptsFreshValidSignature()
    {
        var header = GeneratePaddleSignature(SignatureBody, SignatureSecret, SignatureNow.ToUnixTimeSeconds());
        Assert.Null(PaddleWebhookEndpoints.VerifySignature(header, SignatureBody, SignatureSecret, SignatureNow));
    }

    [Theory]
    [InlineData(-301)]
    [InlineData(301)]
    public void VerifySignature_RejectsTimestampsOutsideTolerance(int offsetSeconds)
    {
        // A captured request replayed later (or a forged future timestamp) must not be accepted.
        var header = GeneratePaddleSignature(SignatureBody, SignatureSecret, SignatureNow.ToUnixTimeSeconds() + offsetSeconds);
        Assert.Equal("Signature Expired", PaddleWebhookEndpoints.VerifySignature(header, SignatureBody, SignatureSecret, SignatureNow));
    }

    [Fact]
    public void VerifySignature_RejectsTamperedBodyAndWrongSecret()
    {
        var header = GeneratePaddleSignature(SignatureBody, SignatureSecret, SignatureNow.ToUnixTimeSeconds());
        Assert.Equal("Signature Mismatch", PaddleWebhookEndpoints.VerifySignature(header, SignatureBody + " ", SignatureSecret, SignatureNow));
        Assert.Equal("Signature Mismatch", PaddleWebhookEndpoints.VerifySignature(header, SignatureBody, "other_secret", SignatureNow));
    }

    [Fact]
    public void VerifySignature_AcceptsAnyMatchingH1DuringSecretRotation()
    {
        var ts = SignatureNow.ToUnixTimeSeconds();
        var header = $"ts={ts};h1={ComputePaddleHash(SignatureBody, "old_secret", ts)};h1={ComputePaddleHash(SignatureBody, SignatureSecret, ts)}";
        Assert.Null(PaddleWebhookEndpoints.VerifySignature(header, SignatureBody, SignatureSecret, SignatureNow));
    }

    [Theory]
    [InlineData(null, "Missing Signature")]
    [InlineData("", "Missing Signature")]
    [InlineData("h1=abcd", "Invalid Signature Format")]
    [InlineData("ts=1800000000", "Invalid Signature Format")]
    [InlineData("ts=notanumber;h1=abcd", "Invalid Signature Format")]
    [InlineData("ts=1800000000;h1=not-hex", "Signature Mismatch")]
    public void VerifySignature_RejectsMalformedHeaders(string? header, string expectedError)
    {
        Assert.Equal(expectedError, PaddleWebhookEndpoints.VerifySignature(header, SignatureBody, SignatureSecret, SignatureNow));
    }

    [Fact]
    public async Task Webhook_RejectsEvents_WhenNoSecretIsConfigured()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        var userId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var tier2 = await adminDb.Tiers.FindAsync(2);
            Assert.NotNull(tier2);
            tier2.PaddlePriceId = "pri_tier2_test";
            adminDb.Users.Add(new AppUser { Id = userId, Username = "unsigned_target", PasswordHash = "hash", TierId = 1, DatastoreId = 1 });
            await adminDb.SaveChangesAsync();
        }

        // Unsigned "payment" that would upgrade the user if the endpoint failed open.
        var forgedBody = JsonSerializer.Serialize(new
        {
            event_type = "transaction.completed",
            data = new
            {
                customer_id = "ctm_forged",
                subscription_id = "sub_forged",
                custom_data = new { userId = userId.ToString() },
                items = new[] { new { price = new { id = "pri_tier2_test" } } }
            }
        });

        var response = await client.PostAsync("/api/webhooks/paddle", new StringContent(forgedBody, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var user = await adminDb.Users.FindAsync(userId);
            Assert.NotNull(user);
            Assert.Equal(1, user.TierId);
        }
    }

    [Fact]
    public async Task Webhook_FailsValidation_WhenSignatureInvalidOrMissing()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        // Seed secret in AdminDb
        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleWebhookSecret", Value = "my_secret_key" });
            await adminDb.SaveChangesAsync();
        }

        var json = JsonSerializer.Serialize(new { event_type = "subscription.canceled", data = new { } });

        // 1. Missing signature
        var missingSigResponse = await client.PostAsync("/api/webhooks/paddle",
            new StringContent(json, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, missingSigResponse.StatusCode);
        var err1 = await missingSigResponse.Content.ReadAsStringAsync();
        Assert.Contains("Missing Signature", err1);

        // 2. Mismatched signature
        var badSigRequest = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/paddle")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        badSigRequest.Headers.Add("Paddle-Signature", $"ts={DateTimeOffset.UtcNow.ToUnixTimeSeconds()};h1=0000000000000000000000000000000000000000000000000000000000000000");
        var badSigResponse = await client.SendAsync(badSigRequest);
        Assert.Equal(HttpStatusCode.BadRequest, badSigResponse.StatusCode);
        var err2 = await badSigResponse.Content.ReadAsStringAsync();
        Assert.Contains("Signature Mismatch", err2);
    }

    [Fact]
    public async Task Webhook_TransactionCompleted_UpgradesUserTierAndRecordsHistory()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var userId = Guid.NewGuid();
        const string secret = "my_webhook_secret";

        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleWebhookSecret", Value = secret });

            // Assign PaddlePriceId to Tier 2 (Supporter)
            var tier2 = await adminDb.Tiers.FindAsync(2);
            Assert.NotNull(tier2);
            tier2.PaddlePriceId = "pri_tier2_test";

            adminDb.Users.Add(new AppUser
            {
                Id = userId,
                Username = "subscriber_user",
                PasswordHash = "hash",
                TierId = 1,
                DatastoreId = 1,
                TierStartedAt = DateTime.UtcNow.AddMonths(-2),
                TierExpiresAt = null
            });

            await adminDb.SaveChangesAsync();
        }

        var webhookBody = JsonSerializer.Serialize(new
        {
            event_type = "transaction.completed",
            data = new
            {
                customer_id = "ctm_paddle_01",
                subscription_id = "sub_paddle_01",
                custom_data = new { userId = userId.ToString() },
                items = new[]
                {
                    new { price = new { id = "pri_tier2_test" } }
                }
            }
        });

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/paddle")
        {
            Content = new StringContent(webhookBody, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Paddle-Signature", GeneratePaddleSignature(webhookBody, secret));

        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify database updates
        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var updatedUser = await adminDb.Users.FindAsync(userId);
            Assert.NotNull(updatedUser);
            Assert.Equal(2, updatedUser.TierId);
            Assert.Equal("ctm_paddle_01", updatedUser.PaddleCustomerId);
            Assert.Equal("sub_paddle_01", updatedUser.PaddleSubscriptionId);
            Assert.Equal("active", updatedUser.PaddleSubscriptionStatus);
            Assert.NotNull(updatedUser.TierExpiresAt);

            var history = await adminDb.SubscriptionHistories.FirstOrDefaultAsync(h => h.UserId == userId);
            Assert.NotNull(history);
            Assert.Equal(1, history.TierId); // Old tier logged in history
        }
    }

    [Fact]
    public async Task Webhook_SubscriptionCanceled_RevertsUserToFreeTier()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var userId = Guid.NewGuid();
        const string secret = "my_webhook_secret_cancel";

        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            adminDb.SystemSettings.Add(new SystemSetting { Key = "PaddleWebhookSecret", Value = secret });

            adminDb.Users.Add(new AppUser
            {
                Id = userId,
                Username = "canceling_user",
                PasswordHash = "hash",
                TierId = 2,
                DatastoreId = 1,
                PaddleCustomerId = "ctm_cancel_01",
                PaddleSubscriptionId = "sub_cancel_01",
                PaddleSubscriptionStatus = "active",
                TierStartedAt = DateTime.UtcNow.AddMonths(-1),
                TierExpiresAt = DateTime.UtcNow.AddDays(10)
            });

            await adminDb.SaveChangesAsync();
        }

        var webhookBody = JsonSerializer.Serialize(new
        {
            event_type = "subscription.canceled",
            data = new
            {
                customer_id = "ctm_cancel_01",
                subscription_id = "sub_cancel_01"
            }
        });

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/paddle")
        {
            Content = new StringContent(webhookBody, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Paddle-Signature", GeneratePaddleSignature(webhookBody, secret));

        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify database updates
        using (var scope = factory.Services.CreateScope())
        {
            var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var updatedUser = await adminDb.Users.FindAsync(userId);
            Assert.NotNull(updatedUser);
            Assert.Equal(1, updatedUser.TierId); // Reverted to free tier
            Assert.Null(updatedUser.TierExpiresAt);
            Assert.Equal("canceled", updatedUser.PaddleSubscriptionStatus);

            var history = await adminDb.SubscriptionHistories.FirstOrDefaultAsync(h => h.UserId == userId);
            Assert.NotNull(history);
            Assert.Equal(2, history.TierId); // Pro tier logged in history
        }
    }
}
