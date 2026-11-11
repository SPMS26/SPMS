import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAdmin } = useAuth();
  const socketRef = useRef(null);
  const userId = user?.id;

  // Only logged-in users need live updates. Logging out drops the connection and its private rooms.
  useEffect(() => {
    if (!userId || import.meta.env.VITE_REALTIME === 'off') return;

    // Target backend server on port 5000 directly, using a WebSocket straight away
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;

    const socketInstance = io(backendUrl, {
      auth: { token: localStorage.getItem('spms_jwt_token') },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 10000
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', () => {
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [userId]);

  // Handle room joining separately without reconnecting the entire transport
  useEffect(() => {
    const socketInstance = socketRef.current;
    if (socketInstance && isConnected) {
      if (user?.id) {
        socketInstance.emit('join:user', user.id);
      }
      if (isAdmin) {
        socketInstance.emit('join:admin');
      }
    }
  }, [user?.id, isAdmin, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
