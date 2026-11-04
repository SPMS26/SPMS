import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, isStaff: isAdmin, isSecurity, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className={`sidebar ${isAdmin ? 'admin-nav' : ''}`}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" onClick={onClose} style={{ textDecoration: 'none', display: 'block', flex: 1 }}>
            <div className="sidebar-brand">
              <div
                className="brand-logo-icon"
              >
                <i className={`fa-solid ${isAdmin ? 'fa-shapes' : 'fa-square-parking'}`}></i>
              </div>
              <h2>{isSecurity ? 'Gate Security' : isAdmin ? 'Owner Panel' : 'Smart Parking'}</h2>
            </div>
          </Link>
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '0.4rem 0.6rem',
              marginRight: '0.5rem'
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <ul className="sidebar-menu">
          {!isAdmin ? (
            <>
              <li className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                <Link to="/dashboard" onClick={onClose}>
                  <i className="fa-solid fa-house"></i>
                  <span>Home</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/bookings') ? 'active' : ''}`}>
                <Link to="/bookings" onClick={onClose}>
                  <i className="fa-solid fa-calendar-check"></i>
                  <span>Booking History</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/report-issue') ? 'active' : ''}`}>
                <Link to="/report-issue" onClick={onClose}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--accent-gold)' }}></i>
                  <span>Report Issue</span>
                </Link>
              </li>
            </>
          ) : isSecurity ? (
            <>
              <li className={`nav-item ${isActive('/admin/scanner') ? 'active' : ''}`}>
                <Link to="/admin/scanner" onClick={onClose}>
                  <i className="fa-solid fa-qrcode"></i>
                  <span>Gate Scanner</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/desk') ? 'active' : ''}`}>
                <Link to="/admin/desk" onClick={onClose}>
                  <i className="fa-solid fa-person-walking-luggage"></i>
                  <span>Walk-in Desk</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/parked') ? 'active' : ''}`}>
                <Link to="/admin/parked" onClick={onClose}>
                  <i className="fa-solid fa-square-parking"></i>
                  <span>Parked Vehicles</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/prebooked') ? 'active' : ''}`}>
                <Link to="/admin/prebooked" onClick={onClose}>
                  <i className="fa-solid fa-calendar-check"></i>
                  <span>Pre-booked Vehicles</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/live') ? 'active' : ''}`}>
                <Link to="/admin/live" onClick={onClose}>
                  <i className="fa-solid fa-bolt"></i>
                  <span>Live Bookings</span>
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className={`nav-item ${isActive('/admin') ? 'active' : ''}`}>
                <Link to="/admin" onClick={onClose}>
                  <i className="fa-solid fa-border-all"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/lots') ? 'active' : ''}`}>
                <Link to="/admin/lots" onClick={onClose}>
                  <i className="fa-solid fa-layer-group"></i>
                  <span>Manage Lots & Slots</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/reports') ? 'active' : ''}`}>
                <Link to="/admin/reports" onClick={onClose}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>Incident Reports</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/security') ? 'active' : ''}`}>
                <Link to="/admin/security" onClick={onClose}>
                  <i className="fa-solid fa-user-shield"></i>
                  <span>Security Staff</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <Link to="/admin/users" onClick={onClose}>
                  <i className="fa-solid fa-users"></i>
                  <span>My Customers</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="sidebar-footer">
        <a href="#logout" className="logout-link" onClick={(e) => { e.preventDefault(); onClose(); logout(); }}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Log out</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
