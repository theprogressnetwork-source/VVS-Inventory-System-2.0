namespace VvsIms.Domain.ValueObjects;

/// <summary>
/// Money value object — wraps decimal amounts with currency safety.
/// Prevents accidental double/float arithmetic and enforces CAD default.
/// Replaces raw double/decimal price fields from the contractor's codebase.
/// </summary>
public class Money
{
    /// <summary>
    /// Monetary amount. Always stored as decimal for precision.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// ISO 4217 currency code. Defaults to CAD for the VVS Canadian market.
    /// </summary>
    public string Currency { get; set; } = "CAD";

    public Money() { }

    public Money(decimal amount, string currency = "CAD")
    {
        Amount = amount;
        Currency = currency;
    }

    /// <summary>
    /// Implicit conversion from decimal for convenient assignment.
    /// </summary>
    public static implicit operator Money(decimal amount) => new(amount);

    /// <summary>
    /// Implicit conversion to decimal for arithmetic operations.
    /// </summary>
    public static implicit operator decimal(Money? money) => money?.Amount ?? 0m;

    /// <summary>
    /// Zero money value in CAD.
    /// </summary>
    public static Money Zero => new(0m, "CAD");

    /// <summary>
    /// Returns a formatted string representation (e.g., "$1,299.99 CAD").
    /// </summary>
    public override string ToString() => $"{Amount:C} {Currency}";
}
