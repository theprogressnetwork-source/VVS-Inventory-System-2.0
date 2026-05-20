using System;
using System.Collections.Generic;

namespace VvsIms.Application.DTOs
{
    public class SyncEventRequest
    {
        public string Channel { get; set; } = string.Empty;
        public string EventId { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public string RawOrderState { get; set; } = string.Empty;
        public List<(string channelSku, int qty, string imei)> Items { get; set; } = new();
    }

    public class SyncEventResponse
    {
        public bool Success { get; set; }
        public string Result { get; set; } = string.Empty;
    }

    public class PlatformOrderDto
    {
        public string OrderId { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string Imei { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public DateTime OrderDate { get; set; }
        public string OrderStatus { get; set; } = string.Empty;
    }

    public class StockUpdateResult
    {
        public string Skku { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}
