const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

async function downloadCSV(url, filename) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error('CSV download error:', err);
  }
}

async function request(endpoint, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const csrfToken = getCookie('csrftoken');
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
    headers['X-CSRFToken'] = csrfToken;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers,
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.account_locked) {
      localStorage.removeItem('user');
      const { showLockoutAlert } = await import('../utils/swalHelper');
      showLockoutAlert(body.remaining_seconds || 0);
      await new Promise(r => setTimeout(r, 2000));
      window.location.href = '/?locked=' + (body.remaining_seconds || 0);
      await new Promise(() => {});
    }
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    Object.assign(err, body);
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (data) => request('/login/', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/me/'),
  logout: () => request('/logout/', { method: 'POST' }),
  getDashboardStats: () => request('/dashboard-stats/'),

  getProducts: () => request('/products/'),
  createProduct: (data) => request('/products/', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveProduct: (id) => request(`/products/${id}/`, { method: 'DELETE' }),
  getProductDropdown: () => request('/products/dropdown/'),
  getArchivedProducts: () => request('/products/archived/'),
  unarchiveProduct: (id) => request(`/products/${id}/unarchive/`, { method: 'PATCH' }),
  permanentDeleteProduct: (id) => request(`/products/${id}/permanent_delete/`, { method: 'DELETE' }),

  getCategories: () => request('/categories/'),
  createCategory: (data) => request('/categories/', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveCategory: (id) => request(`/categories/${id}/`, { method: 'DELETE' }),
  getArchivedCategories: () => request('/categories/archived/'),
  unarchiveCategory: (id) => request(`/categories/${id}/unarchive/`, { method: 'PATCH' }),
  permanentDeleteCategory: (id) => request(`/categories/${id}/permanent_delete/`, { method: 'DELETE' }),

  getSuppliers: () => request('/suppliers/'),
  createSupplier: (data) => request('/suppliers/', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id, data) => request(`/suppliers/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveSupplier: (id) => request(`/suppliers/${id}/`, { method: 'DELETE' }),
  getArchivedSuppliers: () => request('/suppliers/archived/'),
  unarchiveSupplier: (id) => request(`/suppliers/${id}/unarchive/`, { method: 'PATCH' }),
  permanentDeleteSupplier: (id) => request(`/suppliers/${id}/permanent_delete/`, { method: 'DELETE' }),

  getStockLedger: () => request('/stock-ledger/'),
  createStockLedger: (data) => request('/stock-ledger/', { method: 'POST', body: JSON.stringify(data) }),

  getNotifications: () => request('/notifications/'),
  markNotificationRead: (id) => request(`/notifications/${id}/mark_read/`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/mark_all_read/', { method: 'PUT' }),
  deleteNotification: (id) => request(`/notifications/${id}/`, { method: 'DELETE' }),
  clearAllNotifications: () => request('/notifications/clear_all/', { method: 'DELETE' }),
  getPosSalesToday: () => request('/integration/pos-sales/'),
  exportProductsCSV: () => downloadCSV(`${BASE_URL}/products/export/csv/`, 'products.csv'),
  exportStockLedgerCSV: () => downloadCSV(`${BASE_URL}/stock-ledger/export/csv/`, 'stock_ledger.csv'),
  exportInventoryReportCSV: () => downloadCSV(`${BASE_URL}/dashboard/inventory-report/export/csv/`, 'inventory_report.csv'),
};
