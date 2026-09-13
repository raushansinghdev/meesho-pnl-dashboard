import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_COLORS = {
  delivered: '#22c55e',
  exchange: '#06b6d4',
  rto: '#ef4444',
  return: '#f59e0b',
  cancelled: '#6b7280',
  lost: '#a855f7',
  shipped: '#3b82f6',
  unknown: '#374151',
};

const STATUS_LABELS = {
  delivered: 'Delivered',
  exchange: 'Exchange',
  rto: 'RTO',
  return: 'Return',
  cancelled: 'Cancelled',
  lost: 'Lost',
  shipped: 'Shipped',
  unknown: 'Unknown',
};

/**
 * StatusBreakdown — Donut chart with total order count in center
 * and a side legend showing counts + percentages.
 */
export default function StatusBreakdown({ breakdown }) {
  if (!breakdown || breakdown.length === 0) return null;

  const data = breakdown.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.order_count,
    percentage: item.percentage,
    color: STATUS_COLORS[item.status] || '#374151',
  }));

  const totalOrders = data.reduce((sum, d) => sum + d.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-sm)',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
        <div style={{ color: 'var(--text-secondary)' }}>{d.value} orders ({d.percentage}%)</div>
      </div>
    );
  };

  // Custom label in center of the donut
  const CenterLabel = () => (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
      <tspan x="50%" dy="-8" fill="var(--text-primary)" fontSize="24" fontWeight="700" fontFamily="var(--font-mono)">{totalOrders}</tspan>
      <tspan x="50%" dy="22" fill="var(--text-tertiary)" fontSize="11" fontWeight="500">ORDERS</tspan>
    </text>
  );

  return (
    <div className="card animate-in animate-in-delay-3">
      <div className="section-header">
        <div className="section-title">Order Status</div>
        <div className="section-count">{totalOrders} total</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
        {/* Donut */}
        <div style={{ width: 180, height: 180, flexShrink: 0 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <CenterLabel />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="donut-legend" style={{ flex: 1 }}>
          {data.map((d, i) => (
            <div key={i} className="donut-legend__item">
              <div className="donut-legend__label">
                <div className="donut-legend__dot" style={{ background: d.color }} />
                {d.name}
              </div>
              <div className="donut-legend__values">
                <span className="donut-legend__count">{d.value}</span>
                <span className="donut-legend__pct">{d.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
