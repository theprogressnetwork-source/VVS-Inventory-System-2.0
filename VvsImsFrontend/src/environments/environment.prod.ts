// ============================================================
// VVS IMS — Environment Configuration (Production)
// CRITICAL-008 FIX: Relative /api path for same-origin deployment
// ============================================================
export const environment = {
  production: true,
  apiUrl: '/api',
  apiVersion: 'v1',
  enableInventoryAutoSync: true,
};
