import { useState, useEffect, useCallback, useMemo } from 'react';
import { qrService } from '../../services/qrService';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { useAuth } from '../../context/AuthContext';

// Live gate queue (parked vehicles + pre-booked arrivals) for the lots the user operates.
// Refreshes on slot events for this guard's lot, and ticks every 3s so durations stay current and expired passes drop off.
export const useGateQueue = () => {
  const { user } = useAuth();
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
    const clock = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(clock);
  }, [refresh]);

  useLiveRefresh(refresh, {
    pollMs: 60000,
    disconnectedPollMs: 10000,
    matches: (event) => !user?.assigned_lot_id || event.lotId === user.assigned_lot_id
  });

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
