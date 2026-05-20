using System.Text;
using AspNetCoreRateLimit;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using VvsIms.Application.Interfaces;
using VvsIms.Application.Services;
using VvsIms.Domain.Interfaces;
using VvsIms.Infrastructure.Persistence;
using VvsIms.Infrastructure.Repositories;
using VvsIms.Infrastructure.Services;
using VvsIms.Api.Middleware;

namespace VvsIms.Api;

/// <summary>
/// VVS IMS API — Clean Architecture Entry Point.
/// All secrets from environment variables. Strict CORS. JWT auth.
/// </summary>
public class Program
{
    public static async Task Main(string[] args)
    {
        // ── Load .env file (NEVER committed to source control) ─────
        // Try current directory first, then parent directories for flexibility
        var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
        if (!File.Exists(envPath))
        {
            // Walk up to 3 parent directories looking for .env
            var dir = Directory.GetCurrentDirectory();
            for (int i = 0; i < 3; i++)
            {
                dir = Directory.GetParent(dir)?.FullName;
                if (dir == null) break;
                var candidate = Path.Combine(dir, ".env");
                if (File.Exists(candidate)) { envPath = candidate; break; }
            }
        }
        Env.Load(envPath);

        var secretProvider = new EnvironmentSecretProvider();

        // ── Serilog bootstrap ──────────────────────────────────────
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.File("Logs/vvs-ims-.log", rollingInterval: RollingInterval.Day)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", "VvsIms.Api")
            .CreateLogger();

        var builder = WebApplication.CreateBuilder(args);
        builder.Host.UseSerilog();

        // ── Database: MySQL via Pomelo OR SQLite (local dev) ────────
        var useSqlite = EnvironmentSecretProvider.GetOptional("DB_USE_SQLITE") == "true";
        VvsImsDbContext.IsSqlite = useSqlite;

        if (useSqlite)
        {
            var sqliteConnString = "Data Source=vvs_ims_dev.db;Cache=shared";
            Log.Information("📦 DB_USE_SQLITE=true — Using SQLite for local development");
            builder.Services.AddDbContext<VvsImsDbContext>(options =>
                options.UseSqlite(sqliteConnString, sqliteOptions =>
                {
                    sqliteOptions.MigrationsAssembly(
                        typeof(VvsImsDbContext).Assembly.FullName);
                }));
        }
        else
        {
            var connectionString = secretProvider.GetConnectionString();
            var serverVersion = new MySqlServerVersion(new Version(8, 0, 32));
            Log.Information("🗄️ DB_USE_SQLITE not set — Using MySQL (Pomelo)");
            builder.Services.AddDbContext<VvsImsDbContext>(options =>
            options.UseMySql(connectionString, serverVersion, mySqlOptions =>
            {
                mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
                mySqlOptions.MigrationsAssembly(
                typeof(VvsImsDbContext).Assembly.FullName);
            }));
        }

        // ── Memory Cache (for cached repositories) ────────────────
        builder.Services.AddMemoryCache();

        // ── UnitOfWork: Scoped lifetime ────────────────────────────
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
    
        // ── User Repository: Scoped lifetime ───────────────────────
        builder.Services.AddScoped<IUserRepository, UserRepository>();
    
        // ── Auth Service: Scoped lifetime ──────────────────────────
        builder.Services.AddScoped<AuthService>();

        // ── JWT Service (IJwtService interface for Clean Architecture) ──
        var jwtService = new JwtService(
            secretProvider.JwtSigningKey,
            secretProvider.JwtIssuer,
            secretProvider.JwtAudience,
            secretProvider.JwtAccessTokenMinutes,
            secretProvider.JwtRefreshTokenDays);
    
        builder.Services.AddSingleton<IJwtService>(jwtService);

        // ── JWT Authentication ─────────────────────────────────────
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = jwtService.GetValidationParameters();
                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        Log.Warning("JWT authentication failed: {Error}", context.Exception.Message);
                        return Task.CompletedTask;
                    }
                };
            });

        builder.Services.AddAuthorization();

        // ── STRICT CORS (from env vars, NOT AllowAnyOrigin) ────────
        var allowedOrigins = secretProvider.CorsAllowedOrigins
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("SovereignCors", policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        // ── Rate Limiting ──────────────────────────────────────────
        builder.Services.AddMemoryCache();
        builder.Services.AddOptions();
        builder.Services.Configure<IpRateLimitOptions>(options =>
        {
            options.GeneralRules = new List<AspNetCoreRateLimit.RateLimitRule>
            {
                new()
                {
                    Endpoint = "*",
                    Period = "1m",
                    Limit = 100
                },
                new()
                {
                    Endpoint = "POST:/api/auth/login",
                    Period = "1m",
                    Limit = 10
                }
            };
        });
        builder.Services.Configure<IpRateLimitPolicies>(options => { });
        builder.Services.AddSingleton<AspNetCoreRateLimit.IRateLimitConfiguration, AspNetCoreRateLimit.RateLimitConfiguration>();
        builder.Services.AddInMemoryRateLimiting();

        // ── Controllers + JSON ─────────────────────────────────────
        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.DefaultIgnoreCondition =
                    System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
            });

        // ── Swagger ────────────────────────────────────────────────
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "VVS IMS API",
                Version = "v1",
                Description = "Sovereign Inventory Management System — Clean Architecture"
            });
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header using the Bearer scheme",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        // ── Health Checks ──────────────────────────────────────────
        var healthChecksBuilder = builder.Services.AddHealthChecks();
        if (useSqlite)
        {
            // SQLite: use a simple SQLite health check via the registered DbContext
            healthChecksBuilder.AddSqlite("Data Source=vvs_ims_dev.db", name: "sqlite", tags: new[] { "db", "ready" });
        }
        else
        {
            healthChecksBuilder.AddMySql(secretProvider.GetConnectionString(), name: "mysql", tags: new[] { "db", "ready" });
        }

        // ── Custom Repositories ─────────────────────────────────────
        builder.Services.AddScoped<IProductRepository, ProductRepository>();
        builder.Services.AddScoped<IStockRepository, StockRepository>();
        builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
        builder.Services.AddScoped<ISkuRepository, SkuRepository>();

        // ── Application Services ──────────────────────────────────────
        builder.Services.AddScoped<IProductService, ProductService>();
        builder.Services.AddScoped<IInventorySyncService, InventorySyncService>();
        builder.Services.AddScoped<INotificationService, NotificationService>();
        builder.Services.AddScoped<IAuditLogService, AuditLogService>();

        // ── Platform Services ───────────────────────────────────────
        builder.Services.AddHttpClient<IPlatformService, AmazonPlatformService>();
        builder.Services.AddHttpClient<IPlatformService, ShopifyPlatformService>();
        builder.Services.AddHttpClient<IPlatformService, BestBuyPlatformService>();

        // ── Hosted Services ─────────────────────────────────────────
        builder.Services.AddHostedService<InventorySyncHostedService>();

        // ── Build ──────────────────────────────────────────────────
        var app = builder.Build();
    
        // ── Seed Data: Create default admin user on first run ──────
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VvsImsDbContext>();
            var seedLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            try
            {
                // Apply any pending migrations automatically (MySQL) or create DB (SQLite)
                if (VvsImsDbContext.IsSqlite)
                {
                    // SQLite: EnsureCreated creates the schema without migrations
                    await db.Database.EnsureCreatedAsync();
                    seedLogger.LogInformation("SQLite database created/verified successfully.");
                }
                else if (db.Database.IsRelational())
                {
                    await db.Database.MigrateAsync();
                    seedLogger.LogInformation("Database migrations applied successfully.");
                }
    
                // Seed default admin user
                await SeedData.SeedAsync(db, seedLogger);
            }
            catch (Exception ex)
            {
                seedLogger.LogError(ex, "An error occurred while seeding the database.");
            }
        }
    
        // ── Middleware Pipeline (order matters!) ────────────────────
        app.UseIpRateLimiting();
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<ExceptionHandlingMiddleware>();
    
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }
    
        app.UseHttpsRedirection();
        app.UseCors("SovereignCors");
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        app.MapHealthChecks("/health");
    
        Log.Information("🚀 VVS IMS API starting on {Urls}", builder.Configuration["ASPNETCORE_URLS"] ?? "http://localhost:5000");
        app.Run();
    }
}
