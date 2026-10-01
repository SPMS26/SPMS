import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import LotCard from '../components/parking/LotCard';
import SlotGrid from '../components/parking/SlotGrid';
import SlotDetailsPanel from '../components/parking/SlotDetailsPanel';
import PaymentModal from '../components/booking/PaymentModal';
import QRPassModal from '../components/booking/QRPassModal';

import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { lotService } from '../services/lotService';
import { bookingService } from '../services/bookingService';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const { user, selectedVehicle } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [activeFloor, setActiveFloor] = useState('B1');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [preBookingFee, setPreBookingFee] = useState(10);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeQRBooking, setActiveQRBooking] = useState(null);

  const fetchBookingConfig = async () => {
    try {
      const config = await bookingService.getBookingConfig();
      if (config && config.pre_booking_fee !== undefined) {
        setPreBookingFee(Number(config.pre_booking_fee));
      }
    } catch (err) {
      console.warn('Could not load booking config:', err);
    }
  };

  const fetchLots = async () => {
    try {
      const res = await lotService.getAllLots();
      setLots(res.lots || []);
      if (res.lots && res.lots.length > 0 && !selectedLot) {
        setSelectedLot(res.lots[0]);
      }
    } catch (err) {
      console.error('Error fetching lots:', err);
    }
  };

  const fetchSlots = async (lotId, floor) => {
    try {
      const res = await lotService.getSlotsByLot(lotId, floor);
      setSlots(res.slots || []);
      if (res.slots && res.slots.length > 0) {
        const defaultC5 = res.slots.find(s => s.slot_number === 'C5') || res.slots[0];
        setSelectedSlot(defaultC5);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  };

  const fetchUserBookings = async () => {
    try {
      const res = await bookingService.getUserBookings();
      setUserBookings(res.bookings || []);
    } catch (err) {
      console.error('Error fetching user bookings:', err);
    }
  };

  useEffect(() => {
    fetchLots();
    fetchUserBookings();
    fetchBookingConfig();
  }, []);

  useEffect(() => {
    if (selectedLot) {
      fetchSlots(selectedLot.id, activeFloor);
    }
  }, [selectedLot, activeFloor]);

  // Socket.io real-time slot status updates
  useEffect(() => {
    if (socket) {
      socket.on('slot:statusChanged', ({ lotId, slotId, status, slotNumber }) => {
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status } : s));
        fetchLots(); // refresh available counts
      });
    }
  }, [socket]);

  const handleLotSelect = (lot) => {
    setSelectedLot(lot);
  };

  const handleFloorChange = (floorKey) => {
    setActiveFloor(floorKey);
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
  };

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
        slot: activeBookingData.slot || { ...selectedSlot, parking_lot: selectedLot }
      });
      setShowQRModal(true);

      // Refresh state
      fetchSlots(selectedLot.id, activeFloor);
      fetchUserBookings();
      fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment processing failed.');
    }
  };

  const activeBooking = userBookings.find(b => b.booking_status === 'reserved' || b.booking_status === 'active');

  return (
    <AppLayout>
      {/* Greeting Header & Vehicle Pill */}
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Hello, {user ? user.full_name.split(' ')[0] : 'User'}! 👋</h1>
          <p>Find and book your parking slot</p>
        </div>

        <div className="vehicle-selector-pill">
          <div className="car-icon">
            <i className="fa-solid fa-car-side"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Vehicle</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              {selectedVehicle ? selectedVehicle.vehicle_number : 'No Vehicle Added'}
            </div>
          </div>
          <button className="change-btn" onClick={() => navigate('/profile')}>Change</button>
        </div>
      </div>

      {/* Section 1: Available Parking Lots */}
      <div className="section-subtitle">
        <span>1. Available Parking Lots</span>
        <a href="#map" style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', textDecoration: 'none' }}>
          <i className="fa-solid fa-location-dot"></i> View on Map
        </a>
      </div>

      <div className="lots-cards-row">
        {lots.map(lot => (
          <LotCard
            key={lot.id}
            lot={lot}
            selected={selectedLot && selectedLot.id === lot.id}
            onSelect={handleLotSelect}
          />
        ))}
      </div>

      {/* Section 2: Select Parking Slot Grid + Side Details */}
      <div className="section-subtitle">
        2. Select Parking Slot - {selectedLot ? selectedLot.name : 'Central Parking'}
      </div>

      <div className="slot-booking-layout">
        <SlotGrid
          slots={slots}
          selectedSlot={selectedSlot}
          activeFloor={activeFloor}
          onFloorChange={handleFloorChange}
          onSlotClick={handleSlotClick}
        />

        <SlotDetailsPanel
          selectedSlot={selectedSlot}
          activeFloor={activeFloor}
          onConfirmSelect={handleOpenPaymentModal}
        />
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        slot={selectedSlot}
        lot={selectedLot}
        preBookingFee={preBookingFee}
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
