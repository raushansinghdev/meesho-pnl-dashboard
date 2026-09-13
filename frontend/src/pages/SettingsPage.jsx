import { Settings, Info } from 'lucide-react';
import LossRates from '../components/Settings/LossRates';

export default function SettingsPage({ lossRates, onChange }) {
  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">
          <Settings size={24} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--accent)' }} />
          Settings
        </h1>
        <p className="page-header__subtitle">
          Configure COGS loss-rate assumptions. These affect how much cost is charged for each order outcome.
        </p>
      </div>

      <div className="page-body">
        <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="section-title">
            COGS Loss Rate Assumptions
          </div>
          <LossRates lossRates={lossRates} onChange={onChange} />
        </div>

        {/* Methodology note */}
        <div className="glass-card" style={{ borderColor: 'var(--info-muted)' }}>
          <div className="section-title" style={{ color: 'var(--info)' }}>
            <Info size={18} />
            About These Settings
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 'var(--space-3)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>These are policy judgments, not measured facts.</strong> No actual
              tracking exists yet of what fraction of returned parcels come back resellable vs. damaged.
            </p>
            <p style={{ marginBottom: 'var(--space-3)' }}>
              Under the v2 cost model, each SKU has a <strong style={{ color: 'var(--text-primary)' }}>making cost</strong> (material + labor)
              and a <strong style={{ color: 'var(--text-primary)' }}>packaging cost</strong> (packaging materials used for shipping).
            </p>
            <p style={{ marginBottom: 'var(--space-3)' }}>
              <strong style={{ color: 'var(--accent)' }}>RTO orders</strong> always charge packaging cost (the packaging is consumed
              regardless), but making cost is only charged at the RTO loss rate above (default 0% — product assumed resellable).
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Revenue and ads figures are bank-verified</strong> (proven to match
              your HDFC statement to the paisa). COGS depends on these assumptions and your cost entries —
              keep that distinction in mind when reading the Net Profit number.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
