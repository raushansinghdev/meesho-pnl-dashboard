import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

/**
 * PnLWaterfall — Waterfall/bridge chart showing the flow from
 * Revenue → -COGS → -Ads → +Referral → +Comp/Recovery → Net Profit.
 */
export default function PnLWaterfall({ overall }) {
  if (!overall) return null;

  // Build waterfall data: each bar starts where the previous one ended
  const steps = [
    { name: 'Settlement', value: overall.net_settlement, type: 'positive' },
    { name: 'COGS', value: -overall.cogs, type: 'negative' },
    { name: 'Ads', value: overall.ads_cost, type: 'negative' },
    { name: 'Referral', value: overall.referral_income, type: overall.referral_income >= 0 ? 'positive' : 'negative' },
    { name: 'Comp/Rcv', value: overall.compensation_recovery, type: overall.compensation_recovery >= 0 ? 'positive' : 'negative' },
    { name: 'Net Profit', value: overall.net_profit, type: 'total' },
  ];

  // Calculate running totals for waterfall positioning
  let runningTotal = 0;
  const data = steps.map((step) => {
    if (step.type === 'total') {
      return {
        name: step.name,
        value: step.value,
        base: 0,
        barFill: step.value >= 0 ? '#10b981' : '#f43f5e',
      };
    }

    const base = runningTotal;
    const barValue = step.value;
    runningTotal += barValue;

    return {
      name: step.name,
      value: Math.abs(barValue),
      base: barValue >= 0 ? base : base + barValue,
      barFill: barValue >= 0 ? '#10b981' : '#f43f5e',
      rawValue: barValue,
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const val = item.rawValue !== undefined ? item.rawValue : item.value;
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        fontSize: 'var(--text-sm)',
      }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>{item.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: val >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {val >= 0 ? '+' : '−'}₹{Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card animate-in animate-in-delay-3">
      <div className="section-title">
        <span>P&L Waterfall</span>
      </div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <ReferenceLine y={0} stroke="var(--border-medium)" />

            {/* Invisible base bar for waterfall positioning */}
            <Bar dataKey="base" stackId="stack" fill="transparent" />
            <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.barFill} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
