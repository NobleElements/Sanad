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
            var url = $"https://www.googleapis.com/books/v1/volumes?q={Uri.EscapeDataString(query)}&maxResults=10";
            var response = await httpClient.GetFromJsonAsync<GoogleBooksResponse>(url);
            
            var results = response?.Items?.Select(i => new 
            {
                Title = i.VolumeInfo?.Title ?? "Unknown",
                Author = i.VolumeInfo?.Authors?.FirstOrDefault() ?? "Unknown",
                ExternalApiId = i.Id,
                CoverUrl = i.VolumeInfo?.ImageLinks?.Thumbnail?.Replace("http:", "https:"),
                TotalPages = i.VolumeInfo?.PageCount ?? 0
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

    private class GoogleBooksResponse
    {
        public List<GoogleBooksItem>? Items { get; set; }
    }

    private class GoogleBooksItem
    {
        public string? Id { get; set; }
        public GoogleBooksVolumeInfo? VolumeInfo { get; set; }
    }

    private class GoogleBooksVolumeInfo
    {
        public string? Title { get; set; }
        public List<string>? Authors { get; set; }
        public int? PageCount { get; set; }
        public GoogleBooksImageLinks? ImageLinks { get; set; }
    }

    private class GoogleBooksImageLinks
    {
        public string? Thumbnail { get; set; }
    }
}
