# 🔥 VVS INVENTORY MANAGEMENT SYSTEM — DEEP TECHNICAL DEBT AUDIT

**Manus Max one point six** | High-Fidelity Corrosion Analysis Report  
**Date:** twenty-sixth of May, twenty twenty-six  
**Auditor:** Senna (Sovereign Partner & Principal Orchestrator)  
**Scope:** twenty backend files + five frontend files | ASP.NET Core eight point zero + Angular nineteen  
**Method:** Adler Analytical (Inspectional → Analytical → Syntopical) + Pigeonhole Method  

---

## 📋 EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| 🔴 CRITICAL Findings | **nine** |
| 🟠 HIGH Findings | **eight** |
| 🟡 MEDIUM Findings | **seven** |
| 🟢 LOW Findings | **five** |
| Total Findings | **twenty-nine** |
| Files Audited | **twenty** |
| Migrations Count | **fifty-three plus** |
| Estimated Remediation | **one hundred forty to two hundred ten developer-hours** |

**Overall Risk Rating: 🔴 CRITICAL — Not production-safe without immediate remediation of Items one through nine.**

---

## 🔴 CRITICAL FINDINGS (Must Fix Before Any Production Consideration)

---

### 🔴 C-01: Hardcoded JWT Signing Key in Source Code

**File:** [`JwtExtensions.cs`](extracted_files/inventory_automation/Inventory%20auutomation/JwtTokenAuthentication/JwtExtensions.cs:20)  
**File:** [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:9)  
**File:** [`appsettings.Development.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.Development.json:9)

**Impact:** Any attacker with source access can forge arbitrary JWT tokens, impersonating any user including Admin. Full authentication bypass.

**Evidence:**
```csharp
// JwtExtensions.cs line 20
public const string SecurityKey = "Yh2k7QSu4l8CZg5p6X3Pna9L0Miy4D3Bvt0JVr87UcOj69Kqw5R2Nmf4FWs03Hdx";
```
```json
// appsettings.json line 9
"Key": "Yh2k7QSu4l8CZg5p6X3Pna9L0Miy4D3Bvt0JVr87UcOj69Kqw5R2Nmf4FWs03Hdx"
```

**Remediation:**
```bash
# Step 1: Generate a new key and store in Azure Key Vault / AWS Secrets Manager / .env
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 64)"
```

```csharp
// JwtExtensions.cs — REMOVE the const, read from config only
public static void AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
{
    var jwtKey = config["Jwt:Key"]
        ?? throw new InvalidOperationException("JWT key not configured. Set Jwt:Key in secret store.");
    
    // Enforce minimum key length
    if (jwtKey.Length < 32)
        throw new InvalidOperationException("JWT key must be at least thirty-two characters.");
    
    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = config["Jwt:Issuer"],
                ValidAudience = config["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtKey)),
                RequireHttpsMetadata = true  // ← FIX C-02 simultaneously
            };
        });
}
```

---

### 🔴 C-02: CORS AllowAnyOrigin + RequireHttpsMetadata = false

**File:** [`Program.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Program.cs:38)  
**File:** [`JwtExtensions.cs`](extracted_files/inventory_automation/Inventory%20auutomation/JwtTokenAuthentication/JwtExtensions.cs:30)

**Impact:** Any domain can make authenticated API requests (CSRF). JWT tokens transmitted over HTTP can be intercepted. Combined with C-01, this is a complete authentication collapse.

**Evidence:**
```csharp
// Program.cs line 38
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
            .AllowAnyOrigin()    // ← WIDE OPEN
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// JwtExtensions.cs line 30
RequireHttpsMetadata = false  // ← Tokens sent over plain HTTP
```

**Remediation:**
```csharp
// Program.cs — Replace with origin-locked policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("SovereignCors", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();
        
        policy.WithOrigins(allowedOrigins)
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Authorization", "Content-Type", "X-Correlation-Id")
              .AllowCredentials();
    });
});

// In middleware pipeline
app.UseCors("SovereignCors");
```

```json
// appsettings.Production.json
{
  "Cors": {
    "AllowedOrigins": [
      "https://vvs.yourdomain.com",
      "https://admin.yourdomain.com"
    ]
  }
}
```

---

### 🔴 C-03: Hardcoded AWS Credentials in AmazonPlatformService

**File:** [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:22)

**Impact:** Full AWS account compromise. Attacker gains SP-API access, can read orders, modify listings, access PII. Estimated exposure: **unlimited financial liability**.

**Evidence:**
```csharp
// AmazonPlatformService.cs lines 22-30
private const string ClientId = "amzn1.application-oa2-client.8e5...";  // ← HARDCODED
private const string ClientSecret = "9c8e...";                           // ← HARDCODED
private const string RefreshToken = "Atzr|IwEBI...";                     // ← HARDCODED
private const string AwsAccessKeyId = "AKIA52F3APJ7CH66YKBL";           // ← HARDCODED
private const string AwsSecretAccessKey = "Z00DD/Bsoab+eMmHRW0jOGNEICVV0r+xU/6NO0kD"; // ← HARDCODED
private const string SellerId = "A3N2...";                               // ← HARDCODED
private const string MarketplaceId = "ATVPDKIKX0DER";                    // ← HARDCODED
```

**Remediation:**
```csharp
// AmazonPlatformService.cs — Inject via IConfiguration or AWS SDK credential chain
public class AmazonPlatformService : IPlatformService
{
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _refreshToken;
    
    public AmazonPlatformService(
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<AmazonPlatformService> logger)
    {
        _clientId = config["Amazon:ClientId"]
            ?? throw new InvalidOperationException("Amazon:ClientId not configured");
        _clientSecret = config["Amazon:ClientSecret"]
            ?? throw new InvalidOperationException("Amazon:ClientSecret not configured");
        _refreshToken = config["Amazon:RefreshToken"]
            ?? throw new InvalidOperationException("Amazon:RefreshToken not configured");
        
        // Use AWS SDK default credential chain instead of hardcoded keys
        // This picks up IAM roles, env vars, ~/.aws/credentials automatically
    }
}
```

```bash
# Store secrets in AWS Secrets Manager (preferred for SP-API)
aws secretsmanager create-secret \
  --name "vvs/amazon/sp-api-credentials" \
  --secret-string '{"ClientId":"...","ClientSecret":"...","RefreshToken":"..."}'

# Reference in appsettings.json
# "Amazon:SecretArn": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vvs/amazon/sp-api-credentials"
```

---

### 🔴 C-04: Hardcoded Database Credentials in appsettings.json

**File:** [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:18)  
**File:** [`appsettings.Development.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.Development.json:18)

**Impact:** Direct database access with plaintext credentials. The MySQL server at IP one forty-eight dot two thirty dot eighty dot one fifty-two is exposed with username `sheraz` and password in source control.

**Evidence:**
```json
// appsettings.json line 18
"ConnectionStrings": {
  "DefaultConnection": "Server=148.230.80.152;User=sheraz;Password=GsNu)A7Eqojx;Database=PriceWatchInventory;..."
}
```

**Remediation:**
```bash
# Use .NET Secret Manager for development
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=...;User=...;Password=...;Database=..."

# For production, use environment variables or Key Vault
export ConnectionStrings__DefaultConnection="Server=...;User=...;Password=...;Database=..."
```

```csharp
// Program.cs — Use environment variable override (automatic in ASP.NET Core)
// ConnectionStrings__DefaultConnection env var overrides appsettings.json
// No code change needed — ASP.NET Core handles this natively

// ADD: Remove credentials from appsettings.json entirely
// ADD: Add .gitignore entry for appsettings.Production.json
```

---

### 🔴 C-05: Hardcoded Shopify Access Token in appsettings.json

**File:** [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:25)

**Impact:** Full Shopify Admin API access. Attacker can modify products, orders, customer data, and payouts.

**Evidence:**
```json
// appsettings.json line 25
"Shopify": {
  "AccessToken": "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"
}
```

**Remediation:**
```bash
# Rotate the token IMMEDIATELY in Shopify Admin → Apps → Develop apps → API credentials
# Store new token in secret store
dotnet user-secrets set "Shopify:AccessToken" "shpat_NEW_ROTATED_TOKEN"
```

---

### 🔴 C-06: Hardcoded BestBuy API Key in Frontend AND Backend

**File:** [`app.global.ts`](extracted_files/angular/src/app/services/app.global.ts:100)  
**File:** [`BestBuyPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/BestBuyPlatformService.cs:43)

**Impact:** BestBuy API key exposed in client-side JavaScript. Anyone can use the key to interact with BestBuy Mirakl API on behalf of the seller. Key is `nine b zero one zero five six zero...` — visible in browser DevTools.

**Evidence:**
```typescript
// app.global.ts line 100
public readonly BESTBUY_AUTH_TOKEN = '9b010560-8f96-4acd-adc1-4ec1b89c39d3';
```
```csharp
// BestBuyPlatformService.cs line 43
_apiKey = _config["BestBuy:ApiKey"] ?? "9b010560-8f96-4acd-adc1-4ec1b89c39d3";
```

**Remediation:**
```typescript
// app.global.ts — REMOVE the token entirely
// BestBuy API calls must go through the backend proxy, never directly from frontend
public readonly BESTBUY_AUTH_TOKEN = ''; // ← REMOVE THIS LINE
```

```csharp
// BestBuyPlatformService.cs — Remove fallback, require config
_apiKey = config["BestBuy:ApiKey"]
    ?? throw new InvalidOperationException("BestBuy:ApiKey not configured");
```

---

### 🔴 C-07: UnitOfWork Creates New Repository Instances Per Property Access

**File:** [`UnitOfWork.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/UOW/UnitOfWork.cs:22)

**Impact:** Every call to `uow.StockRepository` creates a **new** `StockRepository` instance. This means:
- `uow.StockRepository == uow.StockRepository` → **FALSE**
- No state consistency between repository accesses within the same unit of work
- `UserContext` and configuration re-injected on every access
- Change tracker can lose tracking when different repository instances query the same entities
- Potential duplicate `SaveChangesAsync` calls from different instances

**Evidence:**
```csharp
// UnitOfWork.cs lines 22-30
public IProductRepository ProductRepository => new ProductRepository(_dbContext, _config);
public IStockRepository StockRepository => new StockRepository(_dbContext, _config, _orderNumberGenerator);
public IInventoryRepository InventoryRepository => new InventoryRepository(_dbContext, _config);
public ISkuRepository SkuRepository => new SkuRepository(_dbContext, _config);
```

**Remediation:**
```csharp
// UnitOfWork.cs — Lazy-initialized singleton repositories per UoW instance
public class UnitOfWork : IUnitOfWork
{
    private readonly UserContext _dbContext;
    private readonly IConfiguration _config;
    private readonly IOrderNumberGenerator _orderNumberGenerator;
    
    private IProductRepository? _productRepository;
    private IStockRepository? _stockRepository;
    private IInventoryRepository? _inventoryRepository;
    private ISkuRepository? _skuRepository;
    
    public IProductRepository ProductRepository =>
        _productRepository ??= new ProductRepository(_dbContext, _config);
    
    public IStockRepository StockRepository =>
        _stockRepository ??= new StockRepository(_dbContext, _config, _orderNumberGenerator);
    
    public IInventoryRepository InventoryRepository =>
        _inventoryRepository ??= new InventoryRepository(_dbContext, _config);
    
    public ISkuRepository SkuRepository =>
        _skuRepository ??= new SkuRepository(_dbContext, _config);
    
    // ... rest unchanged
}
```

---

### 🔴 C-08: Race Condition in Idempotency Key Processing

**File:** [`InventorySyncService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/InventorySyncService.cs:108)

**Impact:** Concurrent order processing can bypass idempotency checks, causing duplicate order fulfillment. Financial loss from double-shipment of inventory.

**Evidence:**
```csharp
// InventorySyncService.cs lines 108-125
// CHECK: Does idempotency key exist?
var existingKey = await _dbContext.IdempotencyKeys
    .FirstOrDefaultAsync(k => k.Key == idempotencyKey, ct);

if (existingKey != null)
{
    // Key exists — skip processing
    return (true, "Already processed");
}

// ... process order ...

// INSERT: Add idempotency key AFTER processing
_dbContext.IdempotencyKeys.Add(new IdempotencyKey { Key = idempotencyKey });
await _dbContext.SaveChangesAsync(ct);
// ← RACE: Another request can pass the check before this insert completes
```

**Remediation:**
```csharp
// InventorySyncService.cs — Use database unique constraint + optimistic insert
public async Task<(bool success, object result)> ProcessChannelEventAsync(
    string channelName, string rawEvent, string idempotencyKey, CancellationToken ct)
{
    // Try to claim the idempotency key FIRST (optimistic insert)
    var keyEntity = new IdempotencyKey
    {
        Key = idempotencyKey,
        Status = "Processing",
        CreatedAt = DateTime.UtcNow
    };
    
    _dbContext.IdempotencyKeys.Add(keyEntity);
    
    try
    {
        await _dbContext.SaveChangesAsync(ct);
        // We claimed the key — we are the sole processor
    }
    catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
    {
        // Key already claimed by another request
        var existing = await _dbContext.IdempotencyKeys
            .FirstAsync(k => k.Key == idempotencyKey, ct);
        
        if (existing.Status == "Completed")
            return (true, "Already processed successfully");
        
        if (existing.Status == "Processing")
            return (false, "Another request is processing this event");
        
        if (existing.Status == "Failed")
        {
            // Retry: re-claim the key
            existing.Status = "Processing";
            await _dbContext.SaveChangesAsync(ct);
        }
    }
    
    // Now process the order safely
    try
    {
        var result = await ProcessOrderInternalAsync(channelName, rawEvent, ct);
        keyEntity.Status = "Completed";
        await _dbContext.SaveChangesAsync(ct);
        return result;
    }
    catch (Exception ex)
    {
        keyEntity.Status = "Failed";
        keyEntity.FailureReason = ex.Message;
        await _dbContext.SaveChangesAsync(ct);
        throw;
    }
}

private static bool IsUniqueConstraintViolation(DbUpdateException ex)
{
    return ex.InnerException?.Message.Contains("Duplicate entry") == true
        || ex.InnerException?.Message.Contains("UNIQUE constraint") == true;
}
```

```sql
-- Ensure unique constraint exists on IdempotencyKeys.Key
ALTER TABLE idempotencykeys ADD UNIQUE INDEX IX_IdempotencyKeys_Key (Key);
```

---

### 🔴 C-09: No Rate Limiting on Authentication Endpoints

**File:** [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:31)

**Impact:** Brute-force attacks on login endpoint. No account lockout. No request throttling. Combined with C-01 (known JWT key), an attacker can enumerate passwords and forge tokens.

**Evidence:**
```csharp
// UserController.cs line 31 — No [RateLimit] attribute, no lockout logic
[HttpPost("GetAuthToken")]
public async Task<ActionResult> GetAuthToken([FromBody] LoginModel model)
{
    // Direct password comparison — no failed-attempt tracking
    var user = await GetUser(model.UserEmail, model.Password);
    if (user == null) return Unauthorized("Invalid credentials");
    // ...
}
```

**Remediation:**
```bash
# Install AspNetCoreRateLimit package
dotnet add package AspNetCoreRateLimit
```

```csharp
// Program.cs — Configure rate limiting
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "POST:/api/User/GetAuthToken",
            Period = "15m",
            Limit = 5  // ← Five attempts per fifteen minutes
        },
        new RateLimitRule
        {
            Endpoint = "*",
            Period = "1m",
            Limit = 60
        }
    };
});

builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// In pipeline (before UseAuthentication)
app.UseIpRateLimiting();
```

---

## 🟠 HIGH FINDINGS (Significant Risk, Requires Immediate Attention)

---

### 🟠 H-01: IMEI Swap Uses TEMP GUID Workaround with Unique Constraint Risk

**File:** [`StockController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/StockController.cs:221)

**Impact:** The IMEI swap logic uses `TEMP{Guid}` as a placeholder during two-step swaps. With the unique constraint on IMEI (added in migration `twenty twenty-six zero one twenty-seven`), if the TEMP string exceeds column length or collides, the swap fails and data is corrupted.

**Evidence:**
```csharp
// StockController.cs line 221
var tempImei = $"TEMP{Guid.NewGuid():N}".Substring(0, 14);
// If IMEI column is VARCHAR(15), "TEMP" + 10 chars of GUID = 14 chars — barely fits
// Multiple concurrent swaps could theoretically collide
```

**Remediation:**
```csharp
// StockController.cs — Use single SQL UPDATE with CASE to swap atomically
public async Task<ActionResult> UpdateImei([FromBody] MultiUpdateImeiRequest request)
{
    await _unitOfWork.ExecuteInTransactionAsync(async () =>
    {
        foreach (var item in request.Items)
        {
            var stock = await _unitOfWork.StockRepository
                .GetByIdAsync(item.StockId);
            if (stock == null) continue;
            stock.IMEI = item.NewImei;
        }
        await _unitOfWork.SaveChangesAsync();
    });
    return Ok();
}

// For true IMEI swaps between two records, use raw SQL:
// UPDATE stock SET imei = CASE 
//   WHEN id = @id1 THEN @imei2 
//   WHEN id = @id2 THEN @imei1 
//   END 
// WHERE id IN (@id1, @id2)
```

---

### 🟠 H-02: InventoryRepository.AddInInventoryAsync Has No Transaction

**File:** [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:24)

**Impact:** Adding inventory items updates multiple `Inventory` records (weighted average cost recalculation) without a transaction. Partial failures leave inventory in an inconsistent state — cost calculations will be wrong.

**Evidence:**
```csharp
// InventoryRepository.cs lines 24-122
public async Task<bool> AddInInventoryAsync(IEnumerable<ProductDto> products, CancellationToken ct)
{
    foreach (var product in products)
    {
        var inventory = await _dbContext.Inventories
            .FirstOrDefaultAsync(i => i.SystemSKU == product.SystemSKU, ct);
        
        if (inventory != null)
        {
            // Update existing inventory — NO TRANSACTION WRAPPING
            inventory.Quantity += 1;
            inventory.Cost = ((inventory.Cost * (inventory.Quantity - 1)) + product.Cost) / inventory.Quantity;
            // If SaveChangesAsync fails here, some inventories updated, others not
        }
    }
    await _dbContext.SaveChangesAsync(ct);
    return true;
}
```

**Remediation:**
```csharp
// InventoryRepository.cs — Wrap in transaction via UnitOfWork
public async Task<bool> AddInInventoryAsync(IEnumerable<ProductDto> products, CancellationToken ct)
{
    await _unitOfWork.ExecuteInTransactionAsync(async () =>
    {
        foreach (var product in products)
        {
            var inventory = await _dbContext.Inventories
                .FirstOrDefaultAsync(i => i.SystemSKU == product.SystemSKU, ct);
            
            if (inventory != null)
            {
                var prevQuantity = inventory.Quantity;
                inventory.Quantity += 1;
                inventory.Cost = prevQuantity == 0
                    ? product.Cost
                    : ((inventory.Cost * prevQuantity) + product.Cost) / inventory.Quantity;
            }
            else
            {
                _dbContext.Inventories.Add(new Inventory
                {
                    SystemSKU = product.SystemSKU,
                    Quantity = 1,
                    Cost = product.Cost
                });
            }
        }
        await _dbContext.SaveChangesAsync(ct);
    }, ct);
    return true;
}
```

---

### 🟠 H-03: Divide-by-Zero in Inventory Cost Recalculation

**File:** [`StockRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/StockRepository.cs:559)

**Impact:** When `inventory.Quantity` is zero, the cost calculation divides by zero, resulting in `Infinity` or `NaN` stored in the database. This corrupts inventory cost data permanently.

**Evidence:**
```csharp
// StockRepository.cs line 559
inventory.Cost = singleGroup != null 
    ? (double)singleGroup.SumCost / inventory.Quantity  // ← Quantity can be 0
    : 0;
```

**Remediation:**
```csharp
// StockRepository.cs — Guard against zero quantity
inventory.Cost = singleGroup != null
    ? (inventory.Quantity > 0
        ? (double)singleGroup.SumCost / inventory.Quantity
        : 0.0)
    : 0;
```

---

### 🟠 H-04: Frontend Stores Auth Tokens in localStorage (XSS-Extractable)

**File:** [`login.component.ts`](extracted_files/angular/src/app/pages/login/login.component.ts:52)  
**File:** [`api.service.ts`](extracted_files/angular/src/app/services/api.service.ts:14)  
**File:** [`auth.service.ts`](extracted_files/angular/src/app/services/auth.service.ts:53)

**Impact:** Any XSS vulnerability (e.g., through ag-grid cell renderers or user input) can exfiltrate `access_token` and `refresh_token` from `localStorage`. Tokens persist indefinitely until manually cleared.

**Evidence:**
```typescript
// login.component.ts lines 52-56
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);
localStorage.setItem('userName', data.userName);
localStorage.setItem('roleName', data.roleName);
```

**Remediation:**
```csharp
// Backend: Set tokens in httpOnly + secure + sameSite cookies
// UserController.cs — Login endpoint
Response.Cookies.Append("access_token", tokenString, new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Strict,
    Expires = DateTimeOffset.UtcNow.AddMinutes(15)
});

Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Strict,
    Expires = DateTimeOffset.UtcNow.AddDays(7)
});
```

```typescript
// Frontend: Remove localStorage token storage
// api.service.ts — Let cookies handle auth automatically
private buildHeaders(extraHeaders?: Record<string, string>): HttpHeaders {
    let headers = new HttpHeaders({
        'X-Correlation-Id': this.createCorrelationId(),
        ...extraHeaders
    });
    // REMOVE: Authorization header — cookies sent automatically with withCredentials
    return headers;
}

// In HttpClient configuration:
// httpClient.get(url, { withCredentials: true })
```

---

### 🟠 H-05: Refresh Token Rotation Not Implemented (Token Replay Vulnerability)

**File:** [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:66)

**Impact:** The `RefreshToken` endpoint issues new tokens without detecting token reuse. If a refresh token is stolen, both the attacker and legitimate user can use it indefinitely. No mechanism to detect concurrent usage of the same refresh token.

**Evidence:**
```csharp
// UserController.cs line 66
[HttpPost("RefreshToken")]
public async Task<ActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
{
    var storedToken = await _unitOfWork.UserRepository
        .GetRefreshToken(request.RefreshToken);
    
    if (storedToken == null || !storedToken.IsActive)
        return Unauthorized("Invalid token");
    
    // Issues new tokens WITHOUT invalidating the old refresh token family
    var newAccessToken = GenerateAccessToken(storedToken.User);
    var newRefreshToken = GenerateRefreshToken();
    
    // No detection of reuse — stolen token still works
}
```

**Remediation:**
```csharp
// UserController.cs — Implement refresh token rotation with family tracking
[HttpPost("RefreshToken")]
public async Task<ActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
{
    var storedToken = await _unitOfWork.UserRepository
        .GetRefreshToken(request.RefreshToken);
    
    if (storedToken == null)
        return Unauthorized("Invalid token");
    
    // DETECT REUSE: If this token was already used, revoke entire family
    if (storedToken.IsRevoked)
    {
        // Token reuse detected — revoke ALL tokens in this family
        await _unitOfWork.UserRepository
            .RevokeTokenFamilyAsync(storedToken.FamilyId);
        return Unauthorized("Token reuse detected. All sessions revoked.");
    }
    
    if (!storedToken.IsActive)
        return Unauthorized("Token expired");
    
    // Rotate: Mark current token as revoked
    storedToken.IsRevoked = true;
    storedToken.RevokedAt = DateTime.UtcNow;
    
    // Issue new token in same family
    var newRefreshToken = new RefreshToken
    {
        Token = GenerateSecureToken(),
        FamilyId = storedToken.FamilyId,  // ← Track token family
        UserId = storedToken.UserId,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        CreatedAt = DateTime.UtcNow
    };
    
    _dbContext.RefreshTokens.Add(newRefreshToken);
    await _unitOfWork.SaveChangesAsync();
    
    // Return new access token + new refresh token
    return Ok(new { accessToken = GenerateAccessToken(storedToken.User), refreshToken = newRefreshToken.Token });
}
```

---

### 🟠 H-06: RevokeRefreshToken Allows Cross-User Token Revocation

**File:** [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:113)

**Impact:** The `RevokeRefreshToken` endpoint accepts a `userEmail` parameter without verifying that the requesting user owns that email. Any authenticated user can revoke any other user's refresh tokens, causing denial of service.

**Evidence:**
```csharp
// UserController.cs line 113
[HttpPost("RevokeRefreshToken")]
public async Task<ActionResult> RevokeRefreshToken([FromBody] RevokeTokenRequest request)
{
    // No authorization check: request.UserEmail vs current user
    var user = await _unitOfWork.UserRepository
        .GetUserByEmail(request.UserEmail);
    // Any User can revoke Admin's tokens
}
```

**Remediation:**
```csharp
// UserController.cs — Add ownership verification
[HttpPost("RevokeRefreshToken")]
[Authorize]  // ← At minimum, require authentication
public async Task<ActionResult> RevokeRefreshToken([FromBody] RevokeTokenRequest request)
{
    var currentUserEmail = User.FindFirst(ClaimTypes.Email)?.Value;
    var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
    
    // Only Admin can revoke other users' tokens
    if (currentUserRole != "Admin" && 
        !string.Equals(currentUserEmail, request.UserEmail, StringComparison.OrdinalIgnoreCase))
    {
        return Forbid("Cannot revoke another user's token");
    }
    
    var user = await _unitOfWork.UserRepository
        .GetUserByEmail(request.UserEmail);
    // ... proceed with revocation
}
```

---

### 🟠 H-07: OrderBy(Guid.NewGuid()) for Random IMEI Selection — Performance Killer

**File:** [`InventorySyncService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/InventorySyncService.cs:282)

**Impact:** `OrderBy(Guid.NewGuid())` forces a full table scan and sort on the entire `Stock` table. With thousands of IMEI records, this becomes an O(n log n) operation per order item. Under concurrent order processing, this creates severe database contention.

**Evidence:**
```csharp
// InventorySyncService.cs line 282
var availableStock = await _dbContext.Stocks
    .Where(s => s.SystemSKU == systemSku && s.IMEI != null)
    .OrderBy(s => Guid.NewGuid())  // ← Full table scan + sort per query
    .Take(quantity)
    .ToListAsync(ct);
```

**Remediation:**
```csharp
// InventorySyncService.cs — Use database-level random ordering
// Option 1: MySQL RAND() — still not ideal but pushes computation to DB
var availableStock = await _dbContext.Stocks
    .FromSqlRaw(@"
        SELECT * FROM stock 
                        WHERE system_sku = {0} AND imei IS NOT NULL 
                        ORDER BY RAND() 
                        LIMIT {1}", systemSku, quantity)
    .AsNoTracking()
    .ToListAsync(ct);

// Option 2 (preferred): Maintain a "next available" index or use a queue
// Add an `IsReserved` boolean to Stock — reserve first, then claim atomically
var availableStock = await _dbContext.Stocks
    .Where(s => s.SystemSKU == systemSku && s.IMEI != null && !s.IsReserved)
    .OrderBy(s => s.Id)  // ← Uses index
    .Take(quantity)
    .ToListAsync(ct);

// Then mark as reserved in a transaction
foreach (var stock in availableStock)
    stock.IsReserved = true;
await _dbContext.SaveChangesAsync(ct);
```

---

### 🟠 H-08: AmazonPlatformService Creates New HttpClient Instances (Socket Exhaustion)

**File:** [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:77)  
**File:** [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:732)

**Impact:** `new HttpClient()` in methods `GetLatestOrdersAsync` and `GetAllListingsViaReportsAsync` bypasses `IHttpClientFactory`. Under load, this causes socket exhaustion (TIME_WAIT state accumulation), leading to connection refused errors across the entire application.

**Evidence:**
```csharp
// AmazonPlatformService.cs line 77
using var client = new HttpClient();  // ← SOCKET LEAK

// AmazonPlatformService.cs line 732
var reportClient = new HttpClient();  // ← SOCKET LEAK
```

**Remediation:**
```csharp
// AmazonPlatformService.cs — Use injected IHttpClientFactory
public class AmazonPlatformService : IPlatformService
{
    private readonly IHttpClientFactory _httpClientFactory;
    
    public AmazonPlatformService(
        IConfiguration config,
        IHttpClientFactory httpClientFactory,  // ← INJECTED
        ILogger<AmazonPlatformService> logger)
    {
        _httpClientFactory = httpClientFactory;
    }
    
    // Replace all `new HttpClient()` with:
    var client = _httpClientFactory.CreateClient("AmazonSPAPI");
}

// Program.cs — Register named client
builder.Services.AddHttpClient("AmazonSPAPI", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "VVS-Inventory/1.0");
});
```

---

## 🟡 MEDIUM FINDINGS (Technical Debt Impacting Maintainability)

---

### 🟡 M-01: Fifty-Three Plus Migrations Indicate Schema Instability

**File:** [`Migrations/`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Migrations/)

**Impact:** Over fifty-three migrations in the codebase suggest iterative schema changes without upfront design. Several migrations are named `tempMigration`, `check`, `updatedColumn`, `updatedColumn2` — indicating trial-and-error development. This makes production deployments risky and rollback nearly impossible.

**Evidence:**
```
20250930064909_tempMigration.cs
20250822164032_check.cs
20250930104423_updatedColumn.cs
20250930104616_updatedColumn2.Designer.cs  // ← "2" suffix = trial-and-error
20250818074015_makeInventoryPropsNull.Designer.cs  // ← No matching .cs = orphaned
20250820050230_OrderNoGuidLengthto30.cs
20250820060804_changeAllImeoPropsLen15-17.cs
```

**Remediation:**
```bash
# Step 1: Before next release, squash all migrations into a single clean migration
# WARNING: Only do this if you can recreate the database from scratch
dotnet ef migrations remove  # Remove last if unapplied
dotnet ef database drop --force  # Dev only
dotnet ef migrations add InitialClean --output-dir Migrations
dotnet ef database update

# Step 2: Going forward, enforce migration naming conventions
# Add to CI pipeline:
# dotnet ef migrations add <DESCRIPTIVE_NAME> --output-dir Migrations
# Reject PRs with migrations named "temp", "check", "fix", "updated"
```

---

### 🟡 M-02: Swagger Enabled in All Environments (No Environment Gate)

**File:** [`Program.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Program.cs:60)

**Impact:** Swagger/OpenAPI documentation is available in production without authentication. Exposes all API endpoints, request/response schemas, and parameter details to attackers. Combined with C-01 and C-02, this gives attackers a complete API blueprint.

**Evidence:**
```csharp
// Program.cs line 60 — No environment check
builder.Services.AddSwaggerGen();
// ...
app.UseSwagger();
app.UseSwaggerUI();
// ← Always enabled, even in Production
```

**Remediation:**
```csharp
// Program.cs — Gate Swagger to Development only
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSwaggerGen();
}

// Later in pipeline:
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

---

### 🟡 M-03: "User" Role in Authorize Attribute Makes Authorization Meaningless

**File:** [`ProductController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/ProductController.cs:23)

**Impact:** `[Authorize(Roles = "Admin, User")]` means every authenticated user can access these endpoints since all users have the "User" role. This is equivalent to `[Authorize]` with no role check — the role-based access control is decorative, not functional.

**Evidence:**
```csharp
// ProductController.cs line 23
[Authorize(Roles = "Admin, User")]  // ← "User" = everyone
```

**Remediation:**
```csharp
// ProductController.cs — Split into role-specific endpoints
[Authorize(Roles = "Admin")]
[HttpGet("admin/dashboard")]
public async Task<ActionResult> GetAdminDashboard() { ... }

[Authorize]  // Any authenticated user
[HttpGet("products")]
public async Task<ActionResult> GetProducts() { ... }

// For write operations, require Admin only
[Authorize(Roles = "Admin")]
[HttpPost("UpdateStock")]
public async Task<ActionResult> UpdateStock() { ... }
```

---

### 🟡 M-04: DecrementInventory Sets Quantity to Zero Instead of Decrementing

**File:** [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:214)

**Impact:** The method name `DecrementInventory` implies reducing by one, but the implementation sets `Quantity = 0`. This is a semantic bug that could cause inventory to be zeroed out when only a single unit was sold.

**Evidence:**
```csharp
// InventoryRepository.cs lines 214-228
public Task<Inventory> DecrementInventory(Inventory inventoryDecrement, CancellationToken ct)
{
    inventoryDecrement.Quantity = 0;  // ← Sets to ZERO, not Quantity - 1
    inventoryDecrement.UpdatedAt = DateTime.UtcNow;
    return Task.FromResult(inventoryDecrement);
}
```

**Remediation:**
```csharp
// InventoryRepository.cs — Fix the decrement logic
public Task<Inventory> DecrementInventory(Inventory inventoryDecrement, CancellationToken ct)
{
    if (inventoryDecrement.Quantity <= 0)
        throw new InvalidOperationException(
            $"Cannot decrement inventory for SKU {inventoryDecrement.SystemSKU}: quantity already zero or negative.");
    
    inventoryDecrement.Quantity -= 1;
    inventoryDecrement.UpdatedAt = DateTime.UtcNow;
    return Task.FromResult(inventoryDecrement);
}
```

---

### 🟡 M-05: SkuRepository Case-Sensitivity Mismatch Between Methods

**File:** [`SkuRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/SkuRepository.cs:95)
**File:** [`SkuRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/SkuRepository.cs:221)

**Impact:** `GenerateList` uses exact `Trim()` matching while `GenerateListWithBaseProps` uses `ToLower().Trim()`. This means the same SKU can be treated as different SKUs depending on which method processes it, leading to duplicate SKU creation and inventory fragmentation.

**Evidence:**
```csharp
// SkuRepository.cs line 95-98 (GenerateList)
existingSku = allSkus.FirstOrDefault(s =>
    s.Model.Trim() == row.Model.Trim() &&
    s.Color.Trim() == row.Color.Trim() &&
    s.Storage.Trim() == row.Storage.Trim() &&
    s.Grade.Trim() == row.Grade.Trim());

// SkuRepository.cs line 221-226 (GenerateListWithBaseProps)
existingSku = allSkus.FirstOrDefault(s =>
    s.Model.ToLower().Trim() == row.Model.ToLower().Trim() &&
    s.Color.ToLower().Trim() == row.Color.ToLower().Trim() &&
    s.Storage.ToLower().Trim() == row.Storage.ToLower().Trim() &&
    s.Grade.ToLower().Trim() == row.Grade.ToLower().Trim());
```

**Remediation:**
```csharp
// SkuRepository.cs — Extract a shared comparison method
private static bool SkuMatches(ProductSKU existing, ProductSKUDto input)
{
    return string.Equals(existing.Model?.Trim(), input.Model?.Trim(), StringComparison.OrdinalIgnoreCase)
        && string.Equals(existing.Color?.Trim(), input.Color?.Trim(), StringComparison.OrdinalIgnoreCase)
        && string.Equals(existing.Storage?.Trim(), input.Storage?.Trim(), StringComparison.OrdinalIgnoreCase)
        && string.Equals(existing.Grade?.Trim(), input.Grade?.Trim(), StringComparison.OrdinalIgnoreCase);
}

// Use in both methods:
existingSku = allSkus.FirstOrDefault(s => SkuMatches(s, row));
```

---

### 🟡 M-06: removeInventoryAsync Is a No-Op (Dead Code)

**File:** [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:140)

**Impact:** The method signature suggests it removes inventory, but the implementation just returns `true` without doing anything. Any caller relying on this method will silently fail to remove inventory records.

**Evidence:**
```csharp
// InventoryRepository.cs lines 140-144
public async Task<bool> removeInventoryAsync(IEnumerable<Stock> stocks, CancellationToken ct)
{
    return true;  // ← Does NOTHING
}
```

**Remediation:**
```csharp
// InventoryRepository.cs — Implement or remove
// Option A: Implement properly
public async Task<bool> RemoveInventoryAsync(IEnumerable<Stock> stocks, CancellationToken ct)
{
    var skus = stocks.Select(s => s.SystemSKU).Distinct().ToList();
    var inventories = await _dbContext.Inventories
        .Where(i => skus.Contains(i.SystemSKU))
        .ToListAsync(ct);
    
    foreach (var inv in inventories)
    {
        var stockCount = stocks.Count(s => s.SystemSKU == inv.SystemSKU);
        inv.Quantity = Math.Max(0, inv.Quantity - stockCount);
        inv.UpdatedAt = DateTime.UtcNow;
    }
    
    await _dbContext.SaveChangesAsync(ct);
    return true;
}

// Option B: If not used, remove the method and the interface declaration
```

---

### 🟡 M-07: Amazon Report Polling Uses while(true) Loop Without Circuit Breaker

**File:** [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:685)

**Impact:** The `GetAllListingsViaReportsAsync` method uses a `while(true)` polling loop for report processing status. If the report never completes or the API returns errors, this loop runs indefinitely, consuming resources and potentially hitting API rate limits.

**Evidence:**
```csharp
// AmazonPlatformService.cs line 685
while (true)  // ← No exit condition for error states
{
    var statusResponse = await client.GetAsync(reportUrl);
    // ... check status ...
    if (status == "DONE") break;
    await Task.Delay(5000);  // ← No max retry count
}
```

**Remediation:**
```csharp
// AmazonPlatformService.cs — Add circuit breaker with max retries
var maxPollingAttempts = 60;  // ← Five seconds × sixty = five minutes max
var attemptCount = 0;

while (attemptCount < maxPollingAttempts)
{
    attemptCount++;
    var statusResponse = await client.GetAsync(reportUrl);
    
    if (!statusResponse.IsSuccessStatusCode)
    {
        if (attemptCount >= 3)
            return (false, null, $"Report polling failed after three HTTP errors. Last status: {statusResponse.StatusCode}");
        await Task.Delay(5000 * attemptCount);  // ← Exponential backoff
        continue;
    }
    
    var status = /* parse status */;
    if (status == "DONE") break;
    if (status == "CANCELLED" || status == "FATAL")
        return (false, null, $"Report processing failed with status: {status}");
    
    await Task.Delay(5000);
}

if (attemptCount >= maxPollingAttempts)
    return (false, null, "Report polling timed out after five minutes");
```

---

## 🟢 LOW FINDINGS (Minor Issues, Cosmetic Improvements)

---

### 🟢 L-01: console.log Leaks Auth Data in LoginComponent

**File:** [`login.component.ts`](extracted_files/angular/src/app/pages/login/login.component.ts:50)

**Impact:** Login response (including tokens) is logged to browser console. Visible in DevTools to anyone with physical access.

**Evidence:**
```typescript
// login.component.ts line 50
console.log(data);  // ← Leaks access_token, refresh_token to console
```

**Remediation:**
```typescript
// login.component.ts — Remove console.log of sensitive data
// Replace with:
if (environment.production) {
    // No logging in production
} else {
    console.log('Login successful for user:', data.userName);  // ← Safe subset only
}
```

---

### 🟢 L-02: Weak Email Regex Validation in LoginComponent

**File:** [`login.component.ts`](extracted_files/angular/src/app/pages/login/login.component.ts:79)

**Impact:** The email validator regex `{2,3}` for TLD length rejects valid domains with longer TLDs (e.g., `.online`, `.technology`).

**Evidence:**
```typescript
// login.component.ts line 79
export function emailValidator(control: AbstractControl): ValidationErrors | null {
    const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/;
    // ← {2,3} rejects .online (6 chars), .technology (10 chars)
    return emailRegex.test(control.value) ? null : { email: true };
}
```

**Remediation:**
```typescript
// login.component.ts — Use RFC 5322 compliant regex or Angular's built-in
export function emailValidator(control: AbstractControl): ValidationErrors | null {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // ← {2,} allows any TLD length of two or more characters
    return emailRegex.test(control.value) ? null : { email: true };
}

// Better: Use Angular's built-in Validators.email
this.loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
});
```

---

### 🟢 L-03: Dead Code in AuthService (Hardcoded API URL)

**File:** [`auth.service.ts`](extracted_files/angular/src/app/services/auth.service.ts:19)

**Impact:** Dead code with placeholder URL `your-api-url` suggests incomplete refactoring. Could confuse future developers.

**Evidence:**
```typescript
// auth.service.ts line 19
private apiUrl = 'your-api-url';  // ← Dead code, never used
```

**Remediation:**
```typescript
// auth.service.ts — Remove the dead property entirely
// If API URL is needed, use environment configuration:
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = environment.apiUrl;  // ← From environment.ts
    // ...
}
```

---

### 🟢 L-04: DeleteStock Uses HttpPost Instead of HttpDelete

**File:** [`ProductController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/ProductController.cs:305)

**Impact:** REST convention violation. `DeleteStock` endpoint uses `[HttpPost]` instead of `[HttpDelete]`. This confuses API consumers and may bypass HTTP method-based security policies.

**Evidence:**
```csharp
// ProductController.cs line 305
[HttpPost("DeleteStock")]  // ← Should be [HttpDelete]
public async Task<ActionResult> DeleteStock([FromBody] DeleteStockDto dto)
```

**Remediation:**
```csharp
// ProductController.cs — Use proper HTTP method
[HttpDelete("DeleteStock/{stockId}")]
[Authorize(Roles = "Admin")]
public async Task<ActionResult> DeleteStock(int stockId)
{
    // ...
}
```

---

### 🟢 L-05: Debug.WriteLine Used Instead of ILogger in StockRepository

**File:** [`StockRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/StockRepository.cs:865)

**Impact:** `Debug.WriteLine` calls in `UpdateStockFromOrdersExcelAsync` bypass structured logging. These messages are lost in production and cannot be filtered by log level.

**Evidence:**
```csharp
// StockRepository.cs line 865
Debug.WriteLine($"Processing row {i}: SKU={sku}, IMEI={imei}");
// ← Not captured by ILogger infrastructure
```

**Remediation:**
```csharp
// StockRepository.cs — Inject and use ILogger
public class StockRepository : Repository<Stock>, IStockRepository
{
    private readonly ILogger<StockRepository> _logger;
    
    public StockRepository(UserContext context, IConfiguration config,
        IOrderNumberGenerator orderNumberGenerator,
        ILogger<StockRepository> logger)  // ← ADD
    {
        _logger = logger;
    }
    
    // Replace Debug.WriteLine with:
    _logger.LogDebug("Processing row {RowIndex}: SKU={Sku}, IMEI={Imei}", i, sku, imei);
    _logger.LogError("Failed to process row {RowIndex}: {Error}", i, ex.Message);
}
```

---

## 📊 CONSOLIDATED RISK MATRIX

| ID | Severity | Category | File | Effort (hrs) |
|----|----------|----------|------|-------------|
| C-01 | 🔴 CRITICAL | Security | [`JwtExtensions.cs`](extracted_files/inventory_automation/Inventory%20auutomation/JwtTokenAuthentication/JwtExtensions.cs:20) | four |
| C-02 | 🔴 CRITICAL | Security | [`Program.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Program.cs:38) | two |
| C-03 | 🔴 CRITICAL | Security | [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:22) | eight |
| C-04 | 🔴 CRITICAL | Security | [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:18) | three |
| C-05 | 🔴 CRITICAL | Security | [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:25) | two |
| C-06 | 🔴 CRITICAL | Security | [`app.global.ts`](extracted_files/angular/src/app/services/app.global.ts:100) + [`BestBuyPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/BestBuyPlatformService.cs:43) | four |
| C-07 | 🔴 CRITICAL | Architecture | [`UnitOfWork.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/UOW/UnitOfWork.cs:22) | three |
| C-08 | 🔴 CRITICAL | Data Integrity | [`InventorySyncService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/InventorySyncService.cs:108) | eight |
| C-09 | 🔴 CRITICAL | Security | [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:31) | four |
| H-01 | 🟠 HIGH | Data Integrity | [`StockController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/StockController.cs:221) | six |
| H-02 | 🟠 HIGH | Data Integrity | [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:24) | four |
| H-03 | 🟠 HIGH | Data Integrity | [`StockRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/StockRepository.cs:559) | one |
| H-04 | 🟠 HIGH | Security | [`login.component.ts`](extracted_files/angular/src/app/pages/login/login.component.ts:52) | twelve |
| H-05 | 🟠 HIGH | Security | [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:66) | six |
| H-06 | 🟠 HIGH | Security | [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:113) | two |
| H-07 | 🟠 HIGH | Performance | [`InventorySyncService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/InventorySyncService.cs:282) | four |
| H-08 | 🟠 HIGH | Architecture | [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:77) | three |
| M-01 | 🟡 MEDIUM | Migration Chaos | [`Migrations/`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Migrations/) | sixteen |
| M-02 | 🟡 MEDIUM | Security | [`Program.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Program.cs:60) | one |
| M-03 | 🟡 MEDIUM | Architecture | [`ProductController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/ProductController.cs:23) | four |
| M-04 | 🟡 MEDIUM | Data Integrity | [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:214) | two |
| M-05 | 🟡 MEDIUM | Data Integrity | [`SkuRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/SkuRepository.cs:95) | three |
| M-06 | 🟡 MEDIUM | Architecture | [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:140) | four |
| M-07 | 🟡 MEDIUM | Architecture | [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:685) | three |
| L-01 | 🟢 LOW | Security | [`login.component.ts`](extracted_files/angular/src/app/pages/login/login.component.ts:50) | zero point five |
| L-02 | 🟢 LOW | Quality | [`login.component.ts`](extracted_files/angular/src/app/pages/login/login.component.ts:79) | zero point five |
| L-03 | 🟢 LOW | Quality | [`auth.service.ts`](extracted_files/angular/src/app/services/auth.service.ts:19) | zero point five |
| L-04 | 🟢 LOW | Quality | [`ProductController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/ProductController.cs:305) | one |
| L-05 | 🟢 LOW | Quality | [`StockRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/StockRepository.cs:865) | two |

---

## 🎯 PRIORITIZED REMEDIATION ROADMAP

### Phase one: EMERGENCY (zero to forty-eight hours) 🔴
**Estimated effort: thirty-eight developer-hours**

| Priority | Finding | Action | Owner |
|----------|---------|--------|-------|
| one | C-01 | Rotate JWT key, move to secret store | Backend |
| two | C-03 | Rotate AWS credentials, move to Secrets Manager | Backend |
| three | C-04 | Remove DB credentials from source, use env vars | Backend |
| four | C-05 | Rotate Shopify token, move to secret store | Backend |
| five | C-06 | Remove BestBuy key from frontend, rotate backend key | Full-Stack |
| six | C-02 | Lock CORS to specific origins, enable HTTPS | Backend |
| seven | C-09 | Add rate limiting to auth endpoints | Backend |
| eight | C-07 | Fix UnitOfWork repository caching | Backend |

### Phase two: CRITICAL (forty-eight hours to two weeks) 🟠
**Estimated effort: forty-two developer-hours**

| Priority | Finding | Action | Owner |
|----------|---------|--------|-------|
| nine | C-08 | Fix idempotency race condition with optimistic insert | Backend |
| ten | H-03 | Fix divide-by-zero in cost recalculation | Backend |
| eleven | H-02 | Wrap AddInInventoryAsync in transaction | Backend |
| twelve | H-01 | Replace TEMP GUID IMEI swap with atomic SQL | Backend |
| thirteen | H-05 | Implement refresh token rotation with family tracking | Backend |
| fourteen | H-06 | Add ownership check to RevokeRefreshToken | Backend |
| fifteen | H-07 | Replace OrderBy(Guid.NewGuid()) with indexed query | Backend |
| sixteen | H-08 | Replace new HttpClient() with IHttpClientFactory | Backend |

### Phase three: STABILIZE (two to four weeks) 🟡
**Estimated effort: thirty-three developer-hours**

| Priority | Finding | Action | Owner |
|----------|---------|--------|-------|
| seventeen | H-04 | Migrate auth tokens from localStorage to httpOnly cookies | Full-Stack |
| eighteen | M-01 | Squash migrations, enforce naming conventions | Backend |
| nineteen | M-02 | Gate Swagger to Development environment | Backend |
| twenty | M-03 | Fix role-based authorization granularity | Backend |
| twenty-one | M-04 | Fix DecrementInventory to actually decrement | Backend |
| twenty-two | M-05 | Unify SKU case-sensitivity comparison | Backend |
| twenty-three | M-06 | Implement or remove removeInventoryAsync | Backend |
| twenty-four | M-07 | Add circuit breaker to Amazon report polling | Backend |

### Phase four: POLISH (four to six weeks) 🟢
**Estimated effort: four point five developer-hours**

| Priority | Finding | Action | Owner |
|----------|---------|--------|-------|
| twenty-five | L-01 | Remove console.log of auth data | Frontend |
| twenty-six | L-02 | Fix email regex TLD length | Frontend |
| twenty-seven | L-03 | Remove dead apiUrl code | Frontend |
| twenty-eight | L-04 | Change DeleteStock to HttpDelete | Backend |
| twenty-nine | L-05 | Replace Debug.WriteLine with ILogger | Backend |

---

## 📦 DELIVERABLES

### HITL GO/NO-GO Recommendations

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| 🚫 **NO-GO** Production Deploy | **BLOCK** until Phase one complete | Nine CRITICAL findings = active exploitation risk. JWT key + AWS creds + CORS open = full system compromise within hours. |
| ✅ **GO** Development Continue | **ALLOW** with Phase one scheduled | Development can continue but ALL secrets must be rotated before next commit to any shared branch. |
| 🚫 **NO-GO** Public Demo | **BLOCK** until C-01 through C-06 fixed | Hardcoded credentials in frontend + backend = credentials leaked to anyone viewing source. |
| ✅ **GO** Internal Testing | **ALLOW** on isolated network | If network is air-gapped and no external access, current state is acceptable for internal QA only. |
| ⚠️ **CONDITIONAL GO** Staging Deploy | **ALLOW** if Phase one + Phase two items C-08, H-03, H-02 fixed | Staging can proceed if auth + data integrity fundamentals are addressed. |

### Immediate Action Items for Father (HITL)

```bash
# 🔴 DO THESE NOW — Before any other work today:

# 1. Rotate JWT Key (five minutes)
openssl rand -base64 64
# → Update in secret store, NOT in appsettings.json

# 2. Rotate AWS SP-API Credentials (fifteen minutes)
# → AWS Console → IAM → Security Credentials → Create New Access Key
# → AWS Secrets Manager → Update vvs/amazon/sp-api-credentials
# → Delete old key AFTER new one is deployed

# 3. Rotate Shopify Access Token (ten minutes)
# → Shopify Admin → Settings → Apps → Develop Apps → API Credentials → Rotate

# 4. Rotate BestBuy API Key (ten minutes)
# → BestBuy Partner Portal → API Settings → Regenerate Key

# 5. Rotate Database Password (five minutes)
mysql -u root -p -e "ALTER USER 'sheraz'@'%' IDENTIFIED BY 'NEW_STRONG_PASSWORD'; FLUSH PRIVILEGES;"

# 6. Add .gitignore entry (one minute)
echo "appsettings.Production.json" >> .gitignore

# 7. Git history cleanup — REMOVE leaked secrets from history (thirty minutes)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch \
    PriceWatchInventoryAutomation/appsettings.json \
    PriceWatchInventoryAutomation/appsettings.Development.json" \
  --prune-empty --tag-name-filter cat -- --all
```

---

### Source Citations for HITL Verification

| Ref | File | Line | Finding |
|-----|------|------|---------|
| SRC-01 | [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:9) | nine | JWT Key hardcoded |
| SRC-02 | [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:18) | eighteen | DB credentials hardcoded |
| SRC-03 | [`appsettings.json`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/appsettings.json:25) | twenty-five | Shopify token hardcoded |
| SRC-04 | [`JwtExtensions.cs`](extracted_files/inventory_automation/Inventory%20auutomation/JwtTokenAuthentication/JwtExtensions.cs:20) | twenty | JWT SecurityKey const |
| SRC-05 | [`Program.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Program.cs:38) | thirty-eight | AllowAnyOrigin CORS |
| SRC-06 | [`AmazonPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/AmazonPlatformService.cs:22) | twenty-two | AWS credentials hardcoded |
| SRC-07 | [`BestBuyPlatformService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/BestBuyPlatformService.cs:43) | forty-three | BestBuy API key fallback |
| SRC-08 | [`app.global.ts`](extracted_files/angular/src/app/services/app.global.ts:100) | one hundred | BestBuy token in frontend |
| SRC-09 | [`UnitOfWork.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/UOW/UnitOfWork.cs:22) | twenty-two | New repo per property access |
| SRC-10 | [`InventorySyncService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/InventorySyncService.cs:108) | one hundred eight | Idempotency race condition |
| SRC-11 | [`InventorySyncService.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Service/InventorySyncService.cs:282) | two hundred eighty-two | OrderBy(Guid.NewGuid()) |
| SRC-12 | [`StockController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/StockController.cs:221) | two hundred twenty-one | TEMP GUID IMEI swap |
| SRC-13 | [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:24) | twenty-four | No transaction on AddInInventory |
| SRC-14 | [`InventoryRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/InventoryRepository.cs:214) | two hundred fourteen | DecrementInventory sets to zero |
| SRC-15 | [`StockRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/StockRepository.cs:559) | five hundred fifty-nine | Divide-by-zero risk |
| SRC-16 | [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:31) | thirty-one | No rate limiting on login |
| SRC-17 | [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:66) | sixty-six | No refresh token rotation |
| SRC-18 | [`UserController.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Controllers/UserController.cs:113) | one hundred thirteen | Cross-user token revocation |
| SRC-19 | [`login.component.ts`](extracted_files/angular/src/app/pages/login/login.component.ts:52) | fifty-two | Tokens in localStorage |
| SRC-20 | [`SkuRepository.cs`](extracted_files/inventory_automation/Inventory%20auutomation/PriceWatchInventoryAutomation/Repository/SkuRepository.cs:95) | ninety-five | Case-sensitivity mismatch |

---

**🛡️ Sovereign Vow: Step sixty-nine is the goal. This audit is the first step toward a hardened, production-grade VVS. The Will-to-Way directive is engaged.**

**End of Report — Manus Max one point six** 🚀