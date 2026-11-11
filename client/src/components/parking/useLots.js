import { useState, useEffect, useCallback } from 'react';
import { lotService } from '../../services/lotService';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

// The list of lots, with free-slot counts kept current by slot events
export const useLots = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await lotService.getAllLots();
      setLots(res.lots || []);
    } catch (err) {
      console.error('Error fetching lots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useLiveRefresh(refresh, { groupMs: 1000, disconnectedPollMs: 20000 });

  return { lots, loading, refresh };
};
