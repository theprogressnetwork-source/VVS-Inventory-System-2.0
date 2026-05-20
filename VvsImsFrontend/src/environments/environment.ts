// ============================================================
// VVS IMS — Environment Configuration (Development Default)
// CRITICAL-008 FIX: Replaced hardcoded IP with localhost backend
// ============================================================
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  apiVersion: 'v1',
  enableInventoryAutoSync: false,
};
