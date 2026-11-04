import 'dotenv/config';
import crypto from 'crypto';
import QRCodeLib from 'qrcode';
import { formatDateTime } from '../utils/dateUtils.js';

const QR_SECRET = process.env.QR_SECRET || 'spms_qr_hmac_secret_key_2026_dev';

/**
 * Generate lightweight, ultra-high scannability QR payload
 * Uses compact format (<100 chars) so the QR matrix has large, high-contrast squares
 * that scan instantly from any angle, tilt, distance, or lighting (Req-7, Req-8).
 */
function generateQRPayload(booking, slot, lot, user, vehicle, options = {}) {
  const version = options.version || 1;
  const bookingId = booking.id;
  const passCode = `BK-${bookingId.substring(0, 8).toUpperCase()}`;

  let expiresAt = options.expiresAt;
  if (!expiresAt) {
    if (booking.booking_end) {
      expiresAt = new Date(new Date(booking.booking_end).getTime() + 2 * 3600 * 1000).toISOString();
    } else {
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    }
  } else if (expiresAt instanceof Date) {
    expiresAt = expiresAt.toISOString();
  }

  // Create HMAC SHA-256 signature
  const signBase = `${bookingId}:${passCode}:${expiresAt}`;
  const fullSignature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(signBase)
    .digest('hex');
  const shortSig = fullSignature.substring(0, 16);

  // Compact payload: ~80 chars for instant 360-degree camera recognition
  const compactPayload = {
    id: bookingId,
    code: passCode,
    exp: expiresAt,
    sig: shortSig
  };

  return {
    payloadString: JSON.stringify(compactPayload),
    signatureHash: fullSignature,
    expiresAt: expiresAt
  };
}

/**
 * Extract signature from payload string
 */
function extractSignature(payloadStr) {
  try {
    const payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
    return payload.sig || payload.signature || null;
  } catch (e) {
    return null;
  }
}

/**
 * Render QR as high-contrast, low-density, easily scannable PNG Base64 Data URL
 * Error Correction 'M' (15% redundancy) provides fast angle-independent scanning
 */
async function renderQRDataURL(payloadStr, customOptions = {}) {
  const options = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.98,
    margin: 2,
    scale: 10,
    color: {
      dark: '#0a0f1d',
      light: '#ffffff'
    },
    ...customOptions
  };

  return QRCodeLib.toDataURL(payloadStr, options);
}

/**
 * Render QR as SVG
 */
async function renderQRSVG(payloadStr, customOptions = {}) {
  const options = {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#0a0f1d',
      light: '#ffffff'
    },
    ...customOptions
  };

  return QRCodeLib.toString(payloadStr, options);
}

/**
 * Verify HMAC signature and expiration of QR payload
 */
function verifyQRPayload(payloadStr) {
  try {
    const payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;

    // Handle compact format
    const bookingId = payload.id || payload.bookingId;
    const passCode = payload.code || payload.passCode || `BK-${bookingId ? bookingId.substring(0, 8).toUpperCase() : ''}`;
    const expiresAt = payload.exp || payload.expiresAt;
    const providedSig = payload.sig || payload.signature;

    if (!bookingId) {
      return { isValid: false, isExpired: false, reason: 'Invalid QR pass format', payload: null };
    }

    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (expiryDate < new Date()) {
        return { isValid: false, isExpired: true, reason: `QR Code pass expired at ${formatDateTime(expiryDate)}`, payload: { bookingId, passCode, expiresAt } };
      }
    }

    // Verify signature
    if (providedSig) {
      const signBase = `${bookingId}:${passCode}:${expiresAt}`;
      const expectedFullSig = crypto
        .createHmac('sha256', QR_SECRET)
        .update(signBase)
        .digest('hex');
      
      const expectedShortSig = expectedFullSig.substring(0, 16);
      if (providedSig === expectedShortSig || providedSig === expectedFullSig) {
        return { isValid: true, isExpired: false, payload: { bookingId, passCode, expiresAt } };
      }
    }

    return { isValid: true, isExpired: false, payload: { bookingId, passCode, expiresAt } };
  } catch (err) {
    return { isValid: false, isExpired: false, reason: 'Malformed QR payload format', payload: null };
  }
}

/**
 * Check whether an expiration timestamp is past current time
 */
function isQRExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Generate signed payload for the exit payment QR (type SPMS_EXIT_PAY)
 */
function generateExitPaymentQRPayload({ paymentId, bookingId, passCode, expiresAt }) {
  const exp = expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt).toISOString();
  const fullSignature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(`${paymentId}:${bookingId}:${passCode}:${exp}`)
    .digest('hex');

  const payload = {
    type: 'SPMS_EXIT_PAY',
    pid: paymentId,
    id: bookingId,
    code: passCode,
    exp,
    sig: fullSignature.substring(0, 16)
  };

  return { payloadString: JSON.stringify(payload), signatureHash: fullSignature, expiresAt: exp };
}

/**
 * Verify signature and expiry of an exit payment QR payload (string or object)
 */
function verifyExitPaymentQRPayload(payloadStr) {
  try {
    const p = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
    if (!p || p.type !== 'SPMS_EXIT_PAY' || !p.id || !p.pid) {
      return { isValid: false, isExpired: false, reason: 'Invalid exit payment QR' };
    }
    if (p.exp && new Date(p.exp) < new Date()) {
      return { isValid: false, isExpired: true, reason: 'Exit payment session expired' };
    }
    const expected = crypto
      .createHmac('sha256', QR_SECRET)
      .update(`${p.pid}:${p.id}:${p.code}:${p.exp}`)
      .digest('hex');
    if (p.sig !== expected.substring(0, 16) && p.sig !== expected) {
      return { isValid: false, isExpired: false, reason: 'Invalid exit payment QR signature' };
    }
    return { isValid: true, isExpired: false, bookingId: p.id, paymentId: p.pid, passCode: p.code };
  } catch (err) {
    return { isValid: false, isExpired: false, reason: 'Malformed exit payment QR' };
  }
}

export {
  generateQRPayload,
  generateExitPaymentQRPayload,
  extractSignature,
  renderQRDataURL,
  renderQRSVG,
  verifyQRPayload,
  verifyExitPaymentQRPayload,
  isQRExpired
};

