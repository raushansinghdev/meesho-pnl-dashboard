import { useState, useMemo } from 'react';
import { Search, Download, ArrowUpDown, ArrowRight } from 'lucide-react';

/**
 * MarginTable — Clean product-wise P&L table with row numbers,
 * sorting, search, and CSV export.
 */
export default function MarginTable({ skuRows }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('profit');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

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

  const displayed = showAll ? filtered : filtered.slice(0, 15);

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
    const headers = ['#', 'Product', 'Qty', 'Revenue', 'COGS', 'Profit', 'Margin %'];
    const csvRows = skuRows.map((r, i) => [
      i + 1, r.sku, r.units, r.net_settlement, r.cogs, r.profit, r.margin_pct ?? ''
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
    { key: 'sku', label: 'Product', align: 'left' },
    { key: 'units', label: 'Qty', align: 'right' },
    { key: 'net_settlement', label: 'Settlement', align: 'right' },
    { key: 'cogs', label: 'Item Cost', align: 'right' },
    { key: 'profit', label: 'Profit', align: 'right' },
    { key: 'margin_pct', label: 'Margin', align: 'right' },
  ];

  if (!skuRows) return null;

  return (
    <div className="card animate-in animate-in-delay-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="section-title">Product-wise P&L</div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="search-input">
            <Search size={13} className="search-input__icon" />
            <input
              type="text"
              className="input"
              placeholder="Search SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 180 }}
            />
          </div>
          <button className="btn btn--secondary btn--sm" onClick={handleExport}>
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 500 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: 40 }}>#</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={sortKey === col.key ? 'sorted' : ''}
                  style={{ textAlign: col.align }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <ArrowUpDown size={9} style={{ marginLeft: 3, opacity: 0.7 }} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, idx) => (
              <tr key={row.sku}>
                <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>{row.sku}</td>
                <td className="number">{row.units}</td>
                <td className="number">{fmt(row.net_settlement)}</td>
                <td className="number">{fmt(row.cogs)}</td>
                <td className={`number ${row.profit >= 0 ? 'positive' : 'negative'}`}>
                  {fmt(row.profit)}
                </td>
                <td className={`number ${row.margin_pct !== null && row.margin_pct >= 0 ? 'positive' : row.margin_pct !== null ? 'negative' : ''}`}>
                  {row.margin_pct !== null ? `${row.margin_pct}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showAll && filtered.length > 15 && (
        <div style={{ textAlign: 'right', marginTop: 'var(--space-3)' }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setShowAll(true)}
            style={{ color: 'var(--accent)' }}
          >
            View All <ArrowRight size={13} />
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-tertiary)' }}>
          No SKUs found matching "{search}"
        </div>
      )}
    </div>
  );
}
