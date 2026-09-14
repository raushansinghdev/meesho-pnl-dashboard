import React from 'react';
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
    { 
      name: 'Settlement', 
      value: overall.net_settlement, 
      type: 'settlement',
      detail: 'Total amount deposited by Meesho to your bank account' 
    },
    { 
      name: 'COGS (Delivered)', 
      value: -(overall.cogs_making - overall.cogs_making_lost), 
      type: 'negative',
      detail: 'Making cost for successfully delivered orders only.'
    },
    { 
      name: 'Packaging', 
      value: -(overall.cogs_packaging - overall.cogs_packaging_lost), 
      type: 'negative',
      detail: 'Packaging cost for successfully delivered orders only.'
    },
    { 
      name: 'Pkg Loss (RTO)', 
      value: -overall.cogs_packaging_lost, 
      type: 'negative',
      detail: `Customer Return Loss: ₹${Math.abs(overall.packaging_loss_return || 0).toLocaleString('en-IN')}\nCourier Return Loss: ₹${Math.abs(overall.packaging_loss_rto || 0).toLocaleString('en-IN')}`
    },
    { 
      name: 'Return Loss', 
      value: -overall.cogs_making_lost, 
      type: 'negative',
      detail: `Customer Return Loss: ₹${Math.abs(overall.making_loss_return || 0).toLocaleString('en-IN')}\nCourier Return Loss: ₹${Math.abs(overall.making_loss_rto || 0).toLocaleString('en-IN')}\n\nReverse Shipping Penalty: ₹${Math.abs(overall.return_shipping_charge || 0).toLocaleString('en-IN')} (Already deducted from Settlement)`
    },
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
      barFill: step.type === 'settlement' ? '#f59e0b' : (barValue >= 0 ? '#10b981' : '#f43f5e'),
      rawValue: barValue,
      detail: step.detail
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const val = item.rawValue !== undefined ? item.rawValue : item.value;
    return (
      <div style={{
        backgroundColor: '#1e2130',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.5,
        color: '#e2e4ea',
        whiteSpace: 'pre-line',
        maxWidth: 220,
        boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ color: '#e2e4ea', marginBottom: 'var(--space-1)' }}>{item.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: val >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {val >= 0 ? '+' : '−'}₹{Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        {item.detail && (
          <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: '#9aa0b0', whiteSpace: 'pre-line' }}>
            {item.detail}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card animate-in animate-in-delay-4">
      <div className="section-title">
        <span>P&L Waterfall</span>
      </div>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 50, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
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
                <Cell 
                  key={index} 
                  fill={entry.barFill} 
                  fillOpacity={1}
                  className="chart-cell waterfall-bar"
                  stroke="none"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
