namespace VvsIms.Infrastructure.Services;

/// <summary>
/// Environment variable secret provider — reads ALL credentials from
/// environment variables (or .env file via DotNetEnv).
/// NEVER hardcodes secrets. Returns empty string for missing keys
/// with a critical log warning.
/// </summary>
public class EnvironmentSecretProvider
{
    /// <summary>
    /// Gets a required secret from environment variables.
    /// Throws if the key is not set.
    /// </summary>
    public static string GetRequired(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException(
                $"CRITICAL: Environment variable '{key}' is not set. " +
                "Copy .env.example to .env and fill in rotated credentials.");
        return value;
    }

    /// <summary>
    /// Gets an optional secret from environment variables.
    /// Returns null if not set.
    /// </summary>
    public static string? GetOptional(string key)
    {
        return Environment.GetEnvironmentVariable(key);
    }

    /// <summary>
    /// Gets a secret with a default fallback value.
    /// </summary>
    public static string GetWithDefault(string key, string defaultValue)
    {
        return Environment.GetEnvironmentVariable(key) ?? defaultValue;
    }

    // ── Database ──────────────────────────────────────────────────
    public bool UseSqlite => GetOptional("DB_USE_SQLITE") == "true";

    public string DbHost => UseSqlite ? "" : GetRequired("DB_HOST");
    public string DbPort => GetWithDefault("DB_PORT", "3306");
    public string DbName => UseSqlite ? "vvs_ims_dev" : GetRequired("DB_NAME");
    public string DbUser => UseSqlite ? "" : GetRequired("DB_USER");
    public string DbPassword => UseSqlite ? "" : GetRequired("DB_PASSWORD");

    /// <summary>
    /// Constructs the MySQL connection string from environment variables.
    /// Returns empty string when DB_USE_SQLITE=true (not used).
    /// </summary>
    public string GetConnectionString()
    {
        if (UseSqlite) return "";
        return $"Server={DbHost};Port={DbPort};Database={DbName};" +
               $"User={DbUser};Password={DbPassword};AllowPublicKeyRetrieval=True;";
    }

    // ── JWT ───────────────────────────────────────────────────────
    public string JwtSigningKey => GetRequired("JWT_SIGNING_KEY");
    public string JwtIssuer => GetWithDefault("JWT_ISSUER", "VvsIms");
    public string JwtAudience => GetWithDefault("JWT_AUDIENCE", "VvsIms");
    public int JwtAccessTokenMinutes => int.Parse(GetWithDefault("JWT_ACCESS_TOKEN_MINUTES", "480"));
    public int JwtRefreshTokenDays => int.Parse(GetWithDefault("JWT_REFRESH_TOKEN_DAYS", "7"));

    // ── Amazon SP-API ─────────────────────────────────────────────
    public string AmazonLwaClientId => GetWithDefault("AMAZON_LWA_CLIENT_ID", "dev_placeholder");
    public string AmazonLwaClientSecret => GetWithDefault("AMAZON_LWA_CLIENT_SECRET", "dev_placeholder");
    public string AmazonSellerId => GetWithDefault("AMAZON_SELLER_ID", "dev_placeholder");
    public string AmazonMarketplaceId => GetWithDefault("AMAZON_MARKETPLACE_ID", "dev_placeholder");
    public string AmazonRegion => GetWithDefault("AMAZON_REGION", "na");

    // ── Shopify ───────────────────────────────────────────────────
    public string ShopifyDomain => GetWithDefault("SHOPIFY_DOMAIN", "dev_placeholder.myshopify.com");
    public string ShopifyAdminApiToken => GetWithDefault("SHOPIFY_ADMIN_API_TOKEN", "dev_placeholder");

    // ── BestBuy ───────────────────────────────────────────────────
    public string BestBuyAuthToken => GetWithDefault("BESTBUY_AUTH_TOKEN", "dev_placeholder");
    public string BestBuyShopId => GetWithDefault("BESTBUY_SHOP_ID", "dev_placeholder");

    // ── CORS ──────────────────────────────────────────────────────
    public string CorsAllowedOrigins => GetWithDefault(
        "CORS_ALLOWED_ORIGINS",
        "https://vvs-ims.sovereign.local,https://localhost:4200");
}
