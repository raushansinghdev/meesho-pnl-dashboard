import { Landmark, Package, RotateCcw, Box } from 'lucide-react';

/**
 * KPICards — Flat metric cards with colored icon circles.
 * Shows Settlement, Item Cost, RTO/Return, Packaging.
 */
export default function KPICards({ overall }) {
  if (!overall) return null;

  const rtoReturnCost = (overall.cogs_making || 0) > 0
    ? Math.round(((overall.cogs || 0) - (overall.cogs_making || 0)) * 100) / 100
    : 0;

  const cards = [
    {
      label: 'SETTLEMENT',
      value: overall.net_settlement,
      subtitle: 'From Meesho',
      icon: Landmark,
      iconClass: 'kpi-card__icon--blue',
    },
    {
      label: 'ITEM COST',
      value: overall.cogs,
      subtitle: 'Cost of goods',
      icon: Package,
      iconClass: 'kpi-card__icon--red',
    },
    {
      label: 'RTO / RETURN',
      value: rtoReturnCost,
      subtitle: `${overall.total_orders} orders`,
      icon: RotateCcw,
      iconClass: 'kpi-card__icon--yellow',
    },
    {
      label: 'PACKAGING',
      value: overall.cogs_packaging || 0,
      subtitle: 'Per order cost',
      icon: Box,
      iconClass: 'kpi-card__icon--purple',
    },
  ];

  const fmt = (v) => `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="kpi-grid">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`kpi-card animate-in animate-in-delay-${idx + 1}`}>
            <div className={`kpi-card__icon ${card.iconClass}`}>
              <Icon size={20} />
            </div>
            <div className="kpi-card__content">
              <div className="kpi-card__label">{card.label}</div>
              <div className="kpi-card__value">{fmt(card.value)}</div>
              <div className="kpi-card__subtitle">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
