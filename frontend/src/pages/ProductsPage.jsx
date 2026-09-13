import { useState } from 'react';
import { Search, Package } from 'lucide-react';
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
              Go to Upload
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { sku_rows, overall } = pnlData;

  // Filter and sort
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
  const fmtWhole = (v) => `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-header__title">
            <Package size={20} style={{ color: 'var(--pink)' }} />
            Products ({sorted.length})
          </h1>
          <p className="page-header__subtitle" style={{ fontFamily: 'var(--font-mono)' }}>
            {overall?.payment_window_start} → {overall?.payment_window_end}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search product or SKU" 
              className="input-field"
              style={{ paddingLeft: '36px', width: '260px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Sort by</span>
            <select 
              className="input-field" 
              style={{ width: '140px', cursor: 'pointer' }}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {sorted.map(row => {
            const isProfit = row.profit > 0;
            // cogs_making and cogs_packaging are totals in the backend. Divide by units for unit cost.
            const unitCost = row.units > 0 ? (row.cogs_making + row.cogs_packaging) / row.units : 0;
            
            // Fallbacks in case the backend hasn't been restarted/re-computed yet
            const avgSalePrice = row.avg_sale_price ?? (row.units > 0 ? row.gross_sale_amount / row.units : 0);
            const delivered = row.delivered_orders ?? 0;
            const rto = row.rto_orders ?? 0;
            const returnOrders = row.return_orders ?? 0;
            const rtoCost = row.rto_cost ?? 0;
            
            return (
              <div key={row.sku} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: 'var(--radius-md)', 
                      background: 'var(--purple-muted)', color: 'var(--purple)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Package size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.product_name || row.sku}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        {row.sku}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    <span className="badge badge--info" style={{ fontWeight: 600 }}>
                      {fmtWhole(avgSalePrice)} LP
                    </span>
                    <span className="badge badge--warning" style={{ fontWeight: 600 }}>
                      {fmtWhole(unitCost)} cost
                    </span>
                  </div>
                </div>

                {/* Orders Breakdown */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderTop: '1px solid var(--border-medium)', borderBottom: '1px solid var(--border-medium)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.orders}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>TOTAL</div>
                    <div style={{ height: '3px', background: 'var(--border-medium)', marginTop: '4px', borderRadius: '2px' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{delivered}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>DELIVERED</div>
                    <div style={{ height: '3px', background: 'var(--success)', marginTop: '4px', borderRadius: '2px' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>{rto}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>RTO</div>
                    <div style={{ height: '3px', background: 'var(--danger)', marginTop: '4px', borderRadius: '2px' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>{returnOrders}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>RETURN</div>
                    <div style={{ height: '3px', background: 'var(--warning)', marginTop: '4px', borderRadius: '2px' }} />
                  </div>
                </div>

                {/* Financials */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Settlement</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(row.net_settlement)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Item Cost</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(row.cogs)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>RTO Cost</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(rtoCost)}</span>
                  </div>
                </div>

                {/* Net Profit */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 'var(--space-3)', borderTop: '1px dashed var(--border-medium)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>Net Profit</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                      {fmt(row.profit)}
                    </div>
                  </div>
                  {row.margin_pct !== null && (
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                      {row.margin_pct}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
