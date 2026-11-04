import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import LotCard from '../components/parking/LotCard';
import SlotGrid, { sortFloors } from '../components/parking/SlotGrid';
import SlotDetailsPanel from '../components/parking/SlotDetailsPanel';
import PaymentModal from '../components/booking/PaymentModal';
import QRPassModal from '../components/booking/QRPassModal';

import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { lotService } from '../services/lotService';
import { bookingService } from '../services/bookingService';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const { user, vehicles, setVehicles, selectedVehicle, setSelectedVehicle } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [activeFloor, setActiveFloor] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [preBookingFee, setPreBookingFee] = useState(10);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const vehicleDropdownRef = useRef(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target)) {
        setShowVehicleDropdown(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowVehicleDropdown(false);
    };

    if (showVehicleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showVehicleDropdown]);

  // Load vehicles if not cached in auth context
  useEffect(() => {
    if (user && (!vehicles || vehicles.length === 0)) {
      authService.getMe().then(res => {
        if (res?.vehicles && res.vehicles.length > 0) {
          if (setVehicles) setVehicles(res.vehicles);
          if (!selectedVehicle) {
            const def = res.vehicles.find(v => v.is_default) || res.vehicles[0];
            setSelectedVehicle(def);
          }
        }
      }).catch(err => console.error('Failed to load user vehicles:', err));
    }
  }, [user, vehicles, selectedVehicle, setSelectedVehicle, setVehicles]);

  // Ensure an active vehicle is selected if available
  useEffect(() => {
    if (!selectedVehicle && vehicles && vehicles.length > 0) {
      const def = vehicles.find(v => v.is_default) || vehicles[0];
      setSelectedVehicle(def);
    }
  }, [vehicles, selectedVehicle, setSelectedVehicle]);

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

  // Coalesce bursts of refresh requests (socket events + post-payment refresh) into one /lots call
  const fetchLotsRef = useRef(fetchLots);
  fetchLotsRef.current = fetchLots;
  const lotsRefreshTimer = useRef(null);
  const refreshLotsDebounced = () => {
    clearTimeout(lotsRefreshTimer.current);
    lotsRefreshTimer.current = setTimeout(() => fetchLotsRef.current(), 300);
  };
  useEffect(() => () => clearTimeout(lotsRefreshTimer.current), []);

  const fetchSlots = async (lotId, floor) => {
    try {
      const res = await lotService.getSlotsByLot(lotId, floor);
      setSlots(res.slots || []);
      if (res.slots && res.slots.length > 0) {
        setSelectedSlot(res.slots[0]);
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

  // Default to the lot's first floor (floors come from the database)
  useEffect(() => {
    const floors = selectedLot ? sortFloors(selectedLot.floors) : [];
    if (floors.length > 0 && !floors.includes(activeFloor)) {
      setActiveFloor(floors[0]);
    }
  }, [selectedLot]);

  useEffect(() => {
    if (selectedLot && activeFloor) {
      fetchSlots(selectedLot.id, activeFloor);
    }
  }, [selectedLot, activeFloor]);

  // Socket.io real-time slot status updates
  useEffect(() => {
    if (!socket) return;
    const onSlotStatusChanged = ({ slotId, status }) => {
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status } : s));
      refreshLotsDebounced(); // refresh available counts
    };
    socket.on('slot:statusChanged', onSlotStatusChanged);
    return () => socket.off('slot:statusChanged', onSlotStatusChanged);
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
      refreshLotsDebounced();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment processing failed.');
    }
  };

  const activeBooking = userBookings.find(b => (b.booking_status === 'reserved' && (!b.qr_meta?.expires_at || new Date(b.qr_meta.expires_at) > new Date())) || b.booking_status === 'active');

  return (
    <AppLayout>
      {/* Page title & vehicle pill */}
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Book a Parking Slot</h1>
        </div>

        <div style={{ position: 'relative' }} ref={vehicleDropdownRef}>
          <div
            className="vehicle-selector-pill"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowVehicleDropdown(prev => !prev)}
            title="Click to select vehicle"
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {selectedVehicle?.vehicle_type === 'two_wheeler' ? '2-Wheeler' : selectedVehicle ? '4-Wheeler' : 'Current Vehicle'}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                {selectedVehicle ? selectedVehicle.vehicle_number : 'No Vehicle Added'}
              </div>
            </div>
            <button
              className="change-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowVehicleDropdown(prev => !prev);
              }}
              aria-expanded={showVehicleDropdown}
              aria-haspopup="listbox"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
            >
              <span>Change</span>
              <i
                className={`fa-solid fa-chevron-${showVehicleDropdown ? 'up' : 'down'}`}
                style={{ fontSize: '0.65rem', opacity: 0.8 }}
              ></i>
            </button>
          </div>

          {showVehicleDropdown && (
            <div
              className="vehicle-dropdown-menu"
              role="listbox"
              aria-label="Select Vehicle"
            >
              <div className="vehicle-dropdown-header">
                <span className="vehicle-dropdown-title">
                  Select Vehicle
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>
                  {vehicles && vehicles.length > 0 ? `${vehicles.length} available` : '0 registered'}
                </span>
              </div>

              <div className="vehicle-dropdown-list">
                {vehicles && vehicles.length > 0 ? (
                  vehicles.map(v => {
                    const isSelected = selectedVehicle && selectedVehicle.id === v.id;
                    const isTwoWheeler = v.vehicle_type === 'two_wheeler';
                    const typeLabel = isTwoWheeler ? '2-Wheeler (Motorcycle)' : '4-Wheeler (Car)';
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`vehicle-dropdown-item ${isSelected ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicle(v);
                          setShowVehicleDropdown(false);
                          toast.success(`Active vehicle: ${v.vehicle_number}`);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div>
                            <div style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--accent-gold)' : 'var(--text-main)',
                              letterSpacing: '0.02em'
                            }}>
                              {v.vehicle_number}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {typeLabel} {v.vehicle_model ? `• ${v.vehicle_model}` : ''}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <p style={{ margin: '0 0 0.5rem' }}>No vehicles registered yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVehicleDropdown(false);
                        navigate('/profile');
                      }}
                      className="change-btn"
                      style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                    >
                      Add Vehicle in Profile
                    </button>
                  </div>
                )}
              </div>

              {vehicles && vehicles.length > 0 && (
                <div className="vehicle-dropdown-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVehicleDropdown(false);
                      navigate('/profile');
                    }}
                    className="vehicle-dropdown-footer-btn"
                  >
                    <span>Manage in Profile</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Available Parking Lots */}
      <div className="section-subtitle">
        <span>1. Available Parking Lots</span>
        <a href="#map" style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', textDecoration: 'none' }}>
          View on Map
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
          floors={selectedLot ? selectedLot.floors : []}
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
        preBookingFee={selectedLot?.effective_pre_booking_fee ?? preBookingFee}
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
