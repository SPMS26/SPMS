import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import NoResults from '../components/common/NoResults';
import { matchesSearch } from '../utils/searchUtils';
import QRPassModal from '../components/booking/QRPassModal';
import { bookingService } from '../services/bookingService';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/common/ConfirmProvider';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useCancelBooking } from '../hooks/useCancelBooking';

const formatParkedDuration = (startTime, currentNow) => {
  if (!startTime) return '00h 00m 00s';
  const diffSec = Math.max(0, Math.floor((currentNow - new Date(startTime).getTime()) / 1000));
  const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
  const s = String(diffSec % 60).padStart(2, '0');
  return `${h}h ${m}m ${s}s`;
};

const BookingsPage = () => {
  const confirm = useConfirm();
  const cancelBooking = useCancelBooking();
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedQRBooking, setSelectedQRBooking] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const [now, setNow] = useState(Date.now());

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
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useLiveRefresh(fetchBookings, {
    pollMs: 60000,
    disconnectedPollMs: 15000,
    matches: (event) => bookings.some((b) => b.slot?.id === event.slotId)
  });

  const handleOpenQR = (booking) => {
    setSelectedQRBooking(booking);
    setShowQRModal(true);
  };

    const handlePayReservation = async (booking) => {
    const fee = Number(booking.pre_booking_fee || 0).toFixed(2);
    if (!(await confirm({ title: `Pay the ₹${fee} reservation fee?`, message: 'Your QR pass is generated as soon as the payment goes through.', confirmLabel: `Pay ₹${fee}` }))) return;
    try {
      const res = await bookingService.confirmPayment(booking.id);
      toast.success('Reservation payment confirmed! Digital QR Pass generated.');
      await fetchBookings();
      setSelectedQRBooking(res.booking || { ...booking, qr_image: res.qr_image, qr_code: res.qr_code, payment_status: 'paid', booking_status: 'reserved' });
      setShowQRModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment confirmation failed.');
    }
  };

  const handleCancelBooking = async (booking) => {
    if (await cancelBooking(booking)) await fetchBookings();
  };

  const visibleBookings = bookings.filter((b) => matchesSearch(search, [
    b.vehicle?.vehicle_number,
    b.slot?.parking_lot?.name,
    b.slot?.slot_number,
    `BK-${b.id.substring(0, 8)}`,
    b.booking_status
  ]));

  return (
    <AppLayout search={{ value: search, onChange: setSearch, placeholder: 'Search by vehicle, lot, slot or booking ID' }}>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>My bookings</h1>
          <p>Your parking passes, current and past.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-block"><i className="fa-solid fa-circle-notch fa-spin fa-lg"></i></div>
      ) : bookings.length === 0 ? (
        <div className="card empty-state">
          <i className="fa-solid fa-ticket"></i>
          <h3>No bookings yet</h3>
          <p>Book a slot from Find parking and your pass will show up here.</p>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="card">
          <NoResults query={search} onClear={() => setSearch('')} />
        </div>
      ) : (
        <div className="booking-grid">
          {visibleBookings.map(booking => {
            const isCompleted = booking.booking_status === 'completed';
            const isParked = booking.booking_status === 'active' || booking.booking_status === 'parked';
            const isPaymentPending = booking.payment_status === 'pending' || booking.booking_status === 'pending_payment';
            const expiresAt = booking.qr_meta?.expires_at || booking.expires_at;
            // Pass arrival countdown only applies to unparked reservations
            const isPassExpired = Boolean(!isParked && !isCompleted && expiresAt && new Date(expiresAt).getTime() <= now);
            const isExpired = booking.booking_status === 'expired' || (booking.booking_status === 'reserved' && isPassExpired);
            const isReserved = booking.booking_status === 'reserved' && !isExpired;
            const isCancelled = booking.booking_status === 'cancelled';
            const canCancel = isReserved || booking.booking_status === 'pending_payment';
            const isLive = isReserved || isParked || isPaymentPending;
            const fee = Number(booking.pre_booking_fee || booking.total_amount || 0).toFixed(2);

            const status = isCancelled ? { label: 'Cancelled', badge: '' }
              : isPaymentPending ? { label: 'Payment due', badge: 'badge-warn' }
              : isExpired ? { label: 'Expired', badge: 'badge-danger' }
              : isParked ? { label: 'Parked now', badge: 'badge-ok' }
              : isReserved ? { label: 'Pass ready', badge: 'badge-accent' }
              : isCompleted ? { label: 'Completed', badge: 'badge-busy' }
              : { label: booking.booking_status, badge: '' };

            return (
              <article key={booking.id} className={`booking-card ${isLive && !isCancelled ? 'is-live' : ''}`}>
                <div className="booking-card-top">
                  <span className={`badge ${status.badge}`}>{status.label}</span>
                  <span className="booking-card-kind">{booking.booking_type === 'pre_booking' ? 'Pre-booking' : 'Walk-in'}</span>
                </div>

                <div className="booking-card-slot">
                  <h3>{booking.slot?.slot_number || '—'}</h3>
                  <span>Floor {booking.slot?.floor || '—'}</span>
                </div>
                <p className="booking-card-lot">{booking.slot?.parking_lot?.name || '—'}</p>

                <div className="details-row">
                  <span className="key">Pass code</span>
                  <span className="val mono">BK-{booking.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="details-row">
                  <span className="key">Vehicle</span>
                  <span className="val">{booking.vehicle?.vehicle_number ? <span className="plate">{booking.vehicle.vehicle_number}</span> : '—'}</span>
                </div>
                <div className="details-row">
                  <span className="key">Reservation fee</span>
                  <span className="val mono">₹{fee}</span>
                </div>
                {isParked ? (
                  <div className="details-row">
                    <span className="key">Parked for</span>
                    <span className="val mono">{formatParkedDuration(booking.entry_time || booking.booking_start || booking.created_at, now)}</span>
                  </div>
                ) : expiresAt && !isPaymentPending && !isCompleted && !isCancelled && (
                  <div className="details-row">
                    <span className="key">Pass valid</span>
                    <span className="val" style={isExpired ? { color: 'var(--danger)' } : undefined}>
                      {isExpired ? 'Expired' : `until ${new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  </div>
                )}

                <div className="booking-card-actions">
                  {isCancelled ? (
                    <div className="booking-card-status-note"><i className="fa-solid fa-ban"></i> Cancelled</div>
                  ) : isPaymentPending ? (
                    <button className="btn btn-primary btn-block" onClick={() => handlePayReservation(booking)}>
                      Pay ₹{Number(booking.pre_booking_fee || 0).toFixed(2)} and get pass
                    </button>
                  ) : isLive ? (
                    <button className="btn btn-primary btn-block" onClick={() => handleOpenQR(booking)}>
                      <i className="fa-solid fa-qrcode"></i> {isParked ? 'Show exit pass' : 'Show pass'}
                    </button>
                  ) : (
                    <button className="btn btn-block" onClick={() => handleOpenQR(booking)}>
                      View pass
                    </button>
                  )}
                  {canCancel && (
                    <button type="button" className="btn btn-danger-outline btn-block" onClick={() => handleCancelBooking(booking)}>
                      Cancel booking
                    </button>
                  )}
                </div>
              </article>
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
