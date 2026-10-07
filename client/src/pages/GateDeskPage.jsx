import React, { useState, useMemo, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import WalkInPanel from '../components/admin/WalkInPanel';
import GateSearchBar from '../components/gate/GateSearchBar';
import CheckoutModal from '../components/gate/CheckoutModal';
import { useGateQueue } from '../components/gate/useGateQueue';
import { useGateActions } from '../components/gate/useGateActions';
import { normalize, matchesQuery, formatDuration } from '../components/gate/gateUtils';
import toast from 'react-hot-toast';

// Walk-in Desk: assign a slot to an arriving vehicle (top), with a quick find underneath.
// The full lists live on the Parked Vehicles, Pre-booked Vehicles and Live Bookings pages.
const GateDeskPage = () => {
  const { queue, refresh } = useGateQueue();
  const actions = useGateActions(refresh);
  const [search, setSearch] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const panelRef = useRef(null);

  const q = normalize(search);
  const parked = useMemo(() => (q ? queue.active_parked.filter((i) => matchesQuery(i, search)) : []), [queue, q]);
  const arrivals = useMemo(() => (q ? queue.pending_arrivals.filter((i) => matchesQuery(i, search)) : []), [queue, q]);
  const noMatch = q.length >= 4 && parked.length === 0 && arrivals.length === 0;

  const startNewWalkIn = () => {
    setNewPlate(search.trim().toUpperCase());
    toast('Pick a free slot on the map to check this vehicle in.');
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const btn = { marginTop: 0, width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem' };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Walk-in Desk</h1>
        </div>
      </div>

      {/* Slot assignment (live booking) */}
      <div ref={panelRef}>
        <WalkInPanel
          onChanged={refresh}
          queue={queue}
          plate={newPlate}
          onPlateChange={setNewPlate}
          onCheckout={actions.startCheckout}
        />
      </div>

      {/* Quick find */}
      <GateSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Quick find: vehicle number, ticket code or driver name"
        summary={`${queue.active_parked.length} parked • ${queue.pending_arrivals.length} pre-booked arriving`}
      />

      {noMatch && (
        <div className="card" style={{ marginBottom: '1.25rem', border: '1px dashed var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem' }}>
            No parked or pre-booked vehicle matches <strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{search.toUpperCase()}</strong>.
          </span>
          <button className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.55rem 1.1rem' }} onClick={startNewWalkIn}>
            <i className="fa-solid fa-person-walking-luggage"></i> New walk-in for this vehicle
          </button>
        </div>
      )}

      {(parked.length > 0 || arrivals.length > 0) && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver / Ticket</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {parked.map((item) => (
                  <tr key={`p-${item.id}`}>
                    <td><strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{item.vehicleNo}</strong></td>
                    <td>
                      {item.userName}
                      {item.ticket_code && <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.ticket_code}</div>}
                    </td>
                    <td>{item.slotCode} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.lotName})</span></td>
                    <td>Parked {formatDuration(item.entry_time)} • {item.booking_type === 'walk_in' ? 'Walk-in' : 'Pre-booked'}</td>
                    <td>
                      <button className="btn-select-slot" style={btn} disabled={actions.busyId === item.id} onClick={() => actions.startCheckout(item.id)}>
                        <i className="fa-solid fa-right-from-bracket"></i> {actions.busyId === item.id ? 'Working...' : 'Check Out'}
                      </button>
                    </td>
                  </tr>
                ))}
                {arrivals.map((item) => (
                  <tr key={`a-${item.id}`}>
                    <td><strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{item.vehicleNo}</strong></td>
                    <td>{item.userName}</td>
                    <td>{item.slotCode} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.lotName})</span></td>
                    <td>Pre-booked, waiting to arrive</td>
                    <td>
                      <button className="btn-select-slot" style={btn} disabled={actions.busyId === item.id} onClick={() => actions.checkInPrebooked(item.id)}>
                        <i className="fa-solid fa-right-to-bracket"></i> {actions.busyId === item.id ? 'Working...' : 'Check In'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CheckoutModal bill={actions.bill} confirming={actions.confirming} onConfirm={actions.confirmCheckout} onClose={actions.closeBill} />
    </AppLayout>
  );
};

export default GateDeskPage;
