import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import UserAvatar from '../common/UserAvatar';

const TopHeader = ({ onToggleSidebar, sidebarOpen, search }) => {
  const { user, isStaff, isAdmin, isSecurity } = useAuth();
  const location = useLocation();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const isProfilePage = location.pathname === '/profile';
  const homePath = isSecurity ? '/admin/scanner' : (isAdmin ? '/admin' : '/dashboard');

  return (
    <header className="top-header" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {isProfilePage ? (
          <Link
            to={homePath}
            className="nav-arrow-btn"
            title="Exit to Main Page"
            aria-label="Exit to Main Page"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </Link>
        ) : (
          <button
            className="nav-icon-btn"
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Close menu" : "Menu"}
            aria-label={sidebarOpen ? "Close menu" : "Menu"}
            aria-expanded={sidebarOpen}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="1" y="1" width="4" height="4" rx="1" />
              <rect x="7" y="1" width="4" height="4" rx="1" />
              <rect x="13" y="1" width="4" height="4" rx="1" />
              <rect x="1" y="7" width="4" height="4" rx="1" />
              <rect x="7" y="7" width="4" height="4" rx="1" />
              <rect x="13" y="7" width="4" height="4" rx="1" />
              <rect x="1" y="13" width="4" height="4" rx="1" />
              <rect x="7" y="13" width="4" height="4" rx="1" />
              <rect x="13" y="13" width="4" height="4" rx="1" />
            </svg>
          </button>
        )}

        {search && (
          <div className="search-box" role="search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="search-input"
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              autoComplete="off"
              {...(search.onOpen
                ? { readOnly: true, value: '', onClick: search.onOpen, onFocus: search.onOpen, style: { cursor: 'pointer' } }
                : {
                    value: search.value,
                    onChange: (e) => search.onChange(e.target.value),
                    onKeyDown: (e) => e.key === 'Escape' && search.onChange('')
                  })}
            />
            {search.value && (
              <button type="button" className="search-clear" aria-label="Clear search" onClick={() => search.onChange('')}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}
      </div>

      {isProfilePage && (
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>
            Profile
          </h1>
        </div>
      )}

      <div className="header-right">
        {isAdmin && (
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <i className="fa-regular fa-bell"></i>
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {showNotifications && (
              <div className="notif-dropdown">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', cursor: 'pointer' }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '1rem 0' }}>No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id || Math.random()} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', opacity: n.is_read ? 0.7 : 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-gold)' }}>{n.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <Link
          to="/profile"
          className="user-profile"
          title="Visit Profile"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          <UserAvatar user={user} />
          <div className="user-info">
            <h5 style={{ margin: 0, fontSize: '0.85rem' }}>{user ? user.full_name : 'User'}</h5>
            {isAdmin && <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.role === 'SECURITY' ? 'Gate Security' : (user?.organization_name || 'Lot Owner')}</p>}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default TopHeader;
