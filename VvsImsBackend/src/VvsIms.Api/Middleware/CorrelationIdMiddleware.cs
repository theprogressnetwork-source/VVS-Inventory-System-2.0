using Serilog;
using Serilog.Context;

namespace VvsIms.Api.Middleware;

/// <summary>
/// Correlation ID middleware — assigns a unique tracking ID to every request.
/// Checks for incoming X-Correlation-Id header, or generates a new GUID.
/// Stores in HttpContext.Items for downstream middleware and logging.
/// </summary>
public class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[CorrelationIdHeader]
            .FirstOrDefault() ?? Guid.NewGuid().ToString();

        // Store for downstream access
        context.Items["CorrelationId"] = correlationId;

        // Add to response headers
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(CorrelationIdHeader))
                context.Response.Headers.Append(CorrelationIdHeader, correlationId);
            return Task.CompletedTask;
        });

        // Enrich Serilog context
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }
}
