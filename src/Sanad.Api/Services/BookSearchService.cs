namespace Sanad.Api.Services;

public class BookSearchResult
{
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? ExternalApiId { get; set; }
    public string? CoverUrl { get; set; }
    public int TotalPages { get; set; }
    public string Source { get; set; } = string.Empty;
}

public interface IBookSearchService
{
    Task<List<BookSearchResult>> SearchBooksAsync(string query);
}

public class BookSearchService : IBookSearchService
{
    private readonly HttpClient _httpClient;

    public BookSearchService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "SanadApp/1.0");
    }

    public async Task<List<BookSearchResult>> SearchBooksAsync(string query)
    {
        var aggregatedResults = new List<BookSearchResult>();

        // 1. Try Google Books
        try 
        {
            var url = $"https://www.googleapis.com/books/v1/volumes?q={Uri.EscapeDataString(query)}&maxResults=5";
            using var responseMessage = await _httpClient.GetAsync(url);
            if (responseMessage.IsSuccessStatusCode)
            {
                var content = await responseMessage.Content.ReadAsStringAsync();
                var response = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(content);
                if (response.TryGetProperty("items", out var items))
                {
                    foreach (var item in items.EnumerateArray())
                    {
                        var volInfo = item.GetProperty("volumeInfo");
                        aggregatedResults.Add(new BookSearchResult
                        {
                            Title = volInfo.TryGetProperty("title", out var title) ? title.GetString() ?? "Unknown" : "Unknown",
                            Author = volInfo.TryGetProperty("authors", out var authors) && authors.GetArrayLength() > 0 ? authors[0].GetString() ?? "Unknown" : "Unknown",
                            ExternalApiId = item.TryGetProperty("id", out var id) ? id.GetString() : null,
                            CoverUrl = volInfo.TryGetProperty("imageLinks", out var images) && images.TryGetProperty("thumbnail", out var thumb) ? thumb.GetString()?.Replace("http:", "https:") : null,
                            TotalPages = volInfo.TryGetProperty("pageCount", out var pages) ? pages.GetInt32() : 0,
                            Source = "Google Books"
                        });
                    }
                }
            }
        }
        catch { }

        // 2. Try OpenLibrary
        try 
        {
            var openLibUrl = $"https://openlibrary.org/search.json?q={Uri.EscapeDataString(query)}&limit=5";
            using var responseMessage = await _httpClient.GetAsync(openLibUrl);
            if (responseMessage.IsSuccessStatusCode)
            {
                var content = await responseMessage.Content.ReadAsStringAsync();
                var openLibResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(content);
                if (openLibResponse.TryGetProperty("docs", out var docs))
                {
                    foreach (var doc in docs.EnumerateArray())
                    {
                        aggregatedResults.Add(new BookSearchResult
                        {
                            Title = doc.TryGetProperty("title", out var title) ? title.GetString() ?? "Unknown" : "Unknown",
                            Author = doc.TryGetProperty("author_name", out var authors) && authors.GetArrayLength() > 0 ? authors[0].GetString() ?? "Unknown" : "Unknown",
                            ExternalApiId = doc.TryGetProperty("key", out var key) ? key.GetString() : null,
                            CoverUrl = doc.TryGetProperty("cover_i", out var cover) ? $"https://covers.openlibrary.org/b/id/{cover.GetInt32()}-L.jpg" : null,
                            TotalPages = doc.TryGetProperty("number_of_pages_median", out var pages) ? pages.GetInt32() : 0,
                            Source = "OpenLibrary"
                        });
                    }
                }
            }
        }
        catch { }

        // 3. Try Apple Books
        try 
        {
            var itunesUrl = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(query)}&entity=ebook&limit=5";
            using var responseMessage = await _httpClient.GetAsync(itunesUrl);
            if (responseMessage.IsSuccessStatusCode)
            {
                var content = await responseMessage.Content.ReadAsStringAsync();
                var itunesResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(content);
                if (itunesResponse.TryGetProperty("results", out var results))
                {
                    foreach (var r in results.EnumerateArray())
                    {
                        aggregatedResults.Add(new BookSearchResult
                        {
                            Title = r.TryGetProperty("trackName", out var track) ? track.GetString() ?? "Unknown" : "Unknown",
                            Author = r.TryGetProperty("artistName", out var artist) ? artist.GetString() ?? "Unknown" : "Unknown",
                            ExternalApiId = r.TryGetProperty("trackId", out var id) ? id.GetInt64().ToString() : null,
                            CoverUrl = r.TryGetProperty("artworkUrl100", out var art) ? art.GetString()?.Replace("100x100bb", "600x600bb") : null,
                            TotalPages = 0,
                            Source = "Apple Books"
                        });
                    }
                }
            }
        }
        catch { }

        return aggregatedResults;
    }
}
