import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * RevenueSplit — Donut chart showing how settlement breaks down:
 * Net Profit, Item Cost (COGS), Ads Spend, and other deductions.
 */
export default function RevenueSplit({ overall }) {
  if (!overall) return null;

  const settlement = overall.net_settlement || 0;
  const cogs = overall.cogs || 0;
  const ads = Math.abs(overall.ads_cost || 0);
  const profit = overall.net_profit || 0;
  const referral = overall.referral_income || 0;
  const comp = overall.compensation_recovery || 0;

  // Meesho fees = settlement - profit - cogs - ads + referral + comp
  // Simplify: show the main cost buckets
  const meeshoFees = Math.max(0, settlement - cogs - ads - profit);

  const data = [
    { name: 'Net Profit', value: Math.max(0, profit), color: '#22c55e' },
    { name: 'Item Cost', value: cogs, color: '#ef4444' },
    { name: 'Ads Spend', value: ads, color: '#f59e0b' },
    { name: 'Meesho Fees', value: meeshoFees, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const fmt = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
    return `₹${v.toFixed(0)}`;
  };

  const fmtFull = (v) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          ₹{fmtFull(d.value)}
        </div>
      </div>
    );
  };

  const CenterLabel = () => (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
      <tspan x="50%" dy="-8" fill="var(--text-primary)" fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">{fmt(settlement)}</tspan>
      <tspan x="50%" dy="20" fill="var(--text-tertiary)" fontSize="10" fontWeight="500">SETTLEMENT</tspan>
    </text>
  );

  return (
    <div className="card animate-in animate-in-delay-4">
      <div className="section-header">
        <div className="section-title">Revenue Split</div>
        <div className="section-count">{fmtFull(settlement)} total</div>
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
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={i} className="donut-legend__item">
                <div className="donut-legend__label">
                  <div className="donut-legend__dot" style={{ background: d.color }} />
                  {d.name}
                </div>
                <div className="donut-legend__values">
                  <span className="donut-legend__count">{fmtFull(d.value)}</span>
                  <span className="donut-legend__pct">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
