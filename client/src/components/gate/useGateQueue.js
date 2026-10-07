import { useState, useEffect, useCallback } from 'react';
import { qrService } from '../../services/qrService';
import { useSocket } from '../../context/SocketContext';

// Live gate queue (parked vehicles + pre-booked arrivals) for the lots the user operates.
// Refreshes on slot events, every 20s, and ticks every 30s so durations stay current.
export const useGateQueue = () => {
  const { socket } = useSocket();
  const [queue, setQueue] = useState({ pending_arrivals: [], active_parked: [] });
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

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
    const poll = setInterval(refresh, 20000);
    const clock = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;
    socket.on('slot:statusChanged', refresh);
    return () => socket.off('slot:statusChanged', refresh);
  }, [socket, refresh]);

  return { queue, loading, refresh };
};
