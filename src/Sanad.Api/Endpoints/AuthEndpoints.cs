using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;
using System.Security.Claims;
using BCryptLib = BCrypt.Net.BCrypt;

namespace Sanad.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/status", async (SanadDbContext db, HttpContext context) =>
        {
            var usersExist = await db.Users.AnyAsync();
            if (!usersExist)
            {
                return Results.Ok(new { setupRequired = true, authenticated = false });
            }

            var authenticated = context.User.Identity?.IsAuthenticated ?? false;
            if (authenticated)
            {
                var username = context.User.Identity?.Name;
                return Results.Ok(new { setupRequired = false, authenticated = true, username });
            }

            return Results.Ok(new { setupRequired = false, authenticated = false });
        }).AllowAnonymous();

        group.MapPost("/setup", async (SanadDbContext db, HttpContext context, SetupRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest("Username and password are required.");
            }

            var usersExist = await db.Users.AnyAsync();
            if (usersExist)
            {
                return Results.BadRequest("Setup has already been completed.");
            }

            var user = new User
            {
                Username = request.Username,
                PasswordHash = BCryptLib.HashPassword(request.Password)
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            await SignInUser(context, user);

            return Results.Ok(new { message = "Setup completed successfully", username = user.Username });
        }).AllowAnonymous();

        group.MapPost("/login", async (SanadDbContext db, HttpContext context, LoginRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest("Username and password are required.");
            }

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (user == null || !BCryptLib.Verify(request.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            await SignInUser(context, user);

            return Results.Ok(new { message = "Logged in successfully", username = user.Username });
        }).AllowAnonymous();

        group.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok(new { message = "Logged out successfully" });
        });
    }

    private static async Task SignInUser(HttpContext context, User user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        var authProperties = new AuthenticationProperties
        {
            IsPersistent = true, // Session doesn't expire quickly
        };

        await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, authProperties);
    }
}

public record SetupRequest(string Username, string Password);
public record LoginRequest(string Username, string Password);
