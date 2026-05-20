// ============================================================
// VVS IMS — API Route Constants
// MIGRATION NOTE: This file replaces the old AppGlobal class
// with a const-based approach. The old class exposed a hardcoded
// BestBuy auth token (CRITICAL-010) — that has been REMOVED.
// All external API keys must come from environment or backend.
//
// Components that previously injected AppGlobal should instead
// import API_ROUTES directly:
// import { API_ROUTES } from '@services/app.global';
// ============================================================
import { InjectionToken } from '@angular/core';

export const API_ROUTES_TOKEN = new InjectionToken<typeof API_ROUTES>('API_ROUTES');

export const API_ROUTES = {
  // ── Auth ────────────────────────────────────────────────────
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',

  // ── Users ───────────────────────────────────────────────────
  GET_ALL_USERS: '/users',
  SAVE_USER: '/users',
  GET_USER_BY_ID: '/users/',       // append {id}
  UPDATE_USER: '/users/',          // append {id}
  DELETE_USER: '/users/',          // append {id}

  // ── Inventory ───────────────────────────────────────────────
  GET_ALL_INVENTORY: '/inventory',

  // ── Stock Sync ──────────────────────────────────────────────
  STOCK_SYNC: '/stock/sync',

  // ── Products ────────────────────────────────────────────────
  SAVE_PRODUCTS: '/products',
  UPDATE_PRODUCTS: '/products/stock',
  GET_PRODUCTS: '/products/stock',
  DELETE_PRODUCT: '/products/stock/',  // append {stockId}
  GET_PENDING_PRODUCT: '/products/pending',
  OUTGOING_PRODUCT: '/products/outgoing-group',

  // ── Orders ──────────────────────────────────────────────────
  GET_ORDER_RECEIVED_LIST: '/orders/received',
  ORDER_RECEIVED_IMEI_UPDATE: '/orders/received/imei',
  ORDER_RECEIVED_IMEI_UPDATE_EXCEL: '/orders/received/imei/excel',
  SAVE_ORDER: '/products/outgoing',

  // ── SKU ─────────────────────────────────────────────────────
  SAVE_SKU: '/skus',
  GET_SKU: '/skus',
  UPDATE_SKU: '/skus',
  SKU_BULK_UPLOAD: '/skus/bulk',

  // ── Base Properties ─────────────────────────────────────────
  GET_BASE_PROP: '/base-props',

  // ── Master Data ─────────────────────────────────────────────
  SAVE_MODELS: '/base-props/models',
  GET_MODELS: '/base-props/models',
  SAVE_COLORS: '/base-props/colors',
  GET_COLORS: '/base-props/colors',
  GET_COLORS_BY_MODEL: '/base-props/colors/by-model',
  SAVE_STORAGE: '/base-props/storages',
  GET_STORAGE: '/base-props/storages',
  SAVE_GRADES: '/base-props/grades',
  GET_GRADES: '/base-props/grades',

  // ── Channel Mappings ────────────────────────────────────────
  GET_MAPPINGS: '/mappings',
  SAVE_MAPPINGS: '/mappings',
  DELETE_MAPPING: '/mappings/',  // append {id}

  // ── BestBuy ─────────────────────────────────────────────────
  // NOTE: BestBuy external API calls moved to backend proxy.
  // Frontend should call backend endpoints, NOT BestBuy directly.
  GET_BESTBUY_SKUS: '/integrations/bestbuy/skus',
  GET_LATEST_ORDERS: '/integrations/bestbuy/latest',
  GET_CSV: '/integrations/bestbuy/stock/csv',
  GET_BESTBUY_SHEET: '/integrations/bestbuy/winning-sheet',
  GET_ALL_OFFERS: '/integrations/bestbuy/offers',

  // ── Notifications ───────────────────────────────────────────
  GET_NOTIFICATION: '/notifications/notify',

  // ── Stock Operations ────────────────────────────────────────
  IMEI_UPDATE: '/stock/imei',
  IMEI_UPDATE_SINGLE: '/stock/imei/single',
  SHIPPED_MARK: '/stock/mark-shipped',
  GET_TODAY_ORDERS: '/stock/orders',
  GET_INVENTORY_BY_IMEI: '/stock/inventory-by-imei',
  IMEI_UPDATE_EXCEL: '/stock/imei/excel',

  // ── Shopify ─────────────────────────────────────────────────
  GET_SHOPIFY_SKUS: '/integrations/shopify/active-products',

  // ── Amazon ──────────────────────────────────────────────────
  GET_AMAZON_SKUS: '/integrations/amazon/active-products-reports',

  // ── Reports ─────────────────────────────────────────────────
  GET_INVENTORY_REPORT: '/reports/inventory-by-status',

  // ── Returns ─────────────────────────────────────────────────
  RETURN_ORDERS: '/stock/manual-return',

  // ── Winning Sheet Upload ────────────────────────────────────
  UPLOAD_WININNG_SHEET: '/integrations/bestbuy/winning-sheet/upload',

  // ── Chat / Messages ─────────────────────────────────────────
  GET_ALL_MESSAGES: '/messages',
  THREAD_RESOLVED: '/messages/resolve/',   // append {threadId}
  SEND_THREAD_MESSAGE: '/messages/send/',  // append {threadId}
} as const;

// ── Type-safe route keys ──────────────────────────────────────
export type ApiRouteKey = keyof typeof API_ROUTES;
