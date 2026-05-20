using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace VvsIms.Application.DTOs
{
    /// <summary>
    /// Data Transfer Objects for Product-related operations
    /// </summary>
    public class ProductRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string Sku { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
    }

    public class ProductResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OutgoingRequest
    {
        public string OrderNo { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string Imei { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public bool IsPending { get; set; }
    }

    public class PendingResponse
    {
        public int Id { get; set; }
        public string OrderNo { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string Imei { get; set; } = string.Empty;
        public DateTime Date { get; set; }
    }

    public class StockUpdateRequest
    {
        public string Imei { get; set; } = string.Empty;
        public string NewImei { get; set; } = string.Empty;
        public string OrderNo { get; set; } = string.Empty;
        public string OrderStatus { get; set; } = string.Empty;
    }

    public class SkuGenerationRequest
    {
        public string Model { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Grade { get; set; }
    }

    public class SkuResponse
    {
        public string Sku { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Grade { get; set; }
    }

    public class InventoryResponse
    {
        public string Sku { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Grade { get; set; }
        public int Quantity { get; set; }
        public decimal Cost { get; set; }
    }

    public class ChannelMappingRequest
    {
        public string SystemSKU { get; set; } = string.Empty;
        public string ChannelName { get; set; } = string.Empty;
        public string ChannelSKU { get; set; } = string.Empty;
        public string ShopSKU { get; set; } = string.Empty;
    }

    public class ChannelMappingResponse
    {
        public int Id { get; set; }
        public string SystemSKU { get; set; } = string.Empty;
        public string ChannelName { get; set; } = string.Empty;
        public string ChannelSKU { get; set; } = string.Empty;
        public string ShopSKU { get; set; } = string.Empty;
    }

    public class WinningSheetRequest
    {
        public string Sku { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Grade { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal Cost { get; set; }
    }

    public class OrdersExcelRequest
    {
        public string OrderNo { get; set; } = string.Empty;
        public string Imei { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public string OrderStatus { get; set; } = string.Empty;
    }
}
