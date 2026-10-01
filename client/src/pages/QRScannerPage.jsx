import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { qrService } from '../services/qrService';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

// Web Audio API Synthesizer for Gate Chimes
const playAudioFeedback = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12);
      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime + 0.12);
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(146.83, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (err) {
    // Audio fallback
  }
};

const QRScannerPage = () => {
  const [gateMode, setGateMode] = useState('auto'); // 'auto' | 'entry' | 'exit'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isBarrierOpen, setIsBarrierOpen] = useState(false);
  const [barrierCountdown, setBarrierCountdown] = useState(0);
  const [gateQueue, setGateQueue] = useState({ pending_arrivals: [], active_parked: [] });
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);

  // Manual Exit Payment Session States
  const [exitPaymentSession, setExitPaymentSession] = useState(null);
  const [exitPaymentSecondsLeft, setExitPaymentSecondsLeft] = useState(null);
  const [isExitPaymentExpired, setIsExitPaymentExpired] = useState(false);
  const [isConfirmingExitPayment, setIsConfirmingExitPayment] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastScannedPayloadRef = useRef('');
  const lastScanTimestampRef = useRef(0);
  const countdownIntervalRef = useRef(null);

  // Track Exit Payment Session Expiry from backend system_settings (not hardcoded)
  useEffect(() => {
    if (!exitPaymentSession) {
      setExitPaymentSecondsLeft(null);
      setIsExitPaymentExpired(false);
      return;
    }

    const expiresAtStr = exitPaymentSession.payment?.expires_at || exitPaymentSession.exit_payment_qr?.expires_at;
    if (!expiresAtStr) return;

    const updateTimer = () => {
      const diff = new Date(expiresAtStr) - new Date();
      const seconds = Math.floor(diff / 1000);
      if (seconds <= 0) {
        setExitPaymentSecondsLeft(0);
        setIsExitPaymentExpired(true);
      } else {
        setExitPaymentSecondsLeft(seconds);
        setIsExitPaymentExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [exitPaymentSession]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const fetchQueue = async () => {
    try {
      const res = await qrService.getGateQueue();
      setGateQueue(res || { pending_arrivals: [], active_parked: [] });
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // Initialize and start continuous universal 360-degree camera scanner
  useEffect(() => {
    const scannerElementId = 'autonomous-qr-video-feed';
    let isMounted = true;

    const startCameraScanner = async () => {
      try {
        setCameraError(null);
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          try {
            await html5QrCodeRef.current.stop();
          } catch (e) {}
        }

        const html5QrCode = new Html5Qrcode(scannerElementId, {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Native hardware acceleration (360-degree, multi-angle, instant)
          },
          verbose: false
        });
        html5QrCodeRef.current = html5QrCode;

        const scanConfig = {
          fps: 30, // Ultra-responsive 30 FPS scanning
          disableFlip: false // Allows upside-down, angled, and mirrored passes
        };

        const cameraConfig = {
          facingMode: 'environment'
        };

        await html5QrCode.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            if (isMounted) {
              handleAutoDetectedQR(decodedText);
            }
          },
          () => {}
        );

        if (isMounted) {
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Primary camera stream notice, trying fallback camera ID:', err);
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0 && isMounted) {
            const html5QrCode = new Html5Qrcode(scannerElementId, {
              experimentalFeatures: { useBarCodeDetectorIfSupported: true },
              verbose: false
            });
            html5QrCodeRef.current = html5QrCode;
            await html5QrCode.start(
              cameras[0].id,
              { fps: 30, disableFlip: false },
              (decodedText) => {
                if (isMounted) {
                  handleAutoDetectedQR(decodedText);
                }
              },
              () => {}
            );
            if (isMounted) {
              setCameraActive(true);
            }
          } else {
            if (isMounted) {
              setCameraError('No active camera detected on this terminal.');
            }
          }
        } catch (e) {
          if (isMounted) {
            setCameraError('Camera access unavailable. Use manual code lookup or image upload below.');
          }
        }
      }
    };

    startCameraScanner();

    return () => {
      isMounted = false;
      const scanner = html5QrCodeRef.current;
      if (scanner) {
        try {
          if (scanner.isScanning) {
            scanner.stop().then(() => {
              try { scanner.clear(); } catch (e) {}
            }).catch(() => {});
          } else {
            try { scanner.clear(); } catch (e) {}
          }
        } catch (e) {}
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleAutoDetectedQR = async (qrPayloadStr) => {
    if (!qrPayloadStr || isProcessingRef.current) return;

    const now = Date.now();
    if (
      qrPayloadStr === lastScannedPayloadRef.current &&
      now - lastScanTimestampRef.current < 5000
    ) {
      return;
    }

    lastScannedPayloadRef.current = qrPayloadStr;
    lastScanTimestampRef.current = now;

    await executeSecurityValidation(qrPayloadStr);
  };

  const executeSecurityValidation = async (rawCodeOrId) => {
    try {
      setIsProcessing(true);
      isProcessingRef.current = true;

      let res;
      if (gateMode === 'entry') {
        res = await qrService.validateEntry(null, rawCodeOrId);
      } else if (gateMode === 'exit') {
        res = await qrService.validateExit(null, rawCodeOrId);
      } else {
        res = await qrService.autoValidate(rawCodeOrId, { preferred_mode: 'auto' });
      }

      // Check if exit payment is required (Barrier must stay CLOSED)
      if (res.action === 'PAYMENT_REQUIRED' || res.barrier_status === 'CLOSED' || res.payment_required) {
        setIsBarrierOpen(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        playAudioFeedback('error');
        toast(res.message || 'Exit payment required. Barrier remains closed until payment confirmed.', {
          icon: '⚠️',
          duration: 4000
        });

        const bookingData = res.booking || res.details || {};
        const paymentData = res.payment || {};
        const qrData = res.exit_payment_qr || {};

        setExitPaymentSession({
          booking: bookingData,
          payment: paymentData,
          exit_payment_qr: qrData,
          rawCodeOrId
        });
        setIsExitPaymentExpired(false);
        setScanResult(null);

        fetchQueue();
        setManualInput('');
        return;
      }

      // Access cleared (Entry or completed Exit)
      playAudioFeedback('success');
      toast.success(res.message || 'Access Granted! Barrier Opening.');
      setExitPaymentSession(null);
      setScanResult({
        success: true,
        ...res
      });

      setIsBarrierOpen(true);
      setBarrierCountdown(6);

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setBarrierCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setIsBarrierOpen(false);
            setTimeout(() => {
              setScanResult(null);
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      fetchQueue();
      setManualInput('');
    } catch (err) {
      playAudioFeedback('error');
      const errorMsg = err.response?.data?.message || 'Security Verification Failed: Access Denied.';
      toast.error(errorMsg);

      setScanResult({
        success: false,
        error: true,
        message: errorMsg
      });

      setIsBarrierOpen(false);

      setTimeout(() => {
        setScanResult(null);
      }, 4000);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleConfirmExitPayment = async () => {
    if (!exitPaymentSession || isExitPaymentExpired) return;
    try {
      setIsConfirmingExitPayment(true);
      const bookingId = exitPaymentSession.booking?.id || exitPaymentSession.details?.booking_id;
      const paymentId = exitPaymentSession.payment?.id || exitPaymentSession.details?.payment_id;

      const res = await qrService.confirmExitPayment({
        booking_id: bookingId,
        payment_id: paymentId,
        notes: 'Payment confirmed manually by security operator'
      });

      playAudioFeedback('success');
      toast.success(res.message || 'Exit payment confirmed! Barrier opening.');

      setIsBarrierOpen(true);
      setBarrierCountdown(6);

      setScanResult({
        success: true,
        action: 'EXIT',
        ...res
      });

      setExitPaymentSession(null);
      setIsExitPaymentExpired(false);

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setBarrierCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setIsBarrierOpen(false);
            setTimeout(() => {
              setScanResult(null);
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      fetchQueue();
      setManualInput('');
    } catch (err) {
      playAudioFeedback('error');
      const errorMsg = err.response?.data?.message || 'Failed to confirm exit payment.';
      toast.error(errorMsg);
      if (err.response?.data?.isExpired) {
        setIsExitPaymentExpired(true);
      }
    } finally {
      setIsConfirmingExitPayment(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    executeSecurityValidation(manualInput.trim());
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode('autonomous-file-reader');
    html5QrCode
      .scanFile(file, true)
      .then((decodedText) => {
        executeSecurityValidation(decodedText);
      })
      .catch(() => {
        toast.error('Could not detect a valid QR code from the uploaded image.');
      });
  };

  return (
    <AppLayout>
      <div id="autonomous-file-reader" style={{ display: 'none' }} />

      {/* Header Row */}
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="page-title-box">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem' }}>
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: cameraActive ? '#10b981' : '#f59e0b',
                boxShadow: cameraActive ? '0 0 14px #10b981' : 'none',
                display: 'inline-block'
              }}
            />
            Universal Omnidirectional Smart Gate Terminal
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>360° Universal Angle Recognition • Instant Multi-Orientation Optical Detection • Automatic Barrier</p>
        </div>

        <button
          type="button"
          onClick={() => setIsKioskMode(!isKioskMode)}
          style={{
            background: isKioskMode ? 'var(--accent-gold)' : 'var(--bg-card)',
            border: '1px solid var(--border-bright)',
            color: isKioskMode ? '#000000' : 'var(--text-main)',
            padding: '0.55rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <i className={`fa-solid ${isKioskMode ? 'fa-compress' : 'fa-expand'}`}></i>
          {isKioskMode ? 'Standard Layout' : 'Fullscreen Terminal View'}
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setGateMode('auto')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: gateMode === 'auto' ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(16,185,129,0.25))' : 'var(--bg-card)',
            border: gateMode === 'auto' ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
            color: gateMode === 'auto' ? 'var(--accent-gold)' : 'var(--text-muted)'
          }}
        >
          <i className="fa-solid fa-arrows-split-up-and-left"></i>
          <span>Auto-Detect (Automatic Entry & Exit)</span>
        </button>

        <button
          type="button"
          onClick={() => setGateMode('entry')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: gateMode === 'entry' ? 'rgba(16, 185, 129, 0.25)' : 'var(--bg-card)',
            border: gateMode === 'entry' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
            color: gateMode === 'entry' ? '#10b981' : 'var(--text-muted)'
          }}
        >
          <i className="fa-solid fa-door-open"></i>
          <span>Entry Gate (Check-In)</span>
        </button>

        <button
          type="button"
          onClick={() => setGateMode('exit')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: gateMode === 'exit' ? 'rgba(56, 189, 248, 0.25)' : 'var(--bg-card)',
            border: gateMode === 'exit' ? '2px solid #38bdf8' : '1px solid var(--border-subtle)',
            color: gateMode === 'exit' ? '#38bdf8' : 'var(--text-muted)'
          }}
        >
          <i className="fa-solid fa-door-closed"></i>
          <span>Exit Gate (Check-Out)</span>
        </button>
      </div>

      {/* Main Console Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isKioskMode ? '1fr' : '1.3fr 0.8fr', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Left Column: Full-Window Universal Camera Viewport */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div
            className="card"
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: 0,
              borderRadius: '16px',
              border: isBarrierOpen ? '3px solid #10b981' : (isProcessing ? '3px solid var(--accent-gold)' : '2px solid var(--border-bright)'),
              boxShadow: isBarrierOpen ? '0 0 35px rgba(16, 185, 129, 0.4)' : '0 10px 30px rgba(0,0,0,0.5)',
              background: '#040711',
              minHeight: '520px',
              height: isKioskMode ? 'calc(100vh - 220px)' : '540px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {/* Top Floating Status HUD */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '0.85rem 1.25rem',
              background: 'linear-gradient(180deg, rgba(4,7,17,0.85) 0%, rgba(4,7,17,0.4) 70%, transparent 100%)',
              zIndex: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                <i className="fa-solid fa-camera" style={{ color: '#10b981' }}></i>
                <span>Universal Omnidirectional Optical Scanner</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: isProcessing ? 'rgba(245, 158, 11, 0.3)' : (isBarrierOpen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'),
                  color: isProcessing ? '#f59e0b' : (isBarrierOpen ? '#10b981' : '#10b981'),
                  border: '1px solid currentColor',
                  backdropFilter: 'blur(8px)'
                }}>
                  {isProcessing ? 'VERIFYING PASS...' : (isBarrierOpen ? 'BARRIER OPENED' : '360° SCAN ACTIVE')}
                </span>

                <label style={{
                  fontSize: '0.75rem',
                  background: 'rgba(22, 28, 43, 0.8)',
                  border: '1px solid var(--border-bright)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backdropFilter: 'blur(8px)'
                }}>
                  <i className="fa-solid fa-file-image"></i> Upload Image
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Video Container (Single Unified Viewport) */}
            <div
              id="autonomous-qr-video-feed"
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden'
              }}
            />

            {/* Central Omnidirectional Laser HUD */}
            {!isBarrierOpen && !scanResult?.error && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5
              }}>
                <div style={{
                  width: '320px',
                  height: '320px',
                  border: '2px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '24px',
                  position: 'relative'
                }}>
                  {/* Glowing Reticles */}
                  <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '32px', height: '32px', borderTop: '5px solid #10b981', borderLeft: '5px solid #10b981', borderRadius: '6px 0 0 0', boxShadow: '0 0 12px #10b981' }} />
                  <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '32px', height: '32px', borderTop: '5px solid #10b981', borderRight: '5px solid #10b981', borderRadius: '0 6px 0 0', boxShadow: '0 0 12px #10b981' }} />
                  <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '32px', height: '32px', borderBottom: '5px solid #10b981', borderLeft: '5px solid #10b981', borderRadius: '0 0 0 6px', boxShadow: '0 0 12px #10b981' }} />
                  <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '32px', height: '32px', borderBottom: '5px solid #10b981', borderRight: '5px solid #10b981', borderRadius: '0 0 6px 0', boxShadow: '0 0 12px #10b981' }} />

                  {/* Laser Line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '5%',
                      right: '5%',
                      height: '3px',
                      background: 'linear-gradient(90deg, transparent, #10b981, #f59e0b, #10b981, transparent)',
                      boxShadow: '0 0 16px #10b981',
                      animation: 'scannerLaser 2s ease-in-out infinite'
                    }}
                  />
                </div>

                <div style={{
                  marginTop: '1.5rem',
                  background: 'rgba(10, 15, 26, 0.85)',
                  padding: '0.45rem 1.25rem',
                  borderRadius: '24px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid var(--border-bright)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  <i className="fa-solid fa-arrows-rotate" style={{ color: 'var(--accent-gold)' }}></i>
                  Omnidirectional 360° Scan — Hold pass at any angle or orientation
                </div>
              </div>
            )}

            {cameraError && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', zIndex: 10 }}>
                <i className="fa-solid fa-video-slash" style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '0.75rem' }}></i>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.35rem' }}>Camera Stream Notice</div>
                <div style={{ fontSize: '0.85rem' }}>{cameraError}</div>
              </div>
            )}

            {/* Bottom Floating Barcode / Pass Search Bar */}
            <div style={{
              position: 'relative',
              zIndex: 10,
              padding: '1rem 1.25rem',
              background: 'linear-gradient(0deg, rgba(4,7,17,0.95) 0%, rgba(4,7,17,0.7) 70%, transparent 100%)',
              marginTop: 'auto'
            }}>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <input
                  type="text"
                  className="search-input"
                  style={{
                    flex: 1,
                    width: '100%',
                    fontSize: '0.9rem',
                    background: 'rgba(19, 24, 38, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-bright)',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                  placeholder="Manual / Barcode Gun Pass Code (BK-55555555) / Vehicle Plate (TS09 AB 1234)..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-select-slot"
                  style={{
                    marginTop: 0,
                    whiteSpace: 'nowrap',
                    padding: '0.65rem 1.5rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)'
                  }}
                  disabled={isProcessing || !manualInput.trim()}
                >
                  {isProcessing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-shield-check"></i> Verify & Open</>}
                </button>
              </form>
            </div>
          </div>

          {/* Pending Queue */}
          {!isKioskMode && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fa-solid fa-list-check" style={{ color: 'var(--accent-gold)' }}></i>
                  Live Gate Vehicles Queue
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {gateQueue.pending_arrivals.length + gateQueue.active_parked.length} vehicle(s) ready
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '0.4rem' }}>
                    <i className="fa-solid fa-arrow-down-to-bracket"></i> Arriving (Reserved)
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {gateQueue.pending_arrivals.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0.5rem' }}>No pending arrivals</div>
                    ) : (
                      gateQueue.pending_arrivals.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => executeSecurityValidation(item.id)}
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            padding: '0.45rem 0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.userName}</div>
                            <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontFamily: 'monospace' }}>{item.vehicleNo} • Slot {item.slotCode}</div>
                          </div>
                          <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                            Check-In
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem' }}>
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Departing (Parked)
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {gateQueue.active_parked.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0.5rem' }}>No active parked vehicles</div>
                    ) : (
                      gateQueue.active_parked.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => executeSecurityValidation(item.id)}
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            padding: '0.45rem 0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.userName}</div>
                            <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontFamily: 'monospace' }}>{item.vehicleNo} • Slot {item.slotCode}</div>
                          </div>
                          <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                            Check-Out
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Physical Barrier Arm & Driver Clearance Feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barrier Arm Graphic */}
          <div
            className="card"
            style={{
              textAlign: 'center',
              border: isBarrierOpen ? '2px solid #10b981' : (exitPaymentSession ? '2px solid #f59e0b' : (scanResult?.error ? '2px solid #ef4444' : '1px solid var(--border-subtle)')),
              background: isBarrierOpen ? 'rgba(16, 185, 129, 0.08)' : (exitPaymentSession ? 'rgba(245, 158, 11, 0.08)' : (scanResult?.error ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)')),
              boxShadow: isBarrierOpen ? '0 0 35px rgba(16, 185, 129, 0.25)' : (exitPaymentSession ? '0 0 35px rgba(245, 158, 11, 0.25)' : 'none'),
              transition: 'all 0.35s ease'
            }}
          >
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Automatic Gate Barrier Simulation
            </div>

            <div style={{ margin: '1rem 0', position: 'relative', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'absolute',
                left: '20%',
                bottom: '10px',
                width: '32px',
                height: '70px',
                background: 'linear-gradient(180deg, #475569, #1e293b)',
                borderRadius: '6px',
                border: '2px solid #64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: isBarrierOpen ? '#10b981' : (exitPaymentSession ? '#f59e0b' : '#ef4444'),
                  boxShadow: isBarrierOpen ? '0 0 10px #10b981' : (exitPaymentSession ? '0 0 10px #f59e0b' : '0 0 10px #ef4444')
                }} />
              </div>

              <div style={{
                position: 'absolute',
                left: 'calc(20% + 16px)',
                bottom: '48px',
                width: '180px',
                height: '10px',
                background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 15px, #ffffff 15px, #ffffff 30px)',
                borderRadius: '4px',
                transformOrigin: 'left center',
                transform: isBarrierOpen ? 'rotate(-75deg)' : 'rotate(0deg)',
                transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: isBarrierOpen ? '0 0 15px rgba(16, 185, 129, 0.5)' : 'none',
                zIndex: 1
              }} />

              <div style={{
                position: 'absolute',
                left: '10%',
                right: '10%',
                bottom: '6px',
                height: '4px',
                background: 'var(--border-bright)',
                borderRadius: '2px'
              }} />
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: isBarrierOpen ? '#10b981' : (exitPaymentSession ? '#f59e0b' : (scanResult?.error ? '#ef4444' : 'var(--text-muted)')) }}>
              {isBarrierOpen ? 'ACCESS GRANTED • BARRIER OPENED' : (exitPaymentSession ? 'PAYMENT REQUIRED • BARRIER CLOSED' : (scanResult?.error ? 'ACCESS DENIED • BARRIER LOCKED' : 'BARRIER CLOSED • READY'))}
            </div>

            {isBarrierOpen && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <i className="fa-solid fa-clock"></i> Auto-closing barrier in {barrierCountdown}s
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="fa-solid fa-id-card" style={{ color: 'var(--accent-gold)' }}></i>
                Driver Clearance & Location Guidance
              </h3>

              {exitPaymentSession ? (
                <div style={{ background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid #f59e0b', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                      <i className="fa-solid fa-clock" style={{ marginRight: '0.3rem' }}></i>
                      EXIT PAYMENT CONFIRMATION
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                      {exitPaymentSession.booking?.pass_code || `BK-${exitPaymentSession.booking?.id?.substring(0, 8).toUpperCase()}`}
                    </span>
                  </div>

                  {/* Specification items */}
                  <div className="details-row">
                    <span className="key">Vehicle:</span>
                    <span className="val" style={{ color: '#a5b4fc', fontWeight: 700 }}>
                      {exitPaymentSession.booking?.vehicle_number} {exitPaymentSession.booking?.vehicle_model ? `(${exitPaymentSession.booking?.vehicle_model})` : ''}
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Slot:</span>
                    <span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                      Slot {exitPaymentSession.booking?.slot_number} (Floor {exitPaymentSession.booking?.floor} • {exitPaymentSession.booking?.lot_name})
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Entry time:</span>
                    <span className="val">
                      {exitPaymentSession.booking?.entry_time ? new Date(exitPaymentSession.booking?.entry_time).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Exit time:</span>
                    <span className="val">
                      {exitPaymentSession.booking?.exit_time ? new Date(exitPaymentSession.booking?.exit_time).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Duration:</span>
                    <span className="val" style={{ fontWeight: 700 }}>
                      {exitPaymentSession.booking?.duration_minutes != null ? `${exitPaymentSession.booking?.duration_minutes} mins (${exitPaymentSession.booking?.duration_hours || Math.ceil(exitPaymentSession.booking?.duration_minutes / 60)} hrs)` : 'N/A'}
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Parking rate:</span>
                    <span className="val" style={{ color: 'var(--accent-gold)' }}>
                      ₹{parseFloat(exitPaymentSession.booking?.hourly_rate || 30).toFixed(2)} / hour
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Parking charge:</span>
                    <span className="val" style={{ fontWeight: 700 }}>
                      ₹{parseFloat(exitPaymentSession.booking?.parking_charge || exitPaymentSession.payment?.amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Pre-booking fee:</span>
                    <span className="val">
                      ₹{parseFloat(exitPaymentSession.booking?.pre_booking_fee || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="details-row" style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem', borderRadius: '6px', margin: '0.4rem 0' }}>
                    <span className="key" style={{ fontWeight: 800, color: 'var(--text-main)' }}>Total amount:</span>
                    <span className="val" style={{ color: 'var(--accent-emerald)', fontWeight: 900, fontSize: '1.15rem' }}>
                      ₹{parseFloat(exitPaymentSession.booking?.total_amount || exitPaymentSession.payment?.amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="details-row">
                    <span className="key">Payment status:</span>
                    <span className="val">
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', textTransform: 'uppercase' }}>
                        {exitPaymentSession.payment?.status || 'PENDING'}
                      </span>
                    </span>
                  </div>

                  {/* Exit Payment QR display */}
                  <div style={{ textAlign: 'center', margin: '0.85rem 0 0.5rem 0', background: '#ffffff', padding: '0.75rem', borderRadius: '10px' }}>
                    {exitPaymentSession.exit_payment_qr?.qr_image ? (
                      <img
                        src={exitPaymentSession.exit_payment_qr.qr_image}
                        alt="Exit Payment QR"
                        style={{ width: '150px', height: '150px', display: 'block', margin: '0 auto', filter: isExitPaymentExpired ? 'grayscale(100%) opacity(0.35)' : 'none' }}
                      />
                    ) : (
                      <div style={{ padding: '1rem', color: '#64748b' }}>QR Reference Generated</div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, marginTop: '0.35rem' }}>
                      Exit Payment QR (Reference for amount to pay outside system)
                    </div>
                  </div>

                  {/* Payment Timeout Indicator */}
                  {isExitPaymentExpired ? (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.6rem', textAlign: 'center', margin: '0.75rem 0', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.4rem' }}></i>
                      Payment session expired. Please scan again.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.4rem 0.75rem', margin: '0.65rem 0', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <i className="fa-regular fa-clock" style={{ marginRight: '0.3rem', color: 'var(--accent-gold)' }}></i> Session Expiry:
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                        {exitPaymentSecondsLeft != null ? `${Math.floor(exitPaymentSecondsLeft / 60)}m ${exitPaymentSecondsLeft % 60}s` : 'Active'}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {isExitPaymentExpired ? (
                      <button
                        type="button"
                        className="btn-select-slot"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontWeight: 800, marginTop: 0 }}
                        onClick={() => executeSecurityValidation(exitPaymentSession.rawCodeOrId)}
                        disabled={isProcessing}
                      >
                        <i className="fa-solid fa-arrows-rotate"></i> Re-scan / Refresh Session
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-select-slot"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontWeight: 800, marginTop: 0, boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                        onClick={handleConfirmExitPayment}
                        disabled={isConfirmingExitPayment}
                      >
                        {isConfirmingExitPayment ? (
                          <span><i className="fa-solid fa-circle-notch fa-spin"></i> Verifying Exit Payment...</span>
                        ) : (
                          <span><i className="fa-solid fa-circle-check"></i> Confirm Payment Received</span>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      className="change-btn"
                      style={{ width: '100%', padding: '0.5rem', marginTop: 0 }}
                      onClick={() => setExitPaymentSession(null)}
                    >
                      Cancel / Dismiss
                    </button>
                  </div>
                </div>
              ) : scanResult ? (
                scanResult.error ? (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '2.5rem', marginBottom: '0.5rem' }}></i>
                    <h4 style={{ color: '#ef4444', margin: '0 0 0.35rem 0', fontSize: '1.1rem' }}>Validation Rejected</h4>
                    <p style={{ fontSize: '0.85rem', color: '#fca5a5', margin: 0 }}>{scanResult.message}</p>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-bright)', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                        <i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }}></i>
                        {scanResult.action === 'ENTRY' ? 'GATE ENTRY CLEARED' : 'GATE EXIT CLEARED'}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                        {scanResult.pass_code}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                      Welcome, {scanResult.user_name}!
                    </div>

                    <div className="details-row"><span className="key">Vehicle Number:</span><span className="val" style={{ color: '#a5b4fc', fontWeight: 700 }}>{scanResult.vehicle_number}</span></div>
                    <div className="details-row"><span className="key">Allocated Location:</span><span className="val">{scanResult.lot_name} (Floor {scanResult.floor})</span></div>
                    
                    {scanResult.action === 'ENTRY' ? (
                      <div className="details-row" style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem', borderRadius: '6px', margin: '0.4rem 0' }}>
                        <span className="key" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>Assigned Spot:</span>
                        <span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 900, fontSize: '1.05rem' }}>Slot {scanResult.slot_number}</span>
                      </div>
                    ) : (
                      <>
                        <div className="details-row"><span className="key">Slot Freed:</span><span className="val" style={{ color: '#10b981', fontWeight: 700 }}>Slot {scanResult.slot_freed}</span></div>
                        <div className="details-row"><span className="key">Duration Parked:</span><span className="val">{scanResult.duration_minutes} mins</span></div>
                        <div className="details-row"><span className="key">Total Fee Settled:</span><span className="val" style={{ color: '#10b981', fontWeight: 800 }}>₹{scanResult.total_fee}.00</span></div>
                      </>
                    )}

                    <div className="details-row"><span className="key">Timestamp:</span><span className="val">{new Date(scanResult.entry_time || scanResult.exit_time).toLocaleTimeString()}</span></div>
                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-qrcode" style={{ fontSize: '3rem', opacity: 0.25, marginBottom: '0.75rem', display: 'block' }}></i>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>
                    Omnidirectional camera actively scanning at 30 FPS. Present driver QR code at any angle to trigger gate.
                  </p>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
              <i className="fa-solid fa-lock" style={{ marginRight: '0.25rem', color: '#10b981' }}></i> Unattended Mode: Automatic barrier opens on cryptographically valid QR passes.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        #autonomous-qr-video-feed {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          background: #040711 !important;
        }
        #autonomous-qr-video-feed video {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 14px !important;
          display: block !important;
          z-index: 1 !important;
        }
        #autonomous-qr-video-feed canvas,
        #autonomous-qr-video-feed img,
        #autonomous-qr-video-feed #qr-canvas,
        #autonomous-qr-video-feed > canvas,
        #autonomous-qr-video-feed__shaded_region {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
        }
        #autonomous-qr-video-feed__scan_region {
          min-height: unset !important;
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border: none !important;
        }
        @keyframes scannerLaser {
          0% { top: 5%; opacity: 0.2; }
          50% { top: 90%; opacity: 1; }
          100% { top: 5%; opacity: 0.2; }
        }
      `}</style>
    </AppLayout>
  );
};

export default QRScannerPage;
