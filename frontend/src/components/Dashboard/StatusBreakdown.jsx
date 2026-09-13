import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_COLORS = {
  delivered: '#10b981',
  exchange: '#06b6d4',
  rto: '#f59e0b',
  return: '#f43f5e',
  cancelled: '#6b7280',
  lost: '#8b5cf6',
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
 * StatusBreakdown — Donut chart showing order-status distribution.
 */
export default function StatusBreakdown({ breakdown }) {
  if (!breakdown || breakdown.length === 0) return null;

  const data = breakdown.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.order_count,
    settlement: item.total_settlement,
    percentage: item.percentage,
    color: STATUS_COLORS[item.status] || '#374151',
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        fontSize: 'var(--text-sm)',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
          {d.name}
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          {d.value} orders ({d.percentage}%)
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>
          ₹{d.settlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>
    );
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
            {entry.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-card animate-in animate-in-delay-5">
      <div className="section-title">
        <span>Order Status Distribution</span>
      </div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
