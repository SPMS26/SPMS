import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { notificationService } from '../services/notificationService';

const NotificationContext = createContext();

// Lives above the routes because the header is rebuilt on every page change.
// Notifications load once per login and stay current through the live connection.
// Only owners have the bell, so nobody else needs to load them.
export const NotificationProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellUserId = isAdmin ? user.id : null;

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    if (!bellUserId) return;
    let current = true;
    notificationService.getNotifications()
      .then((res) => {
        if (!current) return;
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      })
      .catch((err) => console.error('Failed to fetch notifications:', err));
    return () => { current = false; };
  }, [bellUserId]);

  useEffect(() => {
    if (!socket || !bellUserId) return;
    const onNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };
    socket.on('notification:new', onNewNotification);
    return () => socket.off('notification:new', onNewNotification);
  }, [socket, bellUserId]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAsRead('all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
