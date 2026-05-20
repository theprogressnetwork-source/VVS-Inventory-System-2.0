import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-channels',
  imports: [CommonModule, FormsModule],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss'
})
export class ChannelsComponent {
  // ----- Dummy Data -----
  channels = ['Amazon', 'Shopify', 'BestBuy'];

  // Inventory Table
  inventory = [
    { productId: 1, sku: 'SKU-001', productName: 'Wireless Mouse', quantity: 50 },
    { productId: 2, sku: 'SKU-002', productName: 'Bluetooth Keyboard', quantity: 30 },
    { productId: 3, sku: 'SKU-003', productName: 'USB-C Cable', quantity: 100 },
  ];

  // Channel SKU Mapping
  skuMappings = [
    { channel: 'Amazon', channelSku: 'AMZ-001', systemSku: 'SKU-001' },
    { channel: 'Amazon', channelSku: 'AMZ-002', systemSku: 'SKU-002' },
    { channel: 'Shopify', channelSku: 'SHP-001', systemSku: 'SKU-001' },
    { channel: 'BestBuy', channelSku: 'BBY-003', systemSku: 'SKU-003' },
  ];

  // Orders placed (dummy)
  orders: any[] = [];

  // ----- Selected Channel / SKU -----
  selectedChannel: string = '';
  selectedSku: string = '';
  selectedQty: number = 1;

  getChannelSkus(): string[] {
    if (!this.selectedChannel) return [];
    return this.skuMappings
      .filter(m => m.channel === this.selectedChannel)
      .map(m => m.channelSku);
  }

  // ----- Place Order -----
  placeOrder() {
    if (!this.selectedChannel || !this.selectedSku || this.selectedQty <= 0) {
      alert('Please fill all fields properly!');
      return;
    }

    const map = this.skuMappings.find(
      m => m.channel === this.selectedChannel && m.channelSku === this.selectedSku
    );

    if (!map) {
      alert('SKU mapping not found!');
      return;
    }

    const product = this.inventory.find(i => i.sku === map.systemSku);
    if (!product) {
      alert('Product not found!');
      return;
    }

    if (product.quantity < this.selectedQty) {
      alert('Insufficient stock!');
      return;
    }

    // Deduct quantity
    product.quantity -= this.selectedQty;

    // Add to dummy orders
    this.orders.push({
      orderId: this.orders.length + 1,
      channel: this.selectedChannel,
      channelSku: this.selectedSku,
      systemSku: map.systemSku,
      qty: this.selectedQty,
      timestamp: new Date()
    });

    // Reset form
    this.selectedQty = 1;

    alert(`Order placed on ${this.selectedChannel} for ${this.selectedQty} unit(s).`);
  }
}
