namespace VvsIms.Domain.Entities;

/// <summary>
/// Stock sync lock — enforces a cooldown period between platform
/// stock synchronization runs to prevent race conditions and API throttling.
/// Singleton record (Id = 1).
/// </summary>
public class StockSyncLock : BaseEntity
{
    /// <summary>
    /// UTC timestamp of the last sync execution.
    /// Used to enforce minimum cooldown between syncs.
    /// </summary>
    public DateTime LastSyncAtUtc { get; set; }
}
