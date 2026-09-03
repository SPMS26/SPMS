import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className={`sidebar ${isAdmin ? 'admin-nav' : ''}`}>
      <div>
        <div className="sidebar-brand">
          <div
            className="brand-logo-icon"
            style={isAdmin ? { background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' } : {}}
          >
            <i className={`fa-solid ${isAdmin ? 'fa-shapes' : 'fa-square-parking'}`}></i>
          </div>
          <h2>{isAdmin ? 'Admin Panel' : 'Smart Parking'}</h2>
        </div>

        <ul className="sidebar-menu">
          {!isAdmin ? (
            <>
              <li className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                <Link to="/dashboard">
                  <i className="fa-solid fa-house"></i>
                  <span>Home</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/bookings') ? 'active' : ''}`}>
                <Link to="/bookings">
                  <i className="fa-solid fa-calendar-check"></i>
                  <span>My Bookings</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                <Link to="/profile">
                  <i className="fa-regular fa-user"></i>
                  <span>Profile & Vehicles</span>
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className={`nav-item ${isActive('/admin') ? 'active' : ''}`}>
                <Link to="/admin">
                  <i className="fa-solid fa-border-all"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/lots') ? 'active' : ''}`}>
                <Link to="/admin/lots">
                  <i className="fa-solid fa-layer-group"></i>
                  <span>Manage Lots & Slots</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/scanner') ? 'active' : ''}`}>
                <Link to="/admin/scanner">
                  <i className="fa-solid fa-qrcode"></i>
                  <span>QR Scanner Tool</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/reports') ? 'active' : ''}`}>
                <Link to="/admin/reports">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>Incident Reports</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <Link to="/admin/users">
                  <i className="fa-solid fa-users"></i>
                  <span>User Management</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="sidebar-footer">
        <a href="#logout" className="logout-link" onClick={(e) => { e.preventDefault(); logout(); }}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Log out</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
