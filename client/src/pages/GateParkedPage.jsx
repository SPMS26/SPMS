import React, { useState, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import GateSearchBar from '../components/gate/GateSearchBar';
import CheckoutModal from '../components/gate/CheckoutModal';
import { useGateQueue } from '../components/gate/useGateQueue';
import { useGateActions } from '../components/gate/useGateActions';
import { matchesQuery, formatDuration, estimateCharge, formatTime } from '../components/gate/gateUtils';

const GateParkedPage = () => {
  const { queue, loading, refresh } = useGateQueue();
  const actions = useGateActions(refresh);
  const [search, setSearch] = useState('');
  const parked = useMemo(() => queue.active_parked.filter((i) => matchesQuery(i, search)), [queue, search]);

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Parked Vehicles</h1>
        </div>
      </div>

      <GateSearchBar value={search} onChange={setSearch} autoFocus summary={`${queue.active_parked.length} parked`} />

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>User</th>
                <th>Type</th>
                <th>Slot</th>
                <th>Entered</th>
                <th>Parked for</th>
                <th>Running charge</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {parked.map((item) => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{item.vehicleNo}</strong></td>
                  <td>
                    {item.userName}
                    {item.ticket_code && <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.ticket_code}</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}><span className="type-tag">{item.booking_type === 'walk_in' ? 'Walk-in' : 'Pre-booked'}</span></td>
                  <td>{item.slotCode} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.lotName})</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{formatTime(item.entry_time)}</td>
                  <td>{formatDuration(item.entry_time)}</td>
                  <td>{estimateCharge(item) !== null ? `₹${estimateCharge(item)}` : '-'}</td>
                  <td>
                    <button className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }} disabled={actions.busyId === item.id} onClick={() => actions.startCheckout(item.id)}>
                      <i className="fa-solid fa-right-from-bracket"></i> {actions.busyId === item.id ? 'Working...' : 'Check Out'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && parked.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{search ? 'No parked vehicle matches your search.' : 'No vehicles are parked right now.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CheckoutModal bill={actions.bill} confirming={actions.confirming} onConfirm={actions.confirmCheckout} onClose={actions.closeBill} />
    </AppLayout>
  );
};

export default GateParkedPage;
