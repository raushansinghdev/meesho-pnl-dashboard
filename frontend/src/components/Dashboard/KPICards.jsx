import { Landmark, Package, RotateCcw, Box } from 'lucide-react';

/**
 * KPICards — Flat metric cards with colored icon circles.
 * Shows Settlement, Item Cost, RTO/Return, Packaging.
 */
export default function KPICards({ overall, status_breakdown }) {
  if (!overall) return null;


  let rtoCount = 0;
  let returnCount = 0;
  if (status_breakdown) {
    const rto = status_breakdown.find(s => s.status === 'rto');
    const ret = status_breakdown.find(s => s.status === 'return');
    rtoCount = rto?.order_count || 0;
    returnCount = ret?.order_count || 0;
  }

  const cards = [
    {
      label: 'SETTLEMENT',
      value: overall.net_settlement,
      subtitle: 'From Meesho',
      icon: Landmark,
      iconClass: 'kpi-card__icon--blue',
      tooltip: 'Total settlement amount transferred from Meesho.'
    },
    {
      label: 'PRODUCT COST',
      value: overall.cogs_making,
      subtitle: 'Total making cost',
      icon: Package,
      iconClass: 'kpi-card__icon--red',
      tooltip: 'Total amount spent on making or procuring the items (excluding packaging).'
    },
    {
      label: 'ADS COST',
      value: overall.ads_cost || 0,
      subtitle: 'Total ad spend',
      icon: Box,
      iconClass: 'kpi-card__icon--purple',
      tooltip: 'Total amount spent on Meesho advertisements.'
    },
    {
      label: 'RETURN LOSS',
      value: (overall.cogs_making_lost || 0) + (overall.cogs_packaging_lost || 0),
      subtitle: <>{rtoCount} Courier Return<br />{returnCount} Customer Return</>,
      icon: RotateCcw,
      iconClass: 'kpi-card__icon--yellow',
      tooltip: `Total product and packaging cost lost on undelivered or returned items.\n\nCustomer Return Loss: ₹${Math.abs((overall.making_loss_return || 0) + (overall.packaging_loss_return || 0)).toLocaleString('en-IN')}\nCourier Return Loss: ₹${Math.abs((overall.making_loss_rto || 0) + (overall.packaging_loss_rto || 0)).toLocaleString('en-IN')}`
    },
    {
      label: 'PENALTY',
      value: Math.abs(overall.return_shipping_charge || 0),
      subtitle: 'Reverse shipping',
      icon: RotateCcw,
      iconClass: 'kpi-card__icon--red',
      tooltip: `Total penalty charged for customer returns.\n\nReverse Shipping Penalty: ₹${Math.abs(overall.return_shipping_charge || 0).toLocaleString('en-IN')}\n(Already deducted from Settlement by Meesho)`
    },
  ];

  const fmt = (v) => `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="kpi-grid">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`kpi-card animate-in animate-in-delay-${idx + 1}`}>
            <div className="kpi-card__tooltip">{card.tooltip}</div>
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
