import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import QRPassModal from '../components/booking/QRPassModal';
import { bookingService } from '../services/bookingService';
import toast from 'react-hot-toast';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQRBooking, setSelectedQRBooking] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await bookingService.getUserBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      toast.error('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenQR = (booking) => {
    setSelectedQRBooking(booking);
    setShowQRModal(true);
  };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Booking History & QR Passes</h1>
          <p>View your active reservations, live parking passes, and session history</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-gold)' }}>
          <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
        </div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-qrcode" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}></i>
          <h3>No Active Bookings or Passes</h3>
          <p style={{ fontSize: '0.85rem' }}>Select an available slot from the Home dashboard to book parking.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {bookings.map(booking => {
            const isCompleted = booking.booking_status === 'completed';
            const isParked = booking.booking_status === 'active' || booking.booking_status === 'parked';
            const isReserved = booking.booking_status === 'reserved';
            const expiresAt = booking.qr_meta?.expires_at || booking.expires_at;
            const isExpired = expiresAt && new Date(expiresAt) < new Date();

            return (
              <div key={booking.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: isReserved ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-gold)', background: 'var(--accent-gold-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {booking.booking_type === 'pre_booking' ? 'Pre-Booking' : 'Live Booking'}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: isParked ? 'rgba(16, 185, 129, 0.15)' : (isReserved ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)'),
                      color: isParked ? '#10b981' : (isReserved ? '#f59e0b' : '#9ca3af')
                    }}>
                      {isParked ? 'PARKED' : (isReserved ? 'RESERVED' : booking.booking_status.toUpperCase())}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Slot {booking.slot ? booking.slot.slot_number : 'C5'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Floor {booking.slot ? booking.slot.floor : 'GF'}
                    </span>
                  </h3>

                  <div className="details-row">
                    <span className="key">Pass Code:</span>
                    <span className="val" style={{ color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                      BK-{booking.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="key">Parking Lot:</span>
                    <span className="val">{booking.slot?.parking_lot ? booking.slot.parking_lot.name : 'Central Parking'}</span>
                  </div>
                  <div className="details-row">
                    <span className="key">Vehicle:</span>
                    <span className="val" style={{ color: '#a5b4fc' }}>{booking.vehicle ? booking.vehicle.vehicle_number : 'TS09 AB 1234'}</span>
                  </div>
                  <div className="details-row">
                    <span className="key">Amount:</span>
                    <span className="val" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>₹{booking.total_amount || 30}.00</span>
                  </div>

                  {expiresAt && (
                    <div className="details-row">
                      <span className="key">Pass Validity:</span>
                      <span className="val" style={{ color: isExpired ? '#ef4444' : 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {isExpired ? 'Expired' : `Until ${new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  className="btn-select-slot"
                  style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={() => handleOpenQR(booking)}
                >
                  <i className="fa-solid fa-qrcode"></i> View Live QR Pass
                </button>
              </div>
            );
          })}
        </div>
      )}

      <QRPassModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        booking={selectedQRBooking}
      />
    </AppLayout>
  );
};

export default BookingsPage;
