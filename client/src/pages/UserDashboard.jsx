import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import LotCard from '../components/parking/LotCard';
import LotSearchOverlay from '../components/parking/LotSearchOverlay';
import SlotGrid, { sortFloors } from '../components/parking/SlotGrid';
import SlotDetailsPanel from '../components/parking/SlotDetailsPanel';
import VehicleSelector from '../components/parking/VehicleSelector';
import PaymentModal from '../components/booking/PaymentModal';
import QRPassModal from '../components/booking/QRPassModal';
import { useLots } from '../components/parking/useLots';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { lotService } from '../services/lotService';
import { bookingService } from '../services/bookingService';
import toast from 'react-hot-toast';

const LOTS_PREVIEW_COUNT = 4;

const firstSlotOn = (slots, floor) => slots.find((slot) => slot.floor === floor) || null;

// How far down the screen the slots can sit before tapping a card scrolls to them
const SCROLL_THRESHOLD = 0.75;

// All lots at the top, the selected lot's slots below. The selection lives in this page only, never in the URL.
const UserDashboard = () => {
  const { user, selectedVehicle } = useAuth();
  const { socket } = useSocket();
  const { lots, loading, refresh: refreshLots } = useLots();

  const [pickedLotId, setPickedLotId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [showAllLots, setShowAllLots] = useState(false);
  // A lot and its slots change together, so the screen never shows one lot's slots under another's name
  const [slotData, setSlotData] = useState({ lotId: null, slots: [] });
  const [activeFloor, setActiveFloor] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeQRBooking, setActiveQRBooking] = useState(null);
  const slotRequest = useRef(0);
  const slotSection = useRef(null);
  const scrollPending = useRef(false);

  // The first lot is the default, and takes over if the picked lot stops being available
  const selectedLot = lots.find((lot) => lot.id === pickedLotId) || lots[0] || null;
  // Effects follow the id: the lot object is replaced on every live refresh, which must not reset the slot map
  const selectedLotId = selectedLot?.id;
  const { slots } = slotData;
  // The lot on screen. It stays until the picked lot's slots have arrived, which is what stops the blink.
  const shownLot = lots.find((lot) => lot.id === slotData.lotId) || null;

  // Every floor at once, so switching floors needs no request and cannot flash an empty map
  useEffect(() => {
    if (!selectedLot) return;
    const request = ++slotRequest.current;
    lotService.getSlotsByLot(selectedLot.id)
      .then((res) => {
        if (request !== slotRequest.current) return; // a newer lot was picked meanwhile
        const lotSlots = res.slots || [];
        const floor = sortFloors(selectedLot.floors)[0] || '';
        setSlotData({ lotId: selectedLot.id, slots: lotSlots });
        setActiveFloor(floor);
        setSelectedSlot(firstSlotOn(lotSlots, floor));
      })
      .catch((err) => {
        console.error('Error fetching slots:', err);
        if (request === slotRequest.current) toast.error('Could not load the slots for this lot.');
      });
  }, [selectedLotId]);

  const refreshShownSlots = async () => {
    const request = ++slotRequest.current;
    try {
      const res = await lotService.getSlotsByLot(slotData.lotId);
      if (request !== slotRequest.current) return;
      const lotSlots = res.slots || [];
      setSlotData({ lotId: slotData.lotId, slots: lotSlots });
      setSelectedSlot((prev) => lotSlots.find((slot) => slot.id === prev?.id) || prev);
    } catch (err) {
      console.error('Error refreshing slots:', err);
    }
  };

  const scrollToSlots = () => {
    const section = slotSection.current;
    if (section && section.getBoundingClientRect().top > window.innerHeight * SCROLL_THRESHOLD) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // After a card tap, wait for the new slots so the scroll lands on what the user asked for
  useEffect(() => {
    if (scrollPending.current && slotData.lotId === selectedLotId) {
      scrollPending.current = false;
      scrollToSlots();
    }
  }, [slotData.lotId, selectedLotId]);

  const handleLotSelect = (lot) => {
    if (lot.id === selectedLotId) {
      scrollToSlots();
      return;
    }
    scrollPending.current = true;
    setPickedLotId(lot.id);
  };

  // A search pick replaces the content where it is and leaves the page position alone
  const handleSearchSelect = (lot) => {
    scrollPending.current = false;
    setShowOnlySelected(true);
    setPickedLotId(lot.id);
  };

  const handleFloorChange = (floor) => {
    setActiveFloor(floor);
    setSelectedSlot(firstSlotOn(slots, floor));
  };

  useEffect(() => {
    if (!socket) return;
    const onSlotStatusChanged = ({ slotId, status }) => {
      setSlotData((prev) => ({ ...prev, slots: prev.slots.map((s) => (s.id === slotId ? { ...s, status } : s)) }));
      setSelectedSlot((prev) => (prev?.id === slotId ? { ...prev, status } : prev));
    };
    socket.on('slot:statusChanged', onSlotStatusChanged);
    return () => socket.off('slot:statusChanged', onSlotStatusChanged);
  }, [socket]);

  const handleOpenPaymentModal = () => {
    if (!selectedVehicle) {
      toast.error('Please add a vehicle to your profile before booking.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    try {
      // Step 1: Create pre-booking (reserves slot, pending payment, no QR generated yet)
      const preRes = await bookingService.createPreBooking(
        selectedSlot.id,
        selectedVehicle.id,
        new Date().toISOString(),
        2
      );

      const bookingId = preRes.booking?.id;
      if (!bookingId) {
        throw new Error('Failed to create pre-booking session');
      }

      // Step 2: Pay reservation fee through simulated/manual project payment mechanism
      const confirmRes = await bookingService.confirmPayment(bookingId);

      setShowPaymentModal(false);
      toast.success('Reservation confirmed! Digital QR Parking Pass generated.');

      const activeBookingData = confirmRes.booking || {
        ...preRes.booking,
        qr_image: confirmRes.qr_image,
        qr_code: confirmRes.qr_code,
        booking_status: 'reserved'
      };

      setActiveQRBooking({
        ...activeBookingData,
        qr_image: confirmRes.qr_image,
        qr_code: confirmRes.qr_code,
        user: activeBookingData.user || user,
        vehicle: activeBookingData.vehicle || selectedVehicle,
        slot: activeBookingData.slot || { ...selectedSlot, parking_lot: shownLot }
      });
      setShowQRModal(true);

      refreshShownSlots();
      refreshLots();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment processing failed.');
    }
  };

  const hasMoreLots = lots.length > LOTS_PREVIEW_COUNT;

  const handleShowAllLots = () => {
    setShowOnlySelected(false);
    setShowAllLots(true);
  };

  // The preview always includes the selected lot, so collapsing the list never hides it
  const previewLots = () => {
    const preview = lots.slice(0, LOTS_PREVIEW_COUNT);
    if (!selectedLot || preview.some((lot) => lot.id === selectedLotId)) return preview;
    return [...preview.slice(0, LOTS_PREVIEW_COUNT - 1), selectedLot];
  };

  let visibleLots = lots;
  if (showOnlySelected) visibleLots = lots.filter((lot) => lot.id === selectedLotId);
  else if (hasMoreLots && !showAllLots) visibleLots = previewLots();

  return (
    <AppLayout search={{ placeholder: 'Search lots by name or location', onOpen: () => setSearchOpen(true) }}>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Book a Parking Slot</h1>
        </div>
        <VehicleSelector />
      </div>

      <div className="section-subtitle">
        <span>{showOnlySelected ? '1. Search Result' : '1. Available Parking Lots'}</span>
        {showOnlySelected || (hasMoreLots && !showAllLots) ? (
          <button type="button" className="change-btn" onClick={handleShowAllLots}>
            <i className="fa-solid fa-table-cells-large"></i> Show all lots ({lots.length})
          </button>
        ) : hasMoreLots && (
          <button type="button" className="change-btn" onClick={() => setShowAllLots(false)}>
            <i className="fa-solid fa-chevron-up"></i> Show fewer
          </button>
        )}
      </div>

      <div className={`lots-cards-row ${showOnlySelected ? 'single-lot' : ''}`}>
        {visibleLots.map((lot) => (
          <LotCard
            key={lot.id}
            lot={lot}
            selected={lot.id === selectedLotId}
            onSelect={handleLotSelect}
          />
        ))}
      </div>

      {shownLot ? (
        <div className="book-slot-section" ref={slotSection}>
          <div className="section-subtitle">
            <span>2. Select Parking Slot - {shownLot.name}</span>
          </div>

          <div className="slot-booking-layout">
            <SlotGrid
              slots={slots}
              floors={shownLot.floors || []}
              selectedSlot={selectedSlot}
              activeFloor={activeFloor}
              onFloorChange={handleFloorChange}
              onSlotClick={setSelectedSlot}
            />

            <SlotDetailsPanel
              selectedSlot={selectedSlot}
              activeFloor={activeFloor}
              onConfirmSelect={handleOpenPaymentModal}
            />
          </div>
        </div>
      ) : !loading && lots.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          No parking lots available yet.
        </div>
      )}

      {searchOpen && (
        <LotSearchOverlay
          lots={lots}
          onSelect={handleSearchSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        slot={selectedSlot}
        lot={shownLot}
        onSubmitPayment={handleProcessPayment}
      />

      <QRPassModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        booking={activeQRBooking}
      />
    </AppLayout>
  );
};

export default UserDashboard;
