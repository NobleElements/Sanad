using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class BookEndpoints
{
    public static void MapBookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/books");

        group.MapGet("/search", async (string query, Services.IBookSearchService searchService) =>
        {
            var results = await searchService.SearchBooksAsync(query);
            return Results.Ok(results);
        });

        group.MapGet("/cover", async (string url) =>
        {
            try 
            {
                var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("User-Agent", "SanadApp/1.0");
                var response = await httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return Results.NotFound();

                var contentType = response.Content.Headers.ContentType?.ToString() ?? "image/jpeg";
                var stream = await response.Content.ReadAsByteArrayAsync();
                
                return Results.File(stream, contentType);
            }
            catch (Exception)
            {
                return Results.NotFound();
            }
        });

        group.MapPost("/", async (SanadDbContext db, Book book) =>
        {
            db.Books.Add(book);
            await db.SaveChangesAsync();
            return Results.Created($"/api/books/{book.Id}", book);
        });

        group.MapGet("/", async (SanadDbContext db) =>
        {
            var books = await db.Books.OrderByDescending(b => b.CreatedAt).ToListAsync();
            return Results.Ok(books);
        });

        group.MapPut("/{id}", async (int id, SanadDbContext db, Book updatedBook) =>
        {
            var book = await db.Books.FindAsync(id);
            if (book == null) return Results.NotFound();

            book.Title = updatedBook.Title;
            book.Author = updatedBook.Author;
            book.CoverUrl = updatedBook.CoverUrl;
            book.TotalPages = updatedBook.TotalPages;

            await db.SaveChangesAsync();
            return Results.Ok(book);
        });

        group.MapDelete("/{id}", async (int id, SanadDbContext db) =>
        {
            var book = await db.Books.FindAsync(id);
            if (book == null) return Results.NotFound();

            db.Books.Remove(book);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }}
