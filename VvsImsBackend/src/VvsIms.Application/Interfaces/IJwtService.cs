using Microsoft.IdentityModel.Tokens;

namespace VvsIms.Application.Interfaces;

/// <summary>
/// JWT service interface — defined in the Application layer to respect
/// Clean Architecture's dependency inversion rule. Infrastructure provides
/// the concrete implementation.
/// </summary>
public interface IJwtService
{
    /// <summary>
    /// Generates a JWT access token for the given user claims.
    /// </summary>
    string GenerateAccessToken(long userId, string email, string role, int roleId);

    /// <summary>
    /// Generates a cryptographically secure refresh token.
    /// </summary>
    string GenerateRefreshToken();

    /// <summary>
    /// Gets the expiry date for a new refresh token.
    /// </summary>
    DateTime GetRefreshTokenExpiry();

    /// <summary>
    /// Returns the TokenValidationParameters for JWT authentication middleware.
    /// </summary>
    TokenValidationParameters GetValidationParameters();
}
