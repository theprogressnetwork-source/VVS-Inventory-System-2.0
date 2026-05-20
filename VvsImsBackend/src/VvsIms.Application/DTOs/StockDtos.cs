namespace VvsIms.Application.DTOs;

/// <summary>
/// Data transfer object for creating/updating Stock items.
/// </summary>
public class StockDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Storage { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string GradeName { get; set; } = "N/A";
    public decimal Cost { get; set; }
    public string Imei { get; set; } = string.Empty;
    public string? OrderNo { get; set; }
    public DateTime? DateSold { get; set; }
    public DateTime? DateAdded { get; set; }
    public string? Vendor { get; set; }
    public string? InvoiceNumber { get; set; }
    public bool? PhoneCheck { get; set; }
    public bool Rma { get; set; }
    public bool IsManualImei { get; set; }
    public string? OrderStatus { get; set; }
    public bool IsShipped { get; set; }
    public DateTime? ShippedDate { get; set; }
    public DateTime? OrderLandingDate { get; set; }
}

/// <summary>
/// Data transfer object for Inventory aggregate records.
/// </summary>
public class InventoryDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Storage { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string GradeName { get; set; } = "N/A";
    public decimal Cost { get; set; }
    public int Quantity { get; set; }
    public bool Winning { get; set; }
    public string Platform { get; set; } = "BestBuy";
    public decimal? PlatformPrice { get; set; }
    public decimal? PlatformDiscountPrice { get; set; }
    public DateTime? PlatformDiscountStartDate { get; set; }
    public DateTime? PlatformDiscountEndDate { get; set; }
    public short? PlatformQuantity { get; set; }
    public string? PlatformSkuTitle { get; set; }
    public bool? PlatformWinningOffer { get; set; }
    public decimal? PlatformWinnerPrice { get; set; }
    public decimal? PlatformWinnerShippingPrice { get; set; }
    public decimal? PlatformDifference { get; set; }
}

/// <summary>
/// Data transfer object for Product (incoming) items.
/// </summary>
public class ProductDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Storage { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Grade { get; set; }
    public decimal Cost { get; set; }
    public string Imei { get; set; } = string.Empty;
    public string? Vendor { get; set; }
    public string? InvoiceNumber { get; set; }
    public bool? PhoneCheck { get; set; }
}

/// <summary>
/// Data transfer object for ProductSku records.
/// </summary>
public class ProductSkuDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Storage { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string GradeName { get; set; } = "N/A";
    public string? Errors { get; set; }
}

/// <summary>
/// Data transfer object for ChannelMapping records.
/// </summary>
public class ChannelMappingDto
{
    public int MappingId { get; set; }
    public string SystemSKU { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
    public string ChannelSKU { get; set; } = string.Empty;
    public string? ShopSKU { get; set; }
}

/// <summary>
/// Data transfer object for User records (no password/refresh token).
/// </summary>
public class UserDto
{
    public int UserId { get; set; }
    public string? UserFirstName { get; set; }
    public string? UserLastName { get; set; }
    public string? UserPreferredName { get; set; }
    public string? UserPhone { get; set; }
    public string? UserEmail { get; set; }
    public bool IsActive { get; set; }
    public int RoleId { get; set; }
    public string? RoleName { get; set; }
    public string? RolePermissions { get; set; }
}

/// <summary>
/// Data transfer object for authentication requests.
/// </summary>
public class UserLoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Data transfer object for authentication responses.
/// </summary>
public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresInMinutes { get; set; }
    public UserDto User { get; set; } = new();
}

/// <summary>
/// Data transfer object for Notification records.
/// </summary>
public class NotificationDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? RelatedEntity { get; set; }
    public bool IsRead { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

/// <summary>
/// Generic API response wrapper for consistent controller returns.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public string? CorrelationId { get; set; }

    public static ApiResponse<T> Ok(T data, string message = "Success") => new()
    {
        Success = true,
        Message = message,
        Data = data
    };

    public static ApiResponse<T> Fail(string message, string? correlationId = null) => new()
    {
        Success = false,
        Message = message,
        CorrelationId = correlationId
    };
}
