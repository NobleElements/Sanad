using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;

namespace Sanad.Api.Middleware;

public class IdempotencyMiddleware
{
    public const string IdempotencyKeyHeader = "Idempotency-Key";
    public const string AltIdempotencyKeyHeader = "X-Idempotency-Key";
    public const string ReplayedHeader = "X-Idempotency-Replayed";

    private static readonly TimeSpan DefaultCacheExpiration = TimeSpan.FromMinutes(15);
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public IdempotencyMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method) &&
            !HttpMethods.IsPut(context.Request.Method) &&
            !HttpMethods.IsPatch(context.Request.Method) &&
            !HttpMethods.IsDelete(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var idempotencyKey = context.Request.Headers[IdempotencyKeyHeader].FirstOrDefault()?.Trim();
        if (string.IsNullOrEmpty(idempotencyKey))
        {
            idempotencyKey = context.Request.Headers[AltIdempotencyKeyHeader].FirstOrDefault()?.Trim();
        }

        if (string.IsNullOrEmpty(idempotencyKey))
        {
            await _next(context);
            return;
        }

        var userScope = context.User.Identity?.IsAuthenticated == true && !string.IsNullOrEmpty(context.User.Identity.Name)
            ? context.User.Identity.Name
            : "anon";

        var cacheKey = $"idempotency:{userScope}:{context.Request.Method}:{context.Request.Path}:{idempotencyKey}";

        if (_cache.TryGetValue(cacheKey, out CachedIdempotentResponse? cached) && cached is not null)
        {
            await ReplayResponseAsync(context, cached);
            return;
        }

        var keyLock = _locks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));
        await keyLock.WaitAsync(context.RequestAborted);
        try
        {
            if (_cache.TryGetValue(cacheKey, out cached) && cached is not null)
            {
                await ReplayResponseAsync(context, cached);
                return;
            }

            var originalBodyStream = context.Response.Body;
            using var memoryStream = new MemoryStream();
            context.Response.Body = memoryStream;

            try
            {
                await _next(context);

                var bodyBytes = memoryStream.ToArray();

                // Cache non-5xx responses before flushing to the network stream so that even if
                // the client connection drops while receiving the response, retries are deduplicated.
                if (context.Response.StatusCode < StatusCodes.Status500InternalServerError)
                {
                    var responseToCache = new CachedIdempotentResponse(
                        context.Response.StatusCode,
                        context.Response.ContentType,
                        context.Response.Headers.Location.ToString(),
                        bodyBytes);

                    _cache.Set(cacheKey, responseToCache, DefaultCacheExpiration);
                }

                context.Response.Body = originalBodyStream;
                if (bodyBytes.Length > 0)
                {
                    await originalBodyStream.WriteAsync(bodyBytes, context.RequestAborted);
                }
            }
            finally
            {
                context.Response.Body = originalBodyStream;
            }
        }
        finally
        {
            keyLock.Release();
        }
    }

    private static async Task ReplayResponseAsync(HttpContext context, CachedIdempotentResponse cached)
    {
        context.Response.StatusCode = cached.StatusCode;
        if (!string.IsNullOrEmpty(cached.ContentType))
        {
            context.Response.ContentType = cached.ContentType;
        }
        if (!string.IsNullOrEmpty(cached.Location))
        {
            context.Response.Headers.Location = cached.Location;
        }
        context.Response.Headers[ReplayedHeader] = "true";

        if (cached.Body.Length > 0)
        {
            await context.Response.Body.WriteAsync(cached.Body, context.RequestAborted);
        }
    }

    private sealed record CachedIdempotentResponse(
        int StatusCode,
        string? ContentType,
        string? Location,
        byte[] Body);
}
