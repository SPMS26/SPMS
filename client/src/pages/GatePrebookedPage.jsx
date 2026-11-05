import React, { useMemo, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import NoResults from '../components/common/NoResults';
import { useGateQueue } from '../components/gate/useGateQueue';
import { useGateActions } from '../components/gate/useGateActions';
import { matchesQuery, formatTime } from '../components/gate/gateUtils';

const GatePrebookedPage = () => {
  const { queue, loading, refresh } = useGateQueue();
  const actions = useGateActions(refresh);
  const [search, setSearch] = useState('');
  const arrivals = useMemo(() => {
    const now = new Date();
    return (queue.pending_arrivals || [])
      .filter((i) => (!i.expires_at || new Date(i.expires_at) > now) && i.is_active !== false);
  }, [queue]);
  const visible = arrivals.filter((item) => matchesQuery(item, search));

  return (
    <AppLayout search={{ value: search, onChange: setSearch, placeholder: 'Search by vehicle number, ticket or name' }}>
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="page-title-box">
          <h1>Pre-booked Vehicles</h1>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--grad-card)', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-bright)' }}>
          <strong style={{ color: 'var(--accent-gold)' }}>{arrivals.length}</strong> waiting to arrive
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>User</th>
                <th>Phone</th>
                <th>Slot</th>
                <th>Pass</th>
                <th>Pass valid until</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{item.vehicleNo}</strong></td>
                  <td>{item.userName}</td>
                  <td style={{ fontSize: '0.8rem' }}>{item.phone || '-'}</td>
                  <td>{item.slotCode} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.lotName}, {item.floor})</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{item.bookingId}</td>
                  <td style={{ fontSize: '0.8rem' }}>{formatTime(item.expires_at)}</td>
                  <td>
                    <button className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }} disabled={actions.busyId === item.id} onClick={() => actions.checkInPrebooked(item.id, item.vehicleNo)}>
                      <i className="fa-solid fa-right-to-bracket"></i> {actions.busyId === item.id ? 'Working...' : 'Check In'}
                    </button>
                  </td>
                </tr>
              ))}
              {arrivals.length > 0 && visible.length === 0 && (
                <tr><td colSpan={7}><NoResults query={search} onClear={() => setSearch('')} /></td></tr>
              )}
              {!loading && arrivals.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pre-booked arrivals right now.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default GatePrebookedPage;
