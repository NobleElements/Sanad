using System.Text.Json.Nodes;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class PaddleWebhookEndpoints
{
    public static void MapPaddleWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/webhooks/paddle", async (HttpContext context, AdminDbContext db) =>
        {
            var body = await new StreamReader(context.Request.Body).ReadToEndAsync();
            
            var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
            if (settings.TryGetValue("PaddleWebhookSecret", out var secret) && !string.IsNullOrEmpty(secret))
            {
                var signatureHeader = context.Request.Headers["Paddle-Signature"].ToString();
                if (string.IsNullOrEmpty(signatureHeader)) return Results.BadRequest("Missing Signature");

                var parts = signatureHeader.Split(';');
                string ts = "";
                string h1 = "";
                foreach (var part in parts)
                {
                    if (part.StartsWith("ts=")) ts = part.Substring(3);
                    if (part.StartsWith("h1=")) h1 = part.Substring(3);
                }

                if (string.IsNullOrEmpty(ts) || string.IsNullOrEmpty(h1)) return Results.BadRequest("Invalid Signature Format");

                var signedPayload = $"{ts}:{body}";
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
                var computedHashHex = Convert.ToHexString(computedHash).ToLowerInvariant();

                if (computedHashHex != h1) return Results.BadRequest("Signature Mismatch");
            }

            var payload = JsonNode.Parse(body);
            if (payload == null) return Results.BadRequest();

            var eventType = payload["event_type"]?.ToString();
            var data = payload["data"];
            if (data == null) return Results.Ok();

            // We identify the user by a custom_data field which we should pass during checkout
            var customData = data["custom_data"];
            var userIdStr = customData?["userId"]?.ToString();
            
            Guid userId = Guid.Empty;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out userId))
            {
                // Try getting from customer if we already have it
                var customerId = data["customer_id"]?.ToString();
                if (!string.IsNullOrEmpty(customerId))
                {
                    var existingUser = await db.Users.FirstOrDefaultAsync(u => u.PaddleCustomerId == customerId);
                    if (existingUser != null)
                    {
                        userId = existingUser.Id;
                    }
                }
            }

            if (userId == Guid.Empty) return Results.Ok();

            var user = await db.Users.FindAsync(userId);
            if (user == null) return Results.Ok();

            if (eventType == "transaction.completed")
            {
                // Link customer and subscription IDs
                var customerId = data["customer_id"]?.ToString();
                var subId = data["subscription_id"]?.ToString();

                if (!string.IsNullOrEmpty(customerId)) user.PaddleCustomerId = customerId;
                if (!string.IsNullOrEmpty(subId)) user.PaddleSubscriptionId = subId;

                var items = data["items"]?.AsArray();
                if (items != null && items.Count > 0)
                {
                    var price = items[0]?["price"];
                    var priceId = price?["id"]?.ToString();

                    if (!string.IsNullOrEmpty(priceId))
                    {
                        var tier = await db.Tiers.FirstOrDefaultAsync(t => t.PaddlePriceId == priceId);
                        if (tier != null && tier.Id != user.TierId)
                        {
                            db.SubscriptionHistories.Add(new SubscriptionHistory
                            {
                                UserId = user.Id,
                                TierId = user.TierId,
                                StartedAt = user.TierStartedAt,
                                EndedAt = DateTime.UtcNow
                            });

                            user.TierId = tier.Id;
                            user.TierStartedAt = DateTime.UtcNow;
                            user.TierExpiresAt = DateTime.UtcNow.AddYears(1).AddDays(3); // Default annual expiry
                            user.PaddleSubscriptionStatus = "active";
                        }
                    }
                }
            }
            else if (eventType == "subscription.created" || eventType == "subscription.updated")
            {
                user.PaddleSubscriptionId = data["id"]?.ToString();
                user.PaddleCustomerId = data["customer_id"]?.ToString();
                user.PaddleSubscriptionStatus = data["status"]?.ToString();

                var items = data["items"]?.AsArray();
                if (items != null && items.Count > 0)
                {
                    var price = items[0]?["price"];
                    var priceId = price?["id"]?.ToString();

                    if (!string.IsNullOrEmpty(priceId))
                    {
                        var tier = await db.Tiers.FirstOrDefaultAsync(t => t.PaddlePriceId == priceId);
                        if (tier != null && tier.Id != user.TierId)
                        {
                            db.SubscriptionHistories.Add(new SubscriptionHistory
                            {
                                UserId = user.Id,
                                TierId = user.TierId,
                                StartedAt = user.TierStartedAt,
                                EndedAt = DateTime.UtcNow
                            });

                            user.TierId = tier.Id;
                            user.TierStartedAt = DateTime.UtcNow;
                            
                            // If it's a monthly subscription, set expiry roughly
                            var nextBilledAt = data["next_billed_at"]?.ToString();
                            if (DateTime.TryParse(nextBilledAt, out var nextBillingDate))
                            {
                                user.TierExpiresAt = nextBillingDate.ToUniversalTime().AddDays(3); // Add a small grace period
                            }
                            else
                            {
                                user.TierExpiresAt = DateTime.UtcNow.AddMonths(1).AddDays(3);
                            }
                        }
                        else if (tier != null && tier.Id == user.TierId)
                        {
                            // Update expiry
                            var nextBilledAt = data["next_billed_at"]?.ToString();
                            if (DateTime.TryParse(nextBilledAt, out var nextBillingDate))
                            {
                                user.TierExpiresAt = nextBillingDate.ToUniversalTime().AddDays(3);
                            }
                        }
                    }
                }
            }
            else if (eventType == "subscription.canceled")
            {
                user.PaddleSubscriptionStatus = "canceled";
                
                db.SubscriptionHistories.Add(new SubscriptionHistory
                {
                    UserId = user.Id,
                    TierId = user.TierId,
                    StartedAt = user.TierStartedAt,
                    EndedAt = DateTime.UtcNow
                });
                
                user.TierId = 1; // Free tier
                user.TierStartedAt = DateTime.UtcNow;
                user.TierExpiresAt = null;
            }

            await db.SaveChangesAsync();
            return Results.Ok();
        }).AllowAnonymous();
    }
}
