import { TrendingUp, IndianRupee, Package, Megaphone } from 'lucide-react';
import AnimatedNumber from '../common/AnimatedNumber';
import ConfidenceBadge from '../common/ConfidenceBadge';

const cards = [
  {
    key: 'net_profit',
    label: 'Net Profit',
    icon: TrendingUp,
    confidence: 'estimated',
    getValue: (o) => o.net_profit,
    colorClass: (v) => v >= 0 ? 'kpi-card__value--positive' : 'kpi-card__value--negative',
    subtitle: (o) => `${o.total_orders} orders · ${o.payment_window_start} → ${o.payment_window_end}`,
  },
  {
    key: 'net_settlement',
    label: 'Net Settlement',
    icon: IndianRupee,
    confidence: 'verified',
    getValue: (o) => o.net_settlement,
    colorClass: () => 'kpi-card__value--neutral',
    subtitle: () => 'Revenue from Meesho (bank-verified)',
  },
  {
    key: 'cogs',
    label: 'Total COGS',
    icon: Package,
    confidence: 'estimated',
    getValue: (o) => o.cogs,
    colorClass: () => 'kpi-card__value--negative',
    subtitle: (o) => `Making: ₹${o.cogs_making?.toLocaleString('en-IN')} · Packaging: ₹${o.cogs_packaging?.toLocaleString('en-IN')}`,
  },
  {
    key: 'ads_cost',
    label: 'Ads Spend',
    icon: Megaphone,
    confidence: 'verified',
    getValue: (o) => Math.abs(o.ads_cost),
    colorClass: () => 'kpi-card__value--negative',
    subtitle: () => 'Campaign spend (netted from settlement)',
  },
];

export default function KPICards({ overall }) {
  if (!overall) return null;

  return (
    <div className="grid-kpi">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const value = card.getValue(overall);

        return (
          <div
            key={card.key}
            className={`kpi-card animate-in animate-in-delay-${idx + 1}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div className="kpi-card__label">
                <Icon size={14} style={{ marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
                {card.label}
              </div>
              <ConfidenceBadge type={card.confidence} />
            </div>

            <div className={`kpi-card__value ${card.colorClass(value)}`}>
              <AnimatedNumber value={value} />
            </div>

            <div className="kpi-card__subtitle">
              {card.subtitle(overall)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
