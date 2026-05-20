using Microsoft.AspNetCore.Mvc;

namespace VvsIms.Api.Controllers;

/// <summary>
/// Health check controller — provides liveness and readiness probes
/// for container orchestration and monitoring.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Liveness probe — returns OK if the API process is running.
    /// </summary>
    [HttpGet("live")]
    public IActionResult Live() => Ok(new
    {
        Status = "Healthy",
        Timestamp = DateTime.UtcNow,
        Service = "VvsIms.Api"
    });

    /// <summary>
    /// Readiness probe — returns OK with version info.
    /// Database connectivity is handled by the /health endpoint via ASP.NET health checks.
    /// </summary>
    [HttpGet("ready")]
    public IActionResult Ready() => Ok(new
    {
        Status = "Ready",
        Timestamp = DateTime.UtcNow,
        Service = "VvsIms.Api",
        Version = "1.0.0-pristine"
    });
}
