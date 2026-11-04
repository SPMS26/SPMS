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
          <Link to="/" style={{ textDecoration: 'none', display: 'block', flex: 1 }}>
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
            className="sidebar-close-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close menu"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <ul className="sidebar-menu">
          {!isAdmin ? (
            <>
              <li className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                <Link to="/dashboard" onClick={onClose}>
                  <span>Home</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/bookings') ? 'active' : ''}`}>
                <Link to="/bookings" onClick={onClose}>
                  <span>Booking History</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/report-issue') ? 'active' : ''}`}>
                <Link to="/report-issue" onClick={onClose}>
                  <span>Report Issue</span>
                </Link>
              </li>
            </>
          ) : isSecurity ? (
            <>
              <li className={`nav-item ${isActive('/admin/scanner') ? 'active' : ''}`}>
                <Link to="/admin/scanner">
                  <span>Gate Scanner</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/desk') ? 'active' : ''}`}>
                <Link to="/admin/desk">
                  <span>Walk-in Desk</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/parked') ? 'active' : ''}`}>
                <Link to="/admin/parked">
                  <span>Parked Vehicles</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/prebooked') ? 'active' : ''}`}>
                <Link to="/admin/prebooked">
                  <span>Pre-booked Vehicles</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/live') ? 'active' : ''}`}>
                <Link to="/admin/live">
                  <span>Live Bookings</span>
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className={`nav-item ${isActive('/admin') ? 'active' : ''}`}>
                <Link to="/admin">
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/lots') ? 'active' : ''}`}>
                <Link to="/admin/lots">
                  <span>Manage Lots & Slots</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/reports') ? 'active' : ''}`}>
                <Link to="/admin/reports">
                  <span>Incident Reports</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/security') ? 'active' : ''}`}>
                <Link to="/admin/security">
                  <span>Security Staff</span>
                </Link>
              </li>
              <li className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <Link to="/admin/users">
                  <span>My Customers</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="sidebar-footer">
        <a href="#logout" className="logout-link" onClick={(e) => { e.preventDefault(); logout(); }}>
          <span>Log out</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
