import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/common/ConfirmProvider';

const USER_NAV = [
  { to: '/dashboard', icon: 'fa-square-parking', label: 'Find parking' },
  { to: '/bookings', icon: 'fa-ticket', label: 'My bookings' },
  { to: '/report-issue', icon: 'fa-flag', label: 'Report an issue' }
];

const SECURITY_NAV = [
  { to: '/admin/scanner', icon: 'fa-qrcode', label: 'Gate scanner' },
  { to: '/admin/desk', icon: 'fa-person-walking', label: 'Walk-in desk' },
  { to: '/admin/parked', icon: 'fa-car', label: 'Parked vehicles' },
  { to: '/admin/prebooked', icon: 'fa-calendar-check', label: 'Pre-booked' },
  { to: '/admin/live', icon: 'fa-list-ul', label: 'Live bookings' }
];

const OWNER_NAV = [
  { to: '/admin', icon: 'fa-chart-simple', label: 'Overview' },
  { to: '/admin/lots', icon: 'fa-layer-group', label: 'Lots & slots' },
  { to: '/admin/reports', icon: 'fa-flag', label: 'Incident reports' },
  { to: '/admin/security', icon: 'fa-user-shield', label: 'Security staff' },
  { to: '/admin/users', icon: 'fa-users', label: 'Customers' }
];

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const confirm = useConfirm();
  const { isStaff, isSecurity, logout } = useAuth();

  const items = isSecurity ? SECURITY_NAV : isStaff ? OWNER_NAV : USER_NAV;
  const area = isSecurity ? 'Gate security' : isStaff ? 'Lot owner' : 'Driver';

  const handleLogout = async (e) => {
    e.preventDefault();
    onClose();
    if (await confirm({ title: 'Log out?', message: 'You will need to sign in again to use your account.', confirmLabel: 'Log out' })) logout();
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div>
        <div className="sidebar-top">
          <Link to="/" onClick={onClose} className="sidebar-brand">
            <span className="brand-logo-icon" aria-hidden="true">P</span>
            <div>
              <h2>SPMS</h2>
              <small>{area}</small>
            </div>
          </Link>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <ul className="sidebar-menu">
          {items.map((item) => (
            <li key={item.to} className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}>
              <Link to={item.to} onClick={onClose} aria-current={location.pathname === item.to ? 'page' : undefined}>
                <i className={`fa-solid ${item.icon}`}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <ul className="sidebar-menu">
          <li className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
            <Link to="/profile" onClick={onClose}>
              <i className="fa-solid fa-circle-user"></i>
              <span>Profile</span>
            </Link>
          </li>
        </ul>
        <a href="#logout" className="logout-link" onClick={handleLogout}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Log out</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
