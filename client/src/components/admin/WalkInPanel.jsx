import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { lotService } from '../../services/lotService';
import { qrService } from '../../services/qrService';
import SlotGrid, { sortFloors, floorLabel } from '../parking/SlotGrid';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/common/ConfirmProvider';

const labelStyle = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' };

// Gate slot map + walk-in desk. Guards see the same live slot map users see for their lot;
// tapping a slot offers the right action: check in (free), release a hold (held), check out (occupied).
const WalkInPanel = ({ onChanged, queue, onCheckout, plate: plateProp, onPlateChange }) => {
  const confirm = useConfirm();
  const { user, isSecurity } = useAuth();
  const { socket } = useSocket();
  const [lots, setLots] = useState([]);
  const [lotId, setLotId] = useState(isSecurity ? user.assigned_lot_id : '');
  const [lotName, setLotName] = useState('');
  const [slots, setSlots] = useState([]);
  const [activeFloor, setActiveFloor] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [plateState, setPlateState] = useState('');
  const plate = plateProp !== undefined ? plateProp : plateState;
  const setPlate = onPlateChange || setPlateState;
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);

  // Owners pick which of their lots to view; guards are fixed to their assigned lot
  useEffect(() => {
    if (isSecurity) {
      if (user.assigned_lot_id) {
        lotService.getLotById(user.assigned_lot_id).then((res) => setLotName(res.lot?.name || '')).catch(() => {});
      }
      return;
    }
    lotService.getMyLots().then((res) => {
      const active = (res.lots || []).filter((l) => l.is_active);
      setLots(active);
      setLotId((prev) => prev || active[0]?.id || '');
    }).catch(() => {});
  }, [isSecurity, user.assigned_lot_id]);

  useEffect(() => {
    if (!isSecurity) setLotName(lots.find((l) => l.id === lotId)?.name || '');
  }, [lots, lotId, isSecurity]);

  const loadSlots = useCallback(async () => {
    if (!lotId) {
      setSlots([]);
      return;
    }
    try {
      const res = await lotService.getSlotsByLot(lotId);
      const list = res.slots || [];
      setSlots(list);
      const floors = sortFloors([...new Set(list.map((s) => s.floor))]);
      setActiveFloor((prev) => (floors.includes(prev) ? prev : floors[0] || ''));
      // Keep the selection but refresh its status
      setSelectedSlot((prev) => (prev ? list.find((s) => s.id === prev.id) || null : null));
    } catch (err) {
      toast.error('Failed to load slots.');
    }
  }, [lotId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Live updates: statuses change when users pre-book, pay, or other staff act
  useEffect(() => {
    if (!socket) return;
    const onSlotChanged = ({ lotId: changedLot, slotId, status }) => {
      if (changedLot !== lotId) return;
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status } : s)));
      setSelectedSlot((prev) => (prev && prev.id === slotId ? { ...prev, status } : prev));
    };
    socket.on('slot:statusChanged', onSlotChanged);
    return () => socket.off('slot:statusChanged', onSlotChanged);
  }, [socket, lotId]);

  const floors = useMemo(() => sortFloors([...new Set(slots.map((s) => s.floor))]), [slots]);
  const counts = useMemo(() => {
    const c = { available: 0, reserved: 0, occupied: 0, maintenance: 0 };
    slots.forEach((s) => { if (c[s.status] !== undefined) c[s.status] += 1; });
    return c;
  }, [slots]);

  const sameLot = (item) => !lotName || item.lotName === lotName;
  const occupant = selectedSlot && selectedSlot.status === 'occupied'
    ? (queue?.active_parked || []).find((i) => i.slotCode === selectedSlot.slot_number && sameLot(i))
    : null;
  const prebooking = selectedSlot && selectedSlot.status === 'reserved'
    ? (queue?.pending_arrivals || []).find((i) => i.slotCode === selectedSlot.slot_number && sameLot(i))
    : null;

  const refresh = async () => {
    await loadSlots();
    onChanged && onChanged();
  };

  const handleCheckIn = async (e) => {
        e.preventDefault();
    const vehicle = plate.trim().toUpperCase();
    if (!(await confirm({ title: `Check in ${vehicle}?`, message: `Assigns slot ${selectedSlot.slot_number} and starts billing at ₹${selectedSlot.hourly_price}/hr. Check the number carefully: a check-in cannot be undone.`, confirmLabel: 'Check In' }))) return;
    setSubmitting(true);
    try {
      const res = await qrService.walkIn(selectedSlot.id, plate, phone);
      setTicket(res.booking);
      toast.success(res.message);
      setPlate('');
      setPhone('');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const setHold = async (slot, status) => {
    if (status === 'available' && slot.status === 'occupied') {
      toast.error('A vehicle is parked and cannot make it available');
      return;
    }
        const ok = await confirm(status === 'reserved'
      ? { title: `Hold slot ${slot.slot_number}?`, message: 'It is marked reserved, so nobody can book it until it is released.', confirmLabel: 'Hold Slot' }
      : { title: `Release slot ${slot.slot_number}?`, message: 'Users will be able to book it straight away.', confirmLabel: 'Release Slot' });
    if (!ok) return;
    try {
      await lotService.updateSlotStatus(slot.id, status);
      toast.success(status === 'reserved' ? 'Slot held.' : 'Slot released.');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update slot.');
    }
  };

  if (!lotId && isSecurity) {
    return (
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>No lot is assigned to your account yet. Ask the lot owner to assign you to a lot.</p>
      </div>
    );
  }

  const status = selectedSlot?.status;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <i className="fa-solid fa-table-cells-large" style={{ color: 'var(--accent-gold)' }}></i>
          Slot Map{lotName ? ` - ${lotName}` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {counts.available} free • {counts.reserved} reserved • {counts.occupied} occupied
          </span>
          {!isSecurity && (
            <select className="search-input" value={lotId} onChange={(e) => { setLotId(e.target.value); setSelectedSlot(null); }}>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <SlotGrid
        slots={slots}
        floors={floors}
        selectedSlot={selectedSlot}
        activeFloor={activeFloor}
        onFloorChange={setActiveFloor}
        onSlotClick={setSelectedSlot}
      />

      <div style={{ marginTop: '0.85rem', padding: '0.85rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
        {!selectedSlot && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {plate.trim()
              ? <>Choose a free slot on the map to check in <strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{plate.toUpperCase()}</strong>.</>
              : 'Tap a slot on the map to check in a walk-in, hold or release it, or check a vehicle out.'}
          </div>
        )}

        {selectedSlot && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <strong>Slot {selectedSlot.slot_number} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({floorLabel(selectedSlot.floor)} • ₹{selectedSlot.hourly_price}/hr)</span></strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'capitalize', fontWeight: 700 }}>
                <span className={`dot ${status}`}></span>{status}
              </span>
            </div>

            {status === 'available' && (
              <form onSubmit={handleCheckIn} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={labelStyle}>Vehicle Number</label>
                  <input className="search-input" style={{ width: '160px' }} placeholder="TS09 AB 1234" value={plate} onChange={(e) => setPlate(e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input className="search-input" style={{ width: '140px' }} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <button type="submit" className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.1rem' }} disabled={submitting || !plate.trim()}>
                  <i className="fa-solid fa-right-to-bracket"></i> {submitting ? 'Checking in...' : 'Walk-in Check In'}
                </button>
                <button type="button" className="change-btn" onClick={() => setHold(selectedSlot, 'reserved')} title="Mark this slot reserved without a vehicle">
                  Hold Slot
                </button>
              </form>
            )}

            {status === 'reserved' && (
              prebooking ? (
                <div style={{ fontSize: '0.85rem' }}>
                  Pre-booked by <strong>{prebooking.userName}</strong> • <span style={{ fontFamily: 'monospace' }}>{prebooking.vehicleNo}</span>. Scan their QR pass at the gate to check them in.
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Held without a vehicle.</span>
                  <button type="button" className="change-btn" onClick={() => setHold(selectedSlot, 'available')}>Release Hold</button>
                </div>
              )
            )}

            {status === 'occupied' && (
              occupant ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>{occupant.userName}</strong> • <span style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{occupant.vehicleNo}</span>
                    {occupant.ticket_code && <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace' }}>{occupant.ticket_code}</span>}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Since {occupant.entry_time ? new Date(occupant.entry_time).toLocaleTimeString() : '-'}
                    </div>
                  </div>
                  <button type="button" className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.1rem' }} onClick={() => onCheckout && onCheckout(occupant.id)}>
                    <i className="fa-solid fa-right-from-bracket"></i> Check Out
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Occupied. Vehicle details are loading from the gate queue.</div>
              )
            )}

            {status === 'maintenance' && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Under maintenance. Only the lot owner can change this.</div>
            )}
          </>
        )}

        {ticket && (
          <div style={{ marginTop: '0.85rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--accent-gold)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Checked in - ticket code (use to look the vehicle up at exit)</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{ticket.ticket_code}</div>
            <div style={{ fontSize: '0.8rem' }}>
              {ticket.vehicle_number} • Slot {ticket.slot_number} ({ticket.floor}) • ₹{ticket.hourly_price}/hr
              {ticket.linked_account && <span style={{ color: 'var(--accent-emerald)', marginLeft: '0.5rem' }}>linked to user account</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalkInPanel;
