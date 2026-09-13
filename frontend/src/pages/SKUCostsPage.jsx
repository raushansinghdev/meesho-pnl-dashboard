import { Package } from 'lucide-react';
import CostEditor from '../components/SKUCosts/CostEditor';

export default function SKUCostsPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">
          <Package size={24} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--accent)' }} />
          SKU Costs
        </h1>
        <p className="page-header__subtitle">
          Manage making and packaging costs per SKU (v2 model). Changes take effect on next P&L computation.
        </p>
      </div>
      <div className="page-body">
        <CostEditor />
      </div>
    </>
  );
}
