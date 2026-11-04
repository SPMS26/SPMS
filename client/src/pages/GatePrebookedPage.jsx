import React, { useState, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import GateSearchBar from '../components/gate/GateSearchBar';
import { useGateQueue } from '../components/gate/useGateQueue';
import { useGateActions } from '../components/gate/useGateActions';
import { matchesQuery, formatTime } from '../components/gate/gateUtils';

const GatePrebookedPage = () => {
  const { queue, loading, refresh } = useGateQueue();
  const actions = useGateActions(refresh);
  const [search, setSearch] = useState('');
  const arrivals = useMemo(() => queue.pending_arrivals.filter((i) => matchesQuery(i, search)), [queue, search]);

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Pre-booked Vehicles</h1>
        </div>
      </div>

      <GateSearchBar value={search} onChange={setSearch} autoFocus summary={`${queue.pending_arrivals.length} waiting to arrive`} />

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
              {arrivals.map((item) => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{item.vehicleNo}</strong></td>
                  <td>{item.userName}</td>
                  <td style={{ fontSize: '0.8rem' }}>{item.phone || '-'}</td>
                  <td>{item.slotCode} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.lotName}, {item.floor})</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{item.bookingId}</td>
                  <td style={{ fontSize: '0.8rem' }}>{formatTime(item.expires_at)}</td>
                  <td>
                    <button className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }} disabled={actions.busyId === item.id} onClick={() => actions.checkInPrebooked(item.id)}>
                      <i className="fa-solid fa-right-to-bracket"></i> {actions.busyId === item.id ? 'Working...' : 'Check In'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && arrivals.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{search ? 'No pre-booking matches your search.' : 'No pre-booked arrivals right now.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default GatePrebookedPage;
