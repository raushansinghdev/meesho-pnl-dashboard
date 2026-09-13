import { BarChart3, Upload } from 'lucide-react';
import KPICards from '../components/Dashboard/KPICards';
import PnLWaterfall from '../components/Dashboard/PnLWaterfall';
import SKUProfitChart from '../components/Dashboard/SKUProfitChart';
import StatusBreakdown from '../components/Dashboard/StatusBreakdown';
import MarginTable from '../components/Dashboard/MarginTable';

export default function DashboardPage({ pnlData }) {
  if (!pnlData) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__subtitle">Upload a payment file to see your P&L analysis</p>
        </div>
        <div className="page-body">
          <div className="empty-state glass-card">
            <Upload size={48} className="empty-state__icon" />
            <h2 className="empty-state__title">No data yet</h2>
            <p className="empty-state__subtitle">
              Go to the Upload page, drop your Meesho payment file, and compute your P&L to see the dashboard come alive.
            </p>
          </div>
        </div>
      </>
    );
  }

  const { overall, sku_rows, status_breakdown, unmapped_skus, review_orders } = pnlData;

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">
          <BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--accent)' }} />
          P&L Dashboard
        </h1>
        <p className="page-header__subtitle">
          Payment window: {overall.payment_window_start} → {overall.payment_window_end} · {overall.total_orders} orders · {overall.total_units} units
        </p>
      </div>

      <div className="page-body">
        {/* KPI Hero Cards */}
        <KPICards overall={overall} />

        {/* Charts Row */}
        <div className="grid-charts">
          <PnLWaterfall overall={overall} />
          <StatusBreakdown breakdown={status_breakdown} />
        </div>

        {/* SKU Profit Chart */}
        <div className="grid-full">
          <SKUProfitChart skuRows={sku_rows} />
        </div>

        {/* Full SKU Table */}
        <div className="grid-full">
          <MarginTable skuRows={sku_rows} />
        </div>

        {/* Warnings section */}
        {(unmapped_skus?.length > 0 || review_orders?.length > 0) && (
          <div className="grid-full">
            <div className="glass-card" style={{ borderColor: 'var(--warning-muted)' }}>
              {unmapped_skus?.length > 0 && (
                <div style={{ marginBottom: review_orders?.length > 0 ? 'var(--space-6)' : 0 }}>
                  <div className="section-title" style={{ color: 'var(--warning)' }}>
                    ⚠️ {unmapped_skus.length} Unmapped SKU(s)
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                    These SKUs have no cost in the cost file — their COGS is treated as ₹0, overstating their profit.
                    Add them in the SKU Costs page and recompute.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {unmapped_skus.map(u => (
                      <span key={u.sku} className="badge badge--warning">
                        {u.sku} ({u.order_count} orders · ₹{u.settlement_amount?.toLocaleString('en-IN')})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {review_orders?.length > 0 && (
                <div>
                  <div className="section-title" style={{ color: 'var(--info)' }}>
                    ℹ️ {review_orders.length} Order(s) with No Status
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                    These settled orders had no recognisable status — COGS defaulted to the unresolved rate.
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ maxWidth: 500 }}>
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
