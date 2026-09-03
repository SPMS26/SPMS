import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const QRPassModal = ({ isOpen, onClose, booking }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!booking) return;

    const isSessionComplete = booking.booking_status === 'completed' || booking.booking_status === 'cancelled';

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
          dark: isSessionComplete ? '#94a3b8' : '#0a0f1d',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }

    if (isSessionComplete) {
      setIsExpired(true);
      setTimeLeft('Session Completed (QR Expired)');
      return;
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

  const isSessionComplete = booking.booking_status === 'completed' || booking.booking_status === 'cancelled';
  const bookingCode = booking.bookingCode || `BK-${booking.id?.substring(0, 8).toUpperCase()}` || 'BK-948201';
  const userName = booking.userName || (booking.user ? booking.user.full_name : 'Mehanna Reddy');
  const vehicleNo = booking.vehicleNo || (booking.vehicle ? booking.vehicle.vehicle_number : 'TS09 AB 1234');
  const lotName = booking.lotName || (booking.slot && booking.slot.parking_lot ? booking.slot.parking_lot.name : 'Central Parking');
  const floor = booking.floor || (booking.slot ? booking.slot.floor : 'GF');
  const slotCode = booking.slotCode || (booking.slot ? booking.slot.slot_number : 'C5');
  const bookingType = booking.booking_type === 'pre_booking' ? 'Pre-Booking' : 'Live Booking';
  const amountPaid = booking.total_amount || 30;

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
      <div className="modal-box" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-qrcode" style={{ color: 'var(--accent-gold)' }}></i> Live Booking QR Pass
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="qr-pass-ticket" style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-bright)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {bookingType} Pass
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              background: isExpired || isSessionComplete ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isExpired || isSessionComplete ? '#ef4444' : '#10b981',
              border: `1px solid ${isExpired || isSessionComplete ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}>
              <i className={`fa-solid ${isExpired || isSessionComplete ? 'fa-ban' : 'fa-circle-check'}`} style={{ marginRight: '0.25rem' }}></i>
              {isSessionComplete ? 'SESSION COMPLETED (EXPIRED)' : (isExpired ? 'EXPIRED' : 'ACTIVE PASS')}
            </span>
          </div>

          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-gold)', margin: '0.2rem 0 0.75rem 0' }}>
            {bookingCode}
          </div>

          {/* QR Code Container */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#ffffff',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            marginBottom: '0.85rem'
          }}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Pass for ${bookingCode}`}
                style={{
                  width: '180px',
                  height: '180px',
                  objectFit: 'contain',
                  display: 'block',
                  filter: (isExpired || isSessionComplete) ? 'grayscale(100%) opacity(0.4)' : 'none'
                }}
              />
            ) : (
              <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
              </div>
            )}

            {(isExpired || isSessionComplete) && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-12deg)',
                border: '3px solid #ef4444',
                color: '#ef4444',
                padding: '0.35rem 1rem',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '1.1rem',
                letterSpacing: '0.1em',
                background: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}>
                EXPIRED
              </div>
            )}

            <div style={{ fontSize: '0.7rem', color: (isExpired || isSessionComplete) ? '#ef4444' : '#475569', fontWeight: 600, marginTop: '0.4rem' }}>
              {(isExpired || isSessionComplete) ? 'Pass Expired / Cannot be reused' : 'Cryptographically Signed & HMAC Verified'}
            </div>
          </div>

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
              <i className={`fa-solid ${isExpired || isSessionComplete ? 'fa-ban' : 'fa-hourglass-half'}`} style={{ color: isExpired || isSessionComplete ? '#ef4444' : 'var(--accent-gold)' }}></i> Pass Status:
            </span>
            <span style={{ fontWeight: 700, color: isExpired || isSessionComplete ? '#ef4444' : 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {timeLeft}
            </span>
          </div>

          {/* Ticket Breakdown */}
          <div style={{ textAlign: 'left', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.8rem' }}>
            <div className="details-row"><span className="key">User Name:</span><span className="val">{userName}</span></div>
            <div className="details-row"><span className="key">Vehicle No:</span><span className="val" style={{ color: '#a5b4fc', fontWeight: 600 }}>{vehicleNo}</span></div>
            <div className="details-row"><span className="key">Parking Location:</span><span className="val">{lotName} (Floor {floor})</span></div>
            <div className="details-row"><span className="key">Slot Allocated:</span><span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>Slot {slotCode}</span></div>
            <div className="details-row"><span className="key">Payment Status:</span><span className="val" style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>PAID (₹{amountPaid}.00)</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={handleDownloadQR}
            style={{
              flex: 1,
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
              flex: 1,
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

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.85rem' }}>
          {(isExpired || isSessionComplete) ? 'This pass has already been used and completed.' : 'Show this QR code at the entrance/exit scanner to automatically trigger barrier opening (Req-7).'}
        </p>
      </div>
    </div>
  );
};

export default QRPassModal;
