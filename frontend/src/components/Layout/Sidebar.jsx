import { NavLink } from 'react-router-dom';
import { BarChart3, Upload, Package, Settings, Box } from 'lucide-react';

const menuItems = [
  { to: '/',          icon: BarChart3, label: 'Overview' },
  { to: '/upload',    icon: Upload,    label: 'Upload' },
];

const reportItems = [
  { to: '/products',  icon: Box,       label: 'Products' },
  { to: '/sku-costs', icon: Package,   label: 'Costs' },
  { to: '/settings',  icon: Settings,  label: 'Settings' },
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

      <div className="sidebar__section-label">Menu</div>
      <nav className="sidebar__nav">
        {menuItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
            end={to === '/'}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__section-label">Report</div>
      <nav className="sidebar__nav">
        {reportItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
