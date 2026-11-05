import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

// Keeps server data current with as few requests as possible.
// Slot events drive updates, grouped so a burst of events becomes one request. Polling is only a safety
// net: slow while the live connection is up, faster if it drops, and paused while the tab is hidden.
export const useLiveRefresh = (refresh, { pollMs = null, disconnectedPollMs = null, matches = null, groupMs = 500 } = {}) => {
  const { socket, isConnected } = useSocket();
  const latest = useRef({ refresh, matches });
  latest.current = { refresh, matches };
  const groupTimer = useRef(null);
  const missedUpdate = useRef(false);
  const wasDisconnected = useRef(false);

  const run = useCallback(() => {
    if (document.hidden) {
      missedUpdate.current = true; // catch up once the tab is visible again
      return;
    }
    missedUpdate.current = false;
    latest.current.refresh();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onSlotChanged = (event) => {
      if (latest.current.matches && !latest.current.matches(event)) return;
      if (groupTimer.current) return;
      groupTimer.current = setTimeout(() => {
        groupTimer.current = null;
        run();
      }, groupMs);
    };
    socket.on('slot:statusChanged', onSlotChanged);
    return () => {
      socket.off('slot:statusChanged', onSlotChanged);
      clearTimeout(groupTimer.current);
      groupTimer.current = null;
    };
  }, [socket, groupMs, run]);

  useEffect(() => {
    const ms = isConnected ? pollMs : disconnectedPollMs;
    if (!ms) return;
    const poll = setInterval(run, ms);
    return () => clearInterval(poll);
  }, [isConnected, pollMs, disconnectedPollMs, run]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && missedUpdate.current) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [run]);

  // Events sent while the connection was down are lost, so catch up after it returns
  useEffect(() => {
    if (!socket) return;
    const onDisconnect = () => { wasDisconnected.current = true; };
    const onConnect = () => {
      if (wasDisconnected.current) {
        wasDisconnected.current = false;
        run();
      }
    };
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);
    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
    };
  }, [socket, run]);
};
