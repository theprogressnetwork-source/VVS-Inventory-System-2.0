using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace VvsIms.Application.Services
{
    public interface IInventorySyncService
    {
        /// <summary>
        /// Processes a channel event with idempotency checks and sync locking.
        /// </summary>
        Task<(bool success, object result)> ProcessChannelEventAsync(
            string channelName,
            string eventId,
            DateTime orderDate,
            string rawOrderState,
            List<(string channelSku, int qty, string imei)> items);

        /// <summary>
        /// Handles cancellation or return of orders.
        /// </summary>
        Task<(bool success, string message)> HandleCancelOrReturnAsync(
            string channelName,
            string orderNo,
            string systemSku,
            string action,
            int quantity);

        /// <summary>
        /// Automatically syncs orders from all channels.
        /// </summary>
        Task AutoSyncOrdersAsync();

        /// <summary>
        /// Propagates stock updates to all channels.
        /// </summary>
        Task<(bool success, object result)> PropagateStockUpdateAsync(IEnumerable<string> systemSkus);
    }
}