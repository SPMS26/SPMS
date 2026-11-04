import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import CheckoutModal from '../components/gate/CheckoutModal';
import { useGateActions } from '../components/gate/useGateActions';
import { qrService } from '../services/qrService';
import { useSocket } from '../context/SocketContext';
import { formatDuration, estimateCharge, formatTime } from '../components/gate/gateUtils';

const GateLivePage = () => {
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await qrService.getWalkInSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      console.error('Failed to load walk-in sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const actions = useGateActions(refresh);

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

  const rows = sessions;
  const activeCount = sessions.filter((s) => s.booking_status !== 'completed').length;

  return (
    <AppLayout>
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="page-title-box">
          <h1>Live Bookings</h1>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--grad-card)', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-bright)' }}>
          <strong style={{ color: 'var(--accent-gold)' }}>{activeCount}</strong> active • {sessions.length - activeCount} completed (24h)
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Vehicle</th>
                <th>User / Phone</th>
                <th>Slot</th>
                <th>Entered</th>
                <th>Duration</th>
                <th>Charge</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const done = s.booking_status === 'completed';
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{s.ticket_code}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{s.vehicleNo}</strong></td>
                    <td>
                      {s.userName}
                      {s.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.phone}</div>}
                    </td>
                    <td>{s.slotCode} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({s.lotName})</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{formatTime(s.entry_time)}</td>
                    <td>{formatDuration(s.entry_time, done ? s.exit_time : null)}</td>
                    <td>{done ? `₹${Number(s.parking_charge || 0).toFixed(2)}` : (estimateCharge(s) !== null ? `₹${estimateCharge(s)} (running)` : '-')}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: done ? 'var(--text-muted)' : 'var(--accent-emerald)' }}>{done ? 'Completed' : 'Parked'}</span>
                    </td>
                    <td>
                      {!done && (
                        <button className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }} disabled={actions.busyId === s.id} onClick={() => actions.startCheckout(s.id)}>
                          <i className="fa-solid fa-right-from-bracket"></i> {actions.busyId === s.id ? 'Working...' : 'Check Out'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No walk-in sessions yet. Check vehicles in from the Walk-in Desk.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CheckoutModal bill={actions.bill} confirming={actions.confirming} onConfirm={actions.confirmCheckout} onClose={actions.closeBill} />
    </AppLayout>
  );
};

export default GateLivePage;
