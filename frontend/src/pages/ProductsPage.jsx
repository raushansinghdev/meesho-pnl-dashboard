import { useState } from 'react';
import { Search, Package, Upload, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProductsPage({ pnlData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Net Profit');

  if (!pnlData) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-header__title">Products</h1>
          <p className="page-header__subtitle">View detailed SKU performance</p>
        </div>
        <div className="page-body">
          <div className="card empty-state">
            <Package size={40} className="empty-state__icon" />
            <h2 className="empty-state__title">No data yet</h2>
            <p className="empty-state__subtitle">
              Go to Upload, drop your Meesho payment file, and compute your P&L first.
            </p>
            <Link to="/upload" className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}>
              <Upload size={16} /> Go to Upload
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { sku_rows, overall } = pnlData;

  const filtered = sku_rows.filter(r =>
    r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.product_name && r.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'Net Profit') return b.profit - a.profit;
    if (sortBy === 'Margin %') return (b.margin_pct || -999) - (a.margin_pct || -999);
    if (sortBy === 'Total Orders') return b.orders - a.orders;
    return 0;
  });

  const fmt = (v) => `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtWhole = (v) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-header__title">
            <Package size={20} style={{ color: 'var(--purple)' }} />
            Products ({sorted.length})
          </h1>
          <p className="page-header__subtitle" style={{ fontFamily: 'var(--font-mono)' }}>
            {overall?.payment_window_start} → {overall?.payment_window_end}
          </p>
        </div>

        <div className="products-controls">
          <div className="products-search">
            <Search size={15} className="products-search__icon" />
            <input
              type="text"
              placeholder="Search product or SKU…"
              className="products-search__input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="products-sort">
            <SlidersHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
            <select
              className="products-sort__select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option>Net Profit</option>
              <option>Margin %</option>
              <option>Total Orders</option>
            </select>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="products-grid">
          {sorted.map(row => {
            const isProfit = row.profit > 0;
            const unitCost = row.units > 0 ? (row.cogs_making + row.cogs_packaging) / row.units : 0;
            const avgSalePrice = row.avg_sale_price ?? (row.units > 0 ? row.gross_sale_amount / row.units : 0);
            const delivered = row.delivered_orders ?? 0;
            const rto = row.rto_orders ?? 0;
            const returnOrders = row.return_orders ?? 0;
            const rtoCost = row.rto_cost ?? 0;
            const total = row.orders || 1;
            const deliveredPct = (delivered / total) * 100;
            const rtoPct = (rto / total) * 100;
            const returnPct = (returnOrders / total) * 100;
            const otherPct = 100 - deliveredPct - rtoPct - returnPct;

            return (
              <div key={row.sku} className="product-card">
                {/* ── Header ── */}
                <div className="product-card__header">
                  <div className="product-card__icon">
                    <Package size={18} />
                  </div>
                  <div className="product-card__title-block">
                    <div className="product-card__name">
                      {row.product_name || row.sku}
                    </div>
                    <div className="product-card__sku">{row.sku}</div>
                  </div>
                </div>

                {/* ── Badges ── */}
                <div className="product-card__badges">
                  <span className="product-badge">
                    {fmtWhole(avgSalePrice)} LP
                  </span>
                  <span className="product-badge">
                    {fmtWhole(unitCost)} cost
                  </span>
                </div>

                {/* ── Order Stats ── */}
                <div className="product-card__stats">
                  <div className="product-stat">
                    <span className="product-stat__value">{row.orders}</span>
                    <span className="product-stat__label">TOTAL</span>
                  </div>
                  <div className="product-stat">
                    <span className="product-stat__value">{delivered}</span>
                    <span className="product-stat__label">DELIVERED</span>
                  </div>
                  <div className="product-stat">
                    <span className="product-stat__value">{rto}</span>
                    <span className="product-stat__label">RTO</span>
                  </div>
                  <div className="product-stat">
                    <span className="product-stat__value">{returnOrders}</span>
                    <span className="product-stat__label">RETURN</span>
                  </div>
                </div>

                {/* ── Progress Bar ── */}
                <div className="product-card__bar">
                  {deliveredPct > 0 && <div className="product-bar__seg product-bar__seg--success" style={{ width: `${deliveredPct}%` }} />}
                  {rtoPct > 0 && <div className="product-bar__seg product-bar__seg--danger" style={{ width: `${rtoPct}%` }} />}
                  {returnPct > 0 && <div className="product-bar__seg product-bar__seg--warning" style={{ width: `${returnPct}%` }} />}
                  {otherPct > 0 && <div className="product-bar__seg product-bar__seg--muted" style={{ width: `${otherPct}%` }} />}
                </div>

                {/* ── Financials ── */}
                <div className="product-card__financials">
                  <div className="product-fin-row">
                    <span>Settlement</span>
                    <span className="product-fin-row__val">{fmt(row.net_settlement)}</span>
                  </div>
                  <div className="product-fin-row">
                    <span>Item Cost</span>
                    <span className="product-fin-row__val">{fmt(row.cogs)}</span>
                  </div>
                  {rtoCost > 0 && (
                    <div className="product-fin-row">
                      <span>RTO Cost</span>
                      <span className="product-fin-row__val product-fin-row__val--danger">{fmt(rtoCost)}</span>
                    </div>
                  )}
                </div>

                {/* ── Profit Footer ── */}
                <div className="product-card__footer">
                  <div>
                    <div className="product-card__footer-label">Net Profit</div>
                    <div className={`product-card__profit ${isProfit ? 'product-card__profit--up' : 'product-card__profit--down'}`}>
                      {fmt(row.profit)}
                    </div>
                  </div>
                  {row.margin_pct !== null && (
                    <div className={`product-card__margin ${isProfit ? 'product-card__margin--up' : 'product-card__margin--down'}`}>
                      {row.margin_pct}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
            No products found matching "{searchTerm}"
          </div>
        )}
      </div>
    </>
  );
}
