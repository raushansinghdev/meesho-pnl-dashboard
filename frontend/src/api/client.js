/**
 * API client for the Meesho P&L backend.
 *
 * All endpoints are proxied through nginx in production (/api/...).
 * In dev, Vite's proxy handles it (see vite.config.js).
 */

const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Upload ──────────────────────────────────────────────────────

export async function uploadPaymentFile(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/upload/payment-file`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Upload failed');
  }

  return res.json();
}

export async function uploadOrdersFile(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/upload/orders-file`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Upload failed');
  }

  return res.json();
}

// ── P&L ─────────────────────────────────────────────────────────

export async function computePnL(paymentFileId, ordersFileId = null, lossRates = {}) {
  return request('/pnl/compute', {
    method: 'POST',
    body: JSON.stringify({
      payment_file_id: paymentFileId,
      orders_file_id: ordersFileId,
      loss_rates: {
        rto: lossRates.rto ?? 0.0,
        return_rate: lossRates.returnRate ?? 1.0,
        lost: lossRates.lost ?? 1.0,
        unresolved: lossRates.unresolved ?? 0.0,
      },
    }),
  });
}

export async function getResults(resultId) {
  return request(`/pnl/results/${resultId}`);
}

// ── SKU Costs ───────────────────────────────────────────────────

export async function listSKUCosts() {
  return request('/sku/costs');
}

export async function bulkUpdateCosts(costs) {
  return request('/sku/costs', {
    method: 'PUT',
    body: JSON.stringify({ costs }),
  });
}

export async function updateSingleCost(sku, makingCost, packagingCost) {
  return request(`/sku/costs/${encodeURIComponent(sku)}`, {
    method: 'PUT',
    body: JSON.stringify({
      making_cost: makingCost,
      packaging_cost: packagingCost,
    }),
  });
}

export async function importCosts(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/sku/costs/import`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Import failed');
  }

  return res.json();
}

export async function exportCosts() {
  const res = await fetch(`${API_BASE}/sku/costs/export`);
  if (!res.ok) throw new Error('Export failed');
  return res.json();
}

// ── Health ──────────────────────────────────────────────────────

export async function healthCheck() {
  return request('/health');
}
