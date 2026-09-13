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
 * SKUProfitChart — Horizontal bar chart showing top gainers and losers by SKU.
 */
export default function SKUProfitChart({ skuRows }) {
  if (!skuRows || skuRows.length === 0) return null;

  // Take top 8 profitable + bottom 4 loss-making SKUs
  const sorted = [...skuRows].sort((a, b) => b.profit - a.profit);
  const top = sorted.slice(0, 8);
  const bottom = sorted.filter(s => s.profit < 0).slice(-4).reverse();

  // Deduplicate
  const shown = [...top];
  bottom.forEach(b => {
    if (!shown.find(s => s.sku === b.sku)) shown.push(b);
  });

  const data = shown.map(row => ({
    sku: row.sku.length > 18 ? row.sku.slice(0, 16) + '…' : row.sku,
    fullSku: row.sku,
    profit: Math.round(row.profit * 100) / 100,
    orders: row.orders,
    margin: row.margin_pct,
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
        minWidth: 160,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>{d.fullSku}</div>
        <div style={{ fontFamily: 'var(--font-mono)', color: d.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          Profit: ₹{d.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
          {d.orders} orders · {d.margin !== null ? `${d.margin}% margin` : 'margin N/A'}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card animate-in animate-in-delay-4">
      <div className="section-title">
        <span>SKU Profit Ranking</span>
      </div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
            />
            <YAxis
              type="category"
              dataKey="sku"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-elevated)', fillOpacity: 0.5 }} />
            <ReferenceLine x={0} stroke="var(--border-medium)" />
            <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
