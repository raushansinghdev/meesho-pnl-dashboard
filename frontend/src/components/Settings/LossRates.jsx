import { Info } from 'lucide-react';

/**
 * LossRates — Compact inline sliders for COGS loss-rate assumptions.
 * Each rate represents the fraction of COGS charged for that outcome.
 */
export default function LossRates({ lossRates, onChange }) {
  const fields = [
    {
      key: 'rto',
      label: 'RTO Making Cost',
      tip: 'Item returns to inventory',
      detail: 'Fraction of making cost charged when the buyer never accepted delivery. Default 0% — assumes item returns to inventory resellable.',
      default: 0,
    },
    {
      key: 'returnRate',
      label: 'Return',
      tip: 'Buyer returned after delivery',
      detail: 'Fraction of making cost charged when the buyer accepted then returned. Default 100% — assumes damaged/swapped/unsellable in most real cases.',
      default: 1,
    },
    {
      key: 'lost',
      label: 'Lost',
      tip: 'Courier lost the shipment',
      detail: 'Fraction of making cost charged when the courier lost the shipment. Default 100% — item is genuinely gone.',
      default: 1,
    },
    {
      key: 'unresolved',
      label: 'Unresolved',
      tip: 'Outcome not yet confirmed',
      detail: 'Fraction of making cost charged for orders whose outcome is not yet known. Default 0% — conservative, don\'t charge cost until outcome confirmed.',
      default: 0,
    },
    {
      key: 'rto_packaging_loss',
      label: 'RTO Packaging Loss',
      tip: 'Packaging lost on RTOs',
      detail: 'Fraction of packaging cost charged when an order is returned to origin (RTO). Default 100% — assumes packaging material is consumed.',
      default: 1,
    },
    {
      key: 'return_packaging_loss',
      label: 'Return Packaging Loss',
      tip: 'Packaging lost on Returns',
      detail: 'Fraction of packaging cost charged when an order is returned by the customer. Default 100% — assumes packaging material is consumed.',
      default: 1,
    },
  ];

  const handleChange = (key, value) => {
    onChange({ ...lossRates, [key]: parseFloat(value) });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
      {fields.map(field => {
        const value = lossRates[field.key] ?? field.default;
        return (
          <div key={field.key} style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                {field.label}
                <div className="tooltip-wrapper">
                  <Info size={14} style={{ color: 'var(--text-tertiary)', cursor: 'help' }} />
                  <div className="tooltip-content">{field.detail}</div>
                </div>
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent)' }}>
                {Math.round(value * 100)}%
              </span>
            </div>
            <input
              type="range"
              className="slider"
              min="0"
              max="1"
              step="0.05"
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
              {field.tip}
            </div>
          </div>
        );
      })}
    </div>
  );
}
