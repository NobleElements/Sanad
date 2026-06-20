using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;

namespace Sanad.Api.Endpoints;

public static class SubscriptionEndpoints
{
    public static void MapSubscriptionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/subscription").RequireAuthorization();

        group.MapPost("/verify-checkout", async (AdminDbContext db, Services.PaddleService paddleService, HttpContext context, VerifyCheckoutRequest req) =>
        {
            var username = context.User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

            if (string.IsNullOrEmpty(req.TransactionId)) return Results.BadRequest("Missing transactionId");

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Results.NotFound();

            var (custId, subId, priceId) = await paddleService.VerifyTransactionAsync(req.TransactionId);

            if (string.IsNullOrEmpty(custId) || string.IsNullOrEmpty(priceId))
            {
                return Results.BadRequest("Transaction could not be verified or is not completed.");
            }

            // Valid transaction, apply it
            user.PaddleCustomerId = custId;
            if (!string.IsNullOrEmpty(subId)) user.PaddleSubscriptionId = subId;

            var tier = await db.Tiers.FirstOrDefaultAsync(t => t.PaddlePriceId == priceId);
            if (tier != null && tier.Id != user.TierId)
            {
                db.SubscriptionHistories.Add(new Models.SubscriptionHistory
                {
                    UserId = user.Id,
                    TierId = user.TierId,
                    StartedAt = user.TierStartedAt,
                    EndedAt = DateTime.UtcNow
                });

                user.TierId = tier.Id;
                user.TierStartedAt = DateTime.UtcNow;
                user.TierExpiresAt = DateTime.UtcNow.AddYears(1).AddDays(3);
                user.PaddleSubscriptionStatus = "active";

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Checkout verified and tier updated." });
            }
            
            // If tier is same, just update customer ID and sub ID
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Checkout verified." });
        });

        group.MapPost("/cancel", async (AdminDbContext db, Services.PaddleService paddleService, HttpContext context) =>
        {
            var username = context.User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Results.NotFound();

            if (string.IsNullOrEmpty(user.PaddleSubscriptionId))
            {
                return Results.BadRequest("No active subscription found.");
            }

            try
            {
                await paddleService.CancelSubscriptionAsync(user.PaddleSubscriptionId);
                user.PaddleSubscriptionStatus = "canceled_pending"; // Will remain active until next billing cycle
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Subscription will be canceled at the end of the billing period." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapPost("/change-tier", async (AdminDbContext db, Services.PaddleService paddleService, HttpContext context, ChangeTierRequest req) =>
        {
            var username = context.User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

            var user = await db.Users.Include(u => u.Tier).FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Results.NotFound();

            if (string.IsNullOrEmpty(user.PaddleSubscriptionId))
            {
                return Results.BadRequest("No active subscription. Please checkout normally.");
            }

            var newTier = await db.Tiers.FindAsync(req.TierId);
            if (newTier == null || string.IsNullOrEmpty(newTier.PaddlePriceId))
            {
                return Results.BadRequest("Invalid tier or tier is not purchasable.");
            }

            var isUpgrade = newTier.Price > (user.Tier?.Price ?? 0);

            try
            {
                var actionRequiredUrl = await paddleService.ChangeSubscriptionTierAsync(user.PaddleSubscriptionId, newTier.PaddlePriceId, isUpgrade);

                // If upgrade, we apply immediately in DB. If downgrade, we wait for webhook.
                if (isUpgrade)
                {
                    db.SubscriptionHistories.Add(new Sanad.Api.Models.SubscriptionHistory
                    {
                        UserId = user.Id,
                        TierId = user.TierId,
                        StartedAt = user.TierStartedAt,
                        EndedAt = DateTime.UtcNow
                    });

                    user.TierId = newTier.Id;
                    user.TierStartedAt = DateTime.UtcNow;
                    // Keep the same expiration date or extend it depending on Paddle, but Paddle prorates to the same billing cycle usually.
                    await db.SaveChangesAsync();
                }

                return Results.Ok(new { message = isUpgrade ? "Tier upgraded successfully." : "Tier scheduled for downgrade at next billing cycle." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapGet("/transactions", async (AdminDbContext db, Services.PaddleService paddleService, HttpContext context) =>
        {
            var username = context.User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || string.IsNullOrEmpty(user.PaddleCustomerId)) return Results.Ok(new object[0]);

            var transactions = await paddleService.GetCustomerTransactionsAsync(user.PaddleCustomerId);
            return Results.Ok(transactions);
        });
    }
}

public class ChangeTierRequest
{
    public int TierId { get; set; }
}

public class VerifyCheckoutRequest
{
    public string TransactionId { get; set; } = string.Empty;
}
