import { useState, useMemo } from 'react';
import { Search, Download, AlertTriangle, ArrowUpDown } from 'lucide-react';

/**
 * MarginTable — Full SKU-wise P&L table with sorting, search, and CSV export.
 */
export default function MarginTable({ skuRows }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('profit');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    if (!skuRows) return [];
    let rows = skuRows;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.sku.toLowerCase().includes(q));
    }

    rows = [...rows].sort((a, b) => {
      let av = a[sortKey] ?? -Infinity;
      let bv = b[sortKey] ?? -Infinity;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return rows;
  }, [skuRows, search, sortKey, sortAsc]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleExport = () => {
    if (!skuRows?.length) return;
    const headers = ['SKU', 'Orders', 'Units', 'Revenue', 'COGS', 'COGS Making', 'COGS Packaging', 'Profit', 'Margin %'];
    const csvRows = skuRows.map(r => [
      r.sku, r.orders, r.units, r.net_settlement, r.cogs, r.cogs_making, r.cogs_packaging, r.profit, r.margin_pct ?? ''
    ]);
    const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sku_wise_pnl.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v) => v != null ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const columns = [
    { key: 'sku', label: 'SKU', align: 'left' },
    { key: 'orders', label: 'Orders', align: 'right' },
    { key: 'units', label: 'Units', align: 'right' },
    { key: 'net_settlement', label: 'Revenue', align: 'right' },
    { key: 'cogs', label: 'COGS', align: 'right' },
    { key: 'profit', label: 'Profit', align: 'right' },
    { key: 'margin_pct', label: 'Margin %', align: 'right' },
  ];

  if (!skuRows) return null;

  return (
    <div className="glass-card animate-in animate-in-delay-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <span>SKU-wise P&L</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="search-input">
            <Search size={14} className="search-input__icon" />
            <input
              type="text"
              className="input"
              placeholder="Search SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
          </div>
          <button className="btn btn--secondary btn--sm" onClick={handleExport}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 480 }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={sortKey === col.key ? 'sorted' : ''}
                  style={{ textAlign: col.align }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <ArrowUpDown size={10} style={{ marginLeft: 4, opacity: 0.7 }} />
                  )}
                </th>
              ))}
              <th style={{ textAlign: 'center' }}>Cost Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.sku}>
                <td style={{ fontWeight: 500 }}>{row.sku}</td>
                <td className="number">{row.orders}</td>
                <td className="number">{row.units}</td>
                <td className="number">{fmt(row.net_settlement)}</td>
                <td className="number">{fmt(row.cogs)}</td>
                <td className={`number ${row.profit >= 0 ? 'positive' : 'negative'}`}>
                  {fmt(row.profit)}
                </td>
                <td className={`number ${row.margin_pct !== null && row.margin_pct >= 0 ? 'positive' : row.margin_pct !== null ? 'negative' : ''}`}>
                  {row.margin_pct !== null ? `${row.margin_pct}%` : '—'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {row.cost_mapped ? (
                    <span className="badge badge--verified" style={{ fontSize: 'var(--text-xs)' }}>Mapped</span>
                  ) : (
                    <span className="badge badge--warning">
                      <AlertTriangle size={10} />
                      Unmapped
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
          No SKUs found matching "{search}"
        </div>
      )}
    </div>
  );
}
