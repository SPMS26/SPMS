import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext';

const QRPassModal = ({ isOpen, onClose, booking }) => {
  const { user: authUser } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!booking) return;

    const isSessionComplete = booking.booking_status === 'completed' || booking.booking_status === 'cancelled' || booking.booking_status === 'expired';

    // Use compact payload format
    const compactPayload = {
      id: booking.id,
      code: `BK-${booking.id?.substring(0, 8).toUpperCase()}`,
      exp: booking.qr_meta?.expires_at || booking.expires_at || booking.booking_end,
      status: booking.booking_status
    };

    if (booking.qr_image) {
      setQrDataUrl(booking.qr_image);
    } else {
      QRCode.toDataURL(JSON.stringify(compactPayload), {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
        color: {
          dark: isSessionComplete ? '#A98B55' : '#0a0f1d',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }

    if (isSessionComplete) {
      setIsExpired(true);
      setTimeLeft('Session Completed (Exited)');
      return;
    }

    const isParked = booking.booking_status === 'active' || booking.booking_status === 'parked';
    if (isParked) {
      setIsExpired(false);
      const updateParked = () => {
        const start = booking.entry_time || booking.booking_start || booking.created_at;
        const diffSec = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000));
        const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
        const s = String(diffSec % 60).padStart(2, '0');
        setTimeLeft(`${h}h ${m}m ${s}s`);
      };
      updateParked();
      const interval = setInterval(updateParked, 1000);
      return () => clearInterval(interval);
    }

    // Expiration timer logic
    const expiresAtStr = booking.qr_meta?.expires_at || booking.expires_at || booking.booking_end;
    if (expiresAtStr) {
      const updateCountdown = () => {
        const diff = new Date(expiresAtStr) - new Date();
        if (diff <= 0) {
          setIsExpired(true);
          setTimeLeft('Expired');
        } else {
          setIsExpired(false);
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft('Active Session');
      setIsExpired(false);
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const isSessionComplete = booking.booking_status === 'completed' || booking.booking_status === 'cancelled' || booking.booking_status === 'expired';
  const bookingCode = booking.bookingCode || `BK-${booking.id?.substring(0, 8).toUpperCase()}` || 'BK-PASS';
  const userName = booking.userName || booking.user_name || booking.user?.full_name || authUser?.full_name || 'Valued User';
  const vehicleNo = booking.vehicleNo || booking.vehicle?.vehicle_number || booking.vehicle_number || 'N/A';
  const lotName = booking.lotName || booking.slot?.parking_lot?.name || '--';
  const floor = booking.floor || booking.slot?.floor || '--';
  const slotCode = booking.slotCode || (booking.slot ? booking.slot.slot_number : '--');
  const bookingType = booking.booking_type === 'walk_in' ? 'Walk-in' : 'Pre-Booking';
  const amountPaid = Number(booking.pre_booking_fee) > 0 ? booking.pre_booking_fee : (booking.total_amount || 0);

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `SPMS-Pass-${bookingCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
      <div className="modal-box qr-modal">
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-qrcode" style={{ color: 'var(--accent-gold)' }}></i> Booking QR Pass
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="qr-layout">
        <div className="qr-pass-ticket qr-ticket qr-left">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {bookingType} Pass
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              background: isExpired || isSessionComplete ? 'rgba(138, 132, 120, 0.15)' : 'rgba(227, 204, 154, 0.15)',
              color: isExpired || isSessionComplete ? '#8A8478' : '#E3CC9A',
              border: `1px solid ${isExpired || isSessionComplete ? 'rgba(138, 132, 120, 0.3)' : 'rgba(227, 204, 154, 0.3)'}`
            }}>
              <i className={`fa-solid ${isExpired || isSessionComplete ? 'fa-ban' : 'fa-circle-check'}`} style={{ marginRight: '0.25rem' }}></i> {isSessionComplete ? 'SESSION COMPLETED' : (booking.booking_status === 'active' || booking.booking_status === 'parked') ? 'VEHICLE PARKED' : (isExpired ? 'EXPIRED' : 'ACTIVE PASS')}
            </span>
          </div>

          <div className="qr-code-label">{bookingCode}</div>

          {/* QR Code Container */}
          <div className="qr-frame">
            {qrDataUrl ? (
              <img
                className="qr-img"
                src={qrDataUrl}
                alt={`QR Pass for ${bookingCode}`}
                style={{ filter: (isExpired || isSessionComplete) ? 'grayscale(100%) opacity(0.4)' : 'none' }}
              />
            ) : (
              <div className="qr-placeholder">
                <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
              </div>
            )}

            {(isExpired || isSessionComplete) && !(booking.booking_status === 'active' || booking.booking_status === 'parked') && (
              <div className="qr-stamp">
                EXPIRED
              </div>
            )}

            <div style={{ fontSize: '0.7rem', color: (isExpired || isSessionComplete) ? '#8A8478' : '#4F4B43', fontWeight: 600, marginTop: '0.4rem' }}>
              {(isExpired || isSessionComplete) ? 'Pass Expired / Cannot be reused' : 'Signed and verified pass'}
            </div>
          </div>

        </div>

        <div className="qr-right">
          {/* Expiration Timer Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            marginBottom: '0.85rem',
            fontSize: '0.78rem'
          }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <i className={`fa-solid ${isExpired || isSessionComplete ? 'fa-ban' : 'fa-hourglass-half'}`} style={{ color: isExpired || isSessionComplete ? '#8A8478' : 'var(--accent-gold)' }}></i> {(booking.booking_status === 'active' || booking.booking_status === 'parked') ? 'Time Parked:' : 'Pass Status:'}
            </span>
            <span style={{ fontWeight: 700, color: isExpired || isSessionComplete ? '#8A8478' : 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {timeLeft}
            </span>
          </div>

          {/* Ticket Breakdown */}
          <div className="qr-details">
            <div className="details-row"><span className="key">User Name:</span><span className="val">{userName}</span></div>
            <div className="details-row"><span className="key">Vehicle No:</span><span className="val" style={{ color: '#EBD9AE', fontWeight: 600 }}>{vehicleNo}</span></div>
            <div className="details-row"><span className="key">Parking Location:</span><span className="val">{lotName} (Floor {floor})</span></div>
            <div className="details-row"><span className="key">Slot Allocated:</span><span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>Slot {slotCode}</span></div>
            <div className="details-row"><span className="key">Payment Status:</span><span className="val" style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>PAID (₹{Number(amountPaid).toFixed(2)})</span></div>
          </div>

        <div className="qr-actions">
          <button
            type="button"
            onClick={handleDownloadQR}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-bright)',
              color: 'var(--text-main)',
              padding: '0.6rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <i className="fa-solid fa-download"></i> Save QR Image
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--primary)',
              border: 'none',
              color: '#ffffff',
              padding: '0.6rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>

        <p className="qr-note" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.85rem' }}>
          {(booking.booking_status === 'active' || booking.booking_status === 'parked')
          ? 'Vehicle is parked in slot. Present this QR pass to gate security upon exit.'
          : (isExpired || isSessionComplete)
            ? 'This pass has already been used and completed.'
            : 'Show this QR code to gate security at the entrance and exit.'}
        </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default QRPassModal;
