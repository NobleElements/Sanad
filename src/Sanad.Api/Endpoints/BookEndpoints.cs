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
            httpClient.DefaultRequestHeaders.Add("User-Agent", "SanadApp/1.0");
            
            var aggregatedResults = new List<object>();

            // 1. Try Google Books
            try 
            {
                var url = $"https://www.googleapis.com/books/v1/volumes?q={Uri.EscapeDataString(query)}&maxResults=5";
                var response = await httpClient.GetFromJsonAsync<GoogleBooksResponse>(url);
                
                if (response?.Items != null)
                {
                    aggregatedResults.AddRange(response.Items.Select(i => new 
                    {
                        Title = i.VolumeInfo?.Title ?? "Unknown",
                        Author = i.VolumeInfo?.Authors?.FirstOrDefault() ?? "Unknown",
                        ExternalApiId = i.Id,
                        CoverUrl = i.VolumeInfo?.ImageLinks?.Thumbnail?.Replace("http:", "https:"),
                        TotalPages = i.VolumeInfo?.PageCount ?? 0,
                        Source = "Google Books"
                    }));
                }
            }
            catch { }

            // 2. Try OpenLibrary
            try 
            {
                var openLibUrl = $"https://openlibrary.org/search.json?q={Uri.EscapeDataString(query)}&limit=5";
                var openLibResponse = await httpClient.GetFromJsonAsync<OpenLibraryResponse>(openLibUrl);
                
                if (openLibResponse?.Docs != null)
                {
                    aggregatedResults.AddRange(openLibResponse.Docs.Select(d => new 
                    {
                        Title = d.Title,
                        Author = d.Author_name?.FirstOrDefault() ?? "Unknown",
                        ExternalApiId = d.Key,
                        CoverUrl = d.Cover_i != null ? $"https://covers.openlibrary.org/b/id/{d.Cover_i}-L.jpg" : null,
                        TotalPages = d.Number_of_pages_median ?? 0,
                        Source = "OpenLibrary"
                    }));
                }
            }
            catch { }

            // 3. Try Apple Books (iTunes API - Great for international/Arabic books)
            try 
            {
                var itunesUrl = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(query)}&entity=ebook&limit=5";
                var itunesResponse = await httpClient.GetFromJsonAsync<ITunesResponse>(itunesUrl);
                
                if (itunesResponse?.Results != null)
                {
                    aggregatedResults.AddRange(itunesResponse.Results.Select(r => new 
                    {
                        Title = r.TrackName ?? "Unknown",
                        Author = r.ArtistName ?? "Unknown",
                        ExternalApiId = r.TrackId.ToString(),
                        CoverUrl = r.ArtworkUrl100?.Replace("100x100bb", "600x600bb"), // Higher resolution
                        TotalPages = 0, // Apple Books doesn't provide page counts
                        Source = "Apple Books"
                    }));
                }
            }
            catch { }

            return Results.Ok(aggregatedResults);
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

    private class ITunesResponse
    {
        public List<ITunesResult>? Results { get; set; }
    }

    private class ITunesResult
    {
        public string? TrackName { get; set; }
        public string? ArtistName { get; set; }
        public long TrackId { get; set; }
        public string? ArtworkUrl100 { get; set; }
    }
}
