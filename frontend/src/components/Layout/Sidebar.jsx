import { NavLink } from 'react-router-dom';
import { BarChart3, Upload, Package, Settings, TrendingUp } from 'lucide-react';

const navItems = [
  { to: '/',         icon: BarChart3,  label: 'Dashboard' },
  { to: '/upload',   icon: Upload,     label: 'Upload Files' },
  { to: '/sku-costs', icon: Package,   label: 'SKU Costs' },
  { to: '/settings', icon: Settings,   label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <h1>
          <span>Yarn</span> Basket
        </h1>
        <p>Meesho P&L Dashboard</p>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
            end={to === '/'}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '0 var(--space-6)', marginTop: 'auto' }}>
        <div className="glass-card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <TrendingUp size={20} style={{ color: 'var(--accent)', marginBottom: 'var(--space-2)' }} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Built for transparent,<br />bank-verified P&L
          </p>
        </div>
      </div>
    </aside>
  );
}
