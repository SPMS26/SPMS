import { useState, useEffect, useCallback, useMemo } from 'react';
import { qrService } from '../../services/qrService';
import { useSocket } from '../../context/SocketContext';

// Live gate queue (parked vehicles + pre-booked arrivals) for the lots the user operates.
// Refreshes on slot events, every 10s, and ticks every 5s so durations stay current and expired passes drop off.
export const useGateQueue = () => {
  const { socket } = useSocket();
  const [queue, setQueue] = useState({ pending_arrivals: [], active_parked: [] });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await qrService.getGateQueue();
      setQueue(res || { pending_arrivals: [], active_parked: [] });
    } catch (err) {
      console.error('Failed to load gate queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 10000);
    const clock = setInterval(() => setTick((t) => t + 1), 3000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;
    socket.on('slot:statusChanged', refresh);
    return () => socket.off('slot:statusChanged', refresh);
  }, [socket, refresh]);

  // Exclude pre-booked vehicles whose pass validity has expired
  const activePendingArrivals = useMemo(() => {
    const now = new Date();
    return (queue.pending_arrivals || []).filter((item) => {
      if (!item) return false;
      if (item.expires_at && new Date(item.expires_at) <= now) return false;
      if (item.is_active === false) return false;
      return true;
    });
  }, [queue.pending_arrivals, tick]);

  return {
    queue: {
      ...queue,
      pending_arrivals: activePendingArrivals
    },
    loading,
    refresh
  };
};
