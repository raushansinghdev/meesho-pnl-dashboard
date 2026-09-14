import { Upload, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import KPICards from '../components/Dashboard/KPICards';
import StatusBreakdown from '../components/Dashboard/StatusBreakdown';
import PnLWaterfall from '../components/Dashboard/PnLWaterfall';
import MarginTable from '../components/Dashboard/MarginTable';

export default function DashboardPage({ pnlData }) {
  if (!pnlData) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-header__title">Overview</h1>
          <p className="page-header__subtitle">Upload a payment file to see your P&L analysis</p>
        </div>
        <div className="page-body">
          <div className="card empty-state">
            <Upload size={40} className="empty-state__icon" />
            <h2 className="empty-state__title">No data yet</h2>
            <p className="empty-state__subtitle">
              Go to Upload, drop your Meesho payment file, and compute your P&L.
            </p>
            <Link to="/upload" className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}>
              Go to Upload
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { overall, sku_rows, status_breakdown, unmapped_skus, review_orders } = pnlData;

  const marginPct = overall.net_settlement > 0
    ? ((overall.net_profit / overall.net_settlement) * 100).toFixed(2)
    : 0;
  const avgPerOrder = overall.total_orders > 0
    ? (overall.net_profit / overall.total_orders).toFixed(2)
    : 0;

  // Find delivered count for the mini stat
  const deliveredItem = status_breakdown?.find(s => s.status === 'delivered');
  const deliveredCount = deliveredItem?.order_count || 0;
  const deliveredPct = overall.total_orders > 0
    ? Math.round((deliveredCount / overall.total_orders) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">
          <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
          Overview
        </h1>
        <p className="page-header__subtitle">
          {overall.payment_window_start} → {overall.payment_window_end}
        </p>
      </div>

      <div className="page-body">
        {/* ── Hero Banner ──────────────────────────────────── */}
        <div className="hero-banner animate-in">
          <div className="hero-banner__left">
            <div className="hero-banner__label">
              <span className="dot" />
              NET PROFIT
            </div>
            <div className="hero-banner__value">
              ₹{Math.abs(overall.net_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="hero-banner__tags">
              <span className="hero-banner__tag">
                ↗ {marginPct}% margin
              </span>
              <span className="hero-banner__tag">
                ₹{avgPerOrder} avg/order
              </span>
            </div>
          </div>

          <div className="hero-banner__right">
            <div className="hero-stats">
              <div className="hero-stats__row">
                <span className="hero-stats__pct">{deliveredPct}%</span>
                <span className="hero-stats__label">DELIVERED</span>
              </div>
              <div className="hero-stats__row">
                <span className="hero-stats__number">{overall.total_orders}</span>
                <span className="hero-stats__label">Total Orders</span>
              </div>
              <div className="hero-stats__row">
                <span className="hero-stats__number">{deliveredCount}</span>
                <span className="hero-stats__label">Delivered</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────── */}
        <KPICards overall={overall} status_breakdown={status_breakdown} />

        {/* ── Two Donut Charts ─────────────────────────────── */}
        <div className="grid-2">
          <PnLWaterfall overall={overall} />
          <StatusBreakdown breakdown={status_breakdown} />
        </div>

        {/* ── Product-wise P&L Table ───────────────────────── */}
        <div className="grid-full">
          <MarginTable skuRows={sku_rows} />
        </div>

        {/* ── Warnings ─────────────────────────────────────── */}
        {(unmapped_skus?.length > 0 || review_orders?.length > 0) && (
          <div className="grid-full">
            <div className="card" style={{ borderColor: 'var(--warning-muted)' }}>
              {unmapped_skus?.length > 0 && (
                <div style={{ marginBottom: review_orders?.length > 0 ? 'var(--space-5)' : 0 }}>
                  <div className="section-title" style={{ color: 'var(--warning)', marginBottom: 'var(--space-2)' }}>
                    ⚠️ {unmapped_skus.length} Unmapped SKU(s)
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                    These SKUs have no cost mapping — their COGS is ₹0. Add them in Costs and recompute.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {unmapped_skus.map(u => (
                      <span key={u.sku} className="badge badge--warning">
                        {u.sku} ({u.order_count} orders)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {review_orders?.length > 0 && (
                <div>
                  <div className="section-title" style={{ color: 'var(--info)', marginBottom: 'var(--space-2)' }}>
                    ℹ️ {review_orders.length} Order(s) with No Status
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                    COGS defaulted to unresolved rate for these.
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ maxWidth: 450 }}>
                      <thead>
                        <tr>
                          <th>Sub Order No</th>
                          <th>SKU</th>
                          <th style={{ textAlign: 'right' }}>Settlement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {review_orders.map(r => (
                          <tr key={r.sub_order_no}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.sub_order_no}</td>
                            <td>{r.sku}</td>
                            <td className="number">₹{r.net_settlement?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
