// ============================================================
// VVS IMS — Environment Configuration (Dev Override)
// CRITICAL-008 FIX: Replaced hardcoded IP with localhost backend
// ============================================================
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  apiVersion: 'v1',
  enableInventoryAutoSync: false,
};
