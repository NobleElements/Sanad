using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Endpoints;

public static class BookEndpoints
{
    public static void MapBookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/books");

        group.MapGet("/search", async (string query) =>
        {
            var httpClient = new HttpClient();
            var url = $"https://openlibrary.org/search.json?q={Uri.EscapeDataString(query)}&limit=10";
            var response = await httpClient.GetFromJsonAsync<OpenLibraryResponse>(url);
            
            var results = response?.Docs?.Select(d => new 
            {
                Title = d.Title,
                Author = d.Author_name?.FirstOrDefault() ?? "Unknown",
                ExternalApiId = d.Key,
                CoverUrl = d.Cover_i != null ? $"https://covers.openlibrary.org/b/id/{d.Cover_i}-L.jpg" : null,
                TotalPages = d.Number_of_pages_median ?? 0
            }).ToList();

            return Results.Ok(results ?? new object());
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
    }

    private class OpenLibraryResponse
    {
        public List<OpenLibraryDoc>? Docs { get; set; }
    }

    private class OpenLibraryDoc
    {
        public string? Title { get; set; }
        public List<string>? Author_name { get; set; }
        public string? Key { get; set; }
        public int? Cover_i { get; set; }
        public int? Number_of_pages_median { get; set; }
    }
}
