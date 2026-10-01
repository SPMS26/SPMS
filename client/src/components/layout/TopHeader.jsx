import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { useSocket } from '../../context/SocketContext';

const TopHeader = () => {
  const { user, isAdmin } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

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
    if (socket) {
      socket.on('notification:new', (notif) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    }
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
    <header className="top-header">
      <div className="search-box">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input type="text" className="search-input" placeholder="Search parking lots, locations, bookings..." />
        {isAdmin && <span className="kbd-shortcut" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border-bright)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>⌘K</span>}
      </div>

      <div className="header-right">
        {isAdmin ? (
          <Link to="/dashboard" className="view-switcher-link" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', padding: '0.45rem 0.9rem', borderRadius: '8px', color: 'var(--accent-gold)', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <i className="fa-solid fa-user"></i> Switch to Driver View
          </Link>
        ) : (
          user && user.role === 'ADMIN' && (
            <Link to="/admin" className="view-switcher-link" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', padding: '0.45rem 0.9rem', borderRadius: '8px', color: 'var(--accent-emerald)', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fa-solid fa-shield-halved"></i> Switch to Admin View
            </Link>
          )
        )}

        <div style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
            <i className="fa-regular fa-bell"></i>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div style={{ position: 'absolute', right: 0, top: '48px', width: '320px', background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '1rem', zIndex: 100 }}>
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

        <div className="user-profile">
          <img
            src={user && user.profile_image ? user.profile_image : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=d97706&color=fff&bold=true`}
            alt="Avatar"
            className="user-avatar"
          />
          <div className="user-info">
            <h5 style={{ margin: 0, fontSize: '0.85rem' }}>{user ? user.full_name : 'Guest'}</h5>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAdmin ? 'Super Admin' : 'Driver / User'}</p>
          </div>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}></i>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
