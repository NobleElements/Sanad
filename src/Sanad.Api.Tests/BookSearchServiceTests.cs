using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.WebUtilities;
using Sanad.Api.Services;
using Xunit;

namespace Sanad.Api.Tests;

public class BookSearchServiceTests
{
    [Fact]
    public async Task SearchBooksAsync_AggregatesFromAllThreeProviders()
    {
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                var url = req.RequestUri?.ToString() ?? "";

                if (url.Contains("googleapis.com"))
                {
                    var googleResponse = new
                    {
                        items = new[]
                        {
                            new
                            {
                                id = "g_101",
                                volumeInfo = new
                                {
                                    title = "Domain-Driven Design",
                                    authors = new[] { "Eric Evans" },
                                    pageCount = 560,
                                    imageLinks = new
                                    {
                                        thumbnail = "http://books.google.com/cover.jpg"
                                    }
                                }
                            }
                        }
                    };
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(googleResponse), Encoding.UTF8, "application/json")
                    };
                }

                if (url.Contains("openlibrary.org"))
                {
                    var olResponse = new
                    {
                        docs = new[]
                        {
                            new
                            {
                                key = "/works/OL999W",
                                title = "Refactoring",
                                author_name = new[] { "Martin Fowler" },
                                cover_i = 8765432,
                                number_of_pages_median = 448
                            }
                        }
                    };
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(olResponse), Encoding.UTF8, "application/json")
                    };
                }

                if (url.Contains("itunes.apple.com"))
                {
                    var appleResponse = new
                    {
                        results = new[]
                        {
                            new
                            {
                                trackId = 123456789L,
                                trackName = "Design Patterns",
                                artistName = "Gang of Four",
                                artworkUrl100 = "https://mzstatic.com/cover/100x100bb.jpg"
                            }
                        }
                    };
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(appleResponse), Encoding.UTF8, "application/json")
                    };
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }
        };

        var httpClient = new HttpClient(mockHandler);
        var service = new BookSearchService(httpClient);

        var results = await service.SearchBooksAsync("software architecture");

        Assert.Equal(3, results.Count);

        // Verify Google Books item
        var googleBook = results.Find(b => b.Source == "Google Books");
        Assert.NotNull(googleBook);
        Assert.Equal("Domain-Driven Design", googleBook.Title);
        Assert.Equal("Eric Evans", googleBook.Author);
        Assert.Equal("g_101", googleBook.ExternalApiId);
        Assert.Equal(560, googleBook.TotalPages);
        Assert.Equal("https://books.google.com/cover.jpg", googleBook.CoverUrl); // upgraded to https

        // Verify OpenLibrary item
        var olBook = results.Find(b => b.Source == "OpenLibrary");
        Assert.NotNull(olBook);
        Assert.Equal("Refactoring", olBook.Title);
        Assert.Equal("Martin Fowler", olBook.Author);
        Assert.Equal("/works/OL999W", olBook.ExternalApiId);
        Assert.Equal(448, olBook.TotalPages);
        Assert.Equal("https://covers.openlibrary.org/b/id/8765432-L.jpg", olBook.CoverUrl);

        // Verify Apple Books item
        var appleBook = results.Find(b => b.Source == "Apple Books");
        Assert.NotNull(appleBook);
        Assert.Equal("Design Patterns", appleBook.Title);
        Assert.Equal("Gang of Four", appleBook.Author);
        Assert.Equal("123456789", appleBook.ExternalApiId);
        Assert.Equal("https://mzstatic.com/cover/600x600bb.jpg", appleBook.CoverUrl); // upgraded to 600x600bb
    }

    [Fact]
    public async Task SearchBooksAsync_SendsEscapedQueryAndResultLimitToEachProvider()
    {
        var mockHandler = new MockHttpMessageHandler();
        var service = new BookSearchService(new HttpClient(mockHandler));

        // '#' and '&' would truncate or split the query string if they weren't escaped
        const string query = "C# & .NET in depth";
        await service.SearchBooksAsync(query);

        Assert.Equal(3, mockHandler.RecordedRequests.Count);
        Assert.All(mockHandler.RecordedRequests, r => Assert.Equal(HttpMethod.Get, r.Method));
        Assert.All(mockHandler.RecordedRequests, r => Assert.Contains("C%23%20%26%20.NET%20in%20depth", r.RequestUri!.AbsoluteUri));

        var google = QueryOf(mockHandler, "www.googleapis.com");
        Assert.Equal(query, google["q"]);
        Assert.Equal("5", google["maxResults"]);

        var openLibrary = QueryOf(mockHandler, "openlibrary.org");
        Assert.Equal(query, openLibrary["q"]);
        Assert.Equal("5", openLibrary["limit"]);

        var apple = QueryOf(mockHandler, "itunes.apple.com");
        Assert.Equal(query, apple["term"]);
        Assert.Equal("ebook", apple["entity"]);
        Assert.Equal("5", apple["limit"]);
    }

    [Fact]
    public async Task SearchBooksAsync_SwallowsTransportExceptions_AndKeepsOtherProvidersResults()
    {
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                var url = req.RequestUri?.ToString() ?? "";

                // Network failure and timeout instead of an error response
                if (url.Contains("googleapis.com")) throw new HttpRequestException("connection refused");
                if (url.Contains("itunes.apple.com")) throw new TaskCanceledException("timed out");

                if (url.Contains("openlibrary.org"))
                {
                    var olResponse = new { docs = new[] { new { key = "/works/OL1W", title = "Clean Code", author_name = new[] { "Robert C. Martin" } } } };
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(olResponse), Encoding.UTF8, "application/json")
                    };
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }
        };

        var service = new BookSearchService(new HttpClient(mockHandler));

        var results = await service.SearchBooksAsync("clean code");

        // Every provider was still tried, and the one that answered is returned
        Assert.Equal(3, mockHandler.RecordedRequests.Count);
        var book = Assert.Single(results);
        Assert.Equal("Clean Code", book.Title);
        Assert.Equal("OpenLibrary", book.Source);
        Assert.Null(book.CoverUrl);
        Assert.Equal(0, book.TotalPages);
    }

    [Fact]
    public async Task SearchBooksAsync_ReturnsEmptyList_WhenEveryProviderThrows()
    {
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = _ => throw new HttpRequestException("offline")
        };
        var service = new BookSearchService(new HttpClient(mockHandler));

        var results = await service.SearchBooksAsync("anything");

        Assert.NotNull(results);
        Assert.Empty(results);
        Assert.Equal(3, mockHandler.RecordedRequests.Count);
    }

    // Decoded query parameters of the single request sent to the given host.
    private static System.Collections.Generic.Dictionary<string, string> QueryOf(MockHttpMessageHandler handler, string host)
    {
        var request = Assert.Single(handler.RecordedRequests, r => r.RequestUri!.Host == host);
        Assert.Equal("https", request.RequestUri!.Scheme);
        return QueryHelpers.ParseQuery(request.RequestUri.Query).ToDictionary(p => p.Key, p => p.Value.ToString());
    }

    [Fact]
    public async Task SearchBooksAsync_HandlesProviderFailuresAndMalformedJsonGracefully()
    {
        var mockHandler = new MockHttpMessageHandler
        {
            Handler = req =>
            {
                var url = req.RequestUri?.ToString() ?? "";

                // Google Books throws 500 error
                if (url.Contains("googleapis.com"))
                {
                    return new HttpResponseMessage(HttpStatusCode.InternalServerError);
                }

                // OpenLibrary returns invalid malformed JSON
                if (url.Contains("openlibrary.org"))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("{ not valid json !!! }", Encoding.UTF8, "application/json")
                    };
                }

                // Apple Books succeeds
                if (url.Contains("itunes.apple.com"))
                {
                    var appleResponse = new
                    {
                        results = new[]
                        {
                            new
                            {
                                trackId = 555666777L,
                                trackName = "Working Effectively with Legacy Code",
                                artistName = "Michael Feathers",
                                artworkUrl100 = "https://mzstatic.com/legacy/100x100bb.jpg"
                            }
                        }
                    };
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(appleResponse), Encoding.UTF8, "application/json")
                    };
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }
        };

        var httpClient = new HttpClient(mockHandler);
        var service = new BookSearchService(httpClient);

        // Should NOT throw an exception despite 2 failures
        var results = await service.SearchBooksAsync("legacy code");

        Assert.Single(results);
        Assert.Equal("Working Effectively with Legacy Code", results[0].Title);
        Assert.Equal("Michael Feathers", results[0].Author);
        Assert.Equal("Apple Books", results[0].Source);
    }
}
