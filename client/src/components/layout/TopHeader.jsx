import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { useSocket } from '../../context/SocketContext';

const TopHeader = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, isStaff, isAdmin, isSecurity } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const isProfilePage = location.pathname === '/profile';
  const homePath = isSecurity ? '/admin/scanner' : (isAdmin ? '/admin' : '/dashboard');

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const onNewNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    socket.on('notification:new', onNewNotification);
    return () => socket.off('notification:new', onNewNotification);
  }, [socket]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAsRead('all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

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

        {isAdmin && (
          <button
            className="nav-icon-btn staff-menu-btn"
            onClick={onToggleSidebar}
            title="Menu"
            aria-label="Menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
        )}

        {!isProfilePage && (
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" className="search-input" placeholder="Search parking lots, locations, bookings..." />
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
                    <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', cursor: 'pointer' }}>
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
          <img
            src={user && user.profile_image ? user.profile_image : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=d97706&color=fff&bold=true`}
            alt="Avatar"
            className="user-avatar"
          />
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
