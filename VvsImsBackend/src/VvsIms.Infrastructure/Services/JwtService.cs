using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using VvsIms.Application.Interfaces;

namespace VvsIms.Infrastructure.Services;

/// <summary>
/// Secure JWT service — reads signing key, issuer, and audience from
/// environment variables. NEVER hardcodes secrets.
/// Implements IJwtService from the Application layer for Clean Architecture compliance.
/// </summary>
public class JwtService : IJwtService
{
    private readonly string _signingKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _accessTokenMinutes;
    private readonly int _refreshTokenDays;

    public JwtService(
        string signingKey,
        string issuer,
        string audience,
        int accessTokenMinutes = 480,
        int refreshTokenDays = 7)
    {
        _signingKey = signingKey ?? throw new ArgumentNullException(nameof(signingKey));
        _issuer = issuer ?? throw new ArgumentNullException(nameof(issuer));
        _audience = audience ?? throw new ArgumentNullException(nameof(audience));
        _accessTokenMinutes = accessTokenMinutes;
        _refreshTokenDays = refreshTokenDays;
    }

    /// <summary>
    /// Generates a JWT access token for the given user claims.
    /// </summary>
    public string GenerateAccessToken(long userId, string email, string role, int roleId)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, role),
            new("RoleId", roleId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_accessTokenMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Generates a cryptographically secure refresh token.
    /// </summary>
    public string GenerateRefreshToken()
    {
        return Convert.ToBase64String(Guid.NewGuid().ToByteArray())
               + "-" + Convert.ToBase64String(Guid.NewGuid().ToByteArray());
    }

    /// <summary>
    /// Gets the expiry date for a new refresh token.
    /// </summary>
    public DateTime GetRefreshTokenExpiry() => DateTime.UtcNow.AddDays(_refreshTokenDays);

    /// <summary>
    /// Returns the TokenValidationParameters for JWT authentication middleware.
    /// </summary>
    public TokenValidationParameters GetValidationParameters()
    {
        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _issuer,
            ValidAudience = _audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_signingKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    }
}
