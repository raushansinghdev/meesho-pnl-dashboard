/**
 * LossRates — Slider controls for COGS loss-rate assumptions.
 *
 * Each rate represents the fraction of COGS charged for that outcome.
 * Rationale text is drawn from README §3.
 */
export default function LossRates({ lossRates, onChange }) {
  const fields = [
    {
      key: 'rto',
      label: 'RTO Loss Rate',
      description:
        'Fraction of COGS charged when the buyer never accepted delivery. ' +
        'Default 0% — assumes item returns to inventory resellable. ' +
        'Note: under the v2 model, packaging cost is ALWAYS charged for RTOs regardless of this rate.',
      default: 0,
    },
    {
      key: 'returnRate',
      label: 'Customer Return Loss Rate',
      description:
        'Fraction of COGS charged when the buyer accepted then returned. ' +
        'Default 100% — assumes damaged/swapped/unsellable in most real cases. ' +
        'This is a policy judgment, not a measured fact (see §5 of methodology).',
      default: 1,
    },
    {
      key: 'lost',
      label: 'Lost Shipment Loss Rate',
      description:
        'Fraction of COGS charged when the courier lost the shipment. ' +
        'Default 100% — item is genuinely gone.',
      default: 1,
    },
    {
      key: 'unresolved',
      label: 'Unresolved / Shipped Loss Rate',
      description:
        'Fraction of COGS charged for orders whose outcome is not yet known ' +
        '(still "Shipped" or orphan settlement legs with no status). ' +
        'Default 0% — conservative, don\'t charge cost until outcome confirmed.',
      default: 0,
    },
  ];

  const handleSliderChange = (key, value) => {
    onChange({
      ...lossRates,
      [key]: parseFloat(value),
    });
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 600 }}>
      {fields.map(field => {
        const value = lossRates[field.key] ?? field.default;
        return (
          <div key={field.key} className="setting-field">
            <div className="setting-field__header">
              <span className="setting-field__label">{field.label}</span>
              <span className="setting-field__value">{Math.round(value * 100)}%</span>
            </div>
            <input
              type="range"
              className="slider"
              min="0"
              max="1"
              step="0.05"
              value={value}
              onChange={(e) => handleSliderChange(field.key, e.target.value)}
            />
            <div className="setting-field__description">{field.description}</div>
          </div>
        );
      })}
    </div>
  );
}
