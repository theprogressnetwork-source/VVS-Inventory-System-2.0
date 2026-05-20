using System.Net;
using System.Text.Json;
using Serilog;

namespace VvsIms.Api.Middleware;

/// <summary>
/// Global exception handling middleware — catches all unhandled exceptions,
/// logs them with correlation ID, and returns standardized error responses.
/// Never exposes stack traces to clients.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionHandlingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var correlationId = context.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
            Log.Error(ex, "Unhandled exception | CorrelationId: {CorrelationId} | Path: {Path}",
                correlationId, context.Request.Path);

            context.Response.StatusCode = ex switch
            {
                ArgumentException => (int)HttpStatusCode.BadRequest,
                UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
                InvalidOperationException => (int)HttpStatusCode.Conflict,
                KeyNotFoundException => (int)HttpStatusCode.NotFound,
                _ => (int)HttpStatusCode.InternalServerError
            };

            context.Response.ContentType = "application/json";

            var response = new
            {
                Success = false,
                Message = ex.Message,
                CorrelationId = correlationId,
                Timestamp = DateTime.UtcNow
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
        }
    }
}
