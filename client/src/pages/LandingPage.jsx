import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

// Realistic campus lots seeded in the SPMS system
const CAMPUS_LOTS = [
  {
    id: 'lot-1',
    name: 'Central Parking',
    zone: 'Main Block, Campus',
    description: 'Multi-level parking facility servicing main academic buildings and administrative offices.',
    floors: ['B1', 'GF', 'FF']
  },
  {
    id: 'lot-2',
    name: 'Science Block Parking',
    zone: 'Science & Tech Complex',
    description: 'Covered facility located adjacent to science laboratories and innovation centers.',
    floors: ['B1', 'GF', 'FF']
  },
  {
    id: 'lot-3',
    name: 'Library Parking',
    zone: 'Central Library Area',
    description: 'Quiet, shaded parking area directly accessible to library facilities and student study centers.',
    floors: ['B1', 'GF', 'FF']
  },
  {
    id: 'lot-4',
    name: 'Hostel Parking',
    zone: 'Residential Campus Zone',
    description: 'Dedicated parking facility for residential students, faculty quarters, and visitors.',
    floors: ['B1', 'GF', 'FF']
  }
];

// Lot-specific real slot layout (Strictly Two-Wheeler and Four-Wheeler per SRS)
const LOT_SLOTS = {
  'lot-1': [
    { id: 'A1', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A2', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A3', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A4', type: 'four_wheeler', floor: 'B1', status: 'occupied', price: 30 },
    { id: 'A5', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'B1', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B2', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B3', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B4', type: 'two_wheeler', floor: 'B1', status: 'maintenance', price: 15 },
    { id: 'B8', type: 'four_wheeler', floor: 'B1', status: 'occupied', price: 30 },
    { id: 'C1', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C2', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C3', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C4', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C5', type: 'four_wheeler', floor: 'GF', status: 'reserved', price: 30 },
    { id: 'C6', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'D1', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D2', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D3', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 },
    { id: 'D4', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 }
  ],
  'lot-2': [
    { id: 'A1', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A2', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A3', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A4', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A5', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'B1', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B2', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B3', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B4', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B8', type: 'four_wheeler', floor: 'B1', status: 'occupied', price: 30 },
    { id: 'C1', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C2', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C3', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C4', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C5', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C6', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'D1', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D2', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D3', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 },
    { id: 'D4', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 }
  ],
  'lot-3': [
    { id: 'A1', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A2', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A3', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A4', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A5', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'B1', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B2', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B3', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B4', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B8', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'C1', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C2', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C3', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C4', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C5', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C6', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'D1', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D2', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D3', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 },
    { id: 'D4', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 }
  ],
  'lot-4': [
    { id: 'A1', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A2', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A3', type: 'four_wheeler', floor: 'B1', status: 'reserved', price: 30 },
    { id: 'A4', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'A5', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'B1', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B2', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B3', type: 'two_wheeler', floor: 'B1', status: 'occupied', price: 15 },
    { id: 'B4', type: 'two_wheeler', floor: 'B1', status: 'available', price: 15 },
    { id: 'B8', type: 'four_wheeler', floor: 'B1', status: 'available', price: 30 },
    { id: 'C1', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C2', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'C3', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C4', type: 'two_wheeler', floor: 'GF', status: 'available', price: 15 },
    { id: 'C5', type: 'four_wheeler', floor: 'GF', status: 'occupied', price: 30 },
    { id: 'C6', type: 'four_wheeler', floor: 'GF', status: 'available', price: 30 },
    { id: 'D1', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D2', type: 'four_wheeler', floor: 'FF', status: 'available', price: 30 },
    { id: 'D3', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 },
    { id: 'D4', type: 'two_wheeler', floor: 'FF', status: 'available', price: 15 }
  ]
};

// Platform capabilities
const PLATFORM_FEATURES = [
  {
    icon: 'fa-magnifying-glass-location',
    title: 'Real-Time Availability',
    desc: 'Instantly view available, reserved, and occupied parking slots across all campus lots and floors before arriving.',
    tag: 'Live Occupancy'
  },
  {
    icon: 'fa-calendar-check',
    title: 'Advance Pre-Booking',
    desc: 'Reserve a specific parking slot for your planned arrival time by paying an advance base fare to lock the space.',
    tag: 'Guaranteed Space'
  },
  {
    icon: 'fa-car-side',
    title: 'Live On-Arrival Booking',
    desc: 'Arriving right now? Pick any free slot immediately upon campus entry and pay based on actual duration at exit.',
    tag: 'Instant Access'
  },
  {
    icon: 'fa-qrcode',
    title: 'Contactless QR Gate Access',
    desc: 'Every reservation generates a secure digital QR pass. Scan at entry and exit gates for barrier opening in under 2 seconds.',
    tag: 'Zero Queues'
  },
  {
    icon: 'fa-clock-rotate-left',
    title: 'Precise Duration Tracking',
    desc: 'Automated timestamp logging tracks exact arrival and exit times down to the minute. No paper tickets or disputes.',
    tag: 'Automated Logs'
  },
  {
    icon: 'fa-receipt',
    title: 'Seamless Payments & Invoices',
    desc: 'Base fare paid in advance is deducted automatically at exit. Pay balance via secure online methods and download receipts.',
    tag: 'Digital Billing'
  },
  {
    icon: 'fa-motorcycle',
    title: 'Multi-Vehicle Management',
    desc: 'Register both Two-Wheelers and Four-Wheelers in your account. Switch your active parking vehicle with one click.',
    tag: 'Fleet Support'
  },
  {
    icon: 'fa-triangle-exclamation',
    title: 'Incident Reporting & Triage',
    desc: 'Encountered a blocked slot, scanner glitch, or damaged bay? Lodge an incident report with quick resolution tracking.',
    tag: 'Driver Support'
  },
  {
    icon: 'fa-chart-pie',
    title: 'Admin Operations & Analytics',
    desc: 'Administrators control facilities, slot pricing, user roles, gate scanning terminals, and monitor revenue analytics.',
    tag: 'Control Deck'
  }
];

const FAQS = [
  {
    q: 'What is the difference between Pre-Booking and Live Booking?',
    a: 'Pre-Booking allows you to reserve a parking slot in advance for an upcoming arrival time. You pay a standard base fare upfront to guarantee your spot. Live Booking is for immediate parking when you arrive at campus: you pick an available slot right away, get a gate pass, and pay the entire parking charge when you exit.'
  },
  {
    q: 'How does the Base Fare deduction work when exiting?',
    a: 'For Pre-Booked slots, the base fare you paid during reservation is credited against your final parking tariff. When your vehicle exits through the gate, the system calculates your exact parking duration, computes the total tariff, and automatically subtracts the base fare already paid. You only pay the remaining balance.'
  },
  {
    q: 'How does the QR Code gate entry and exit work?',
    a: 'Once your booking is confirmed, a digital QR pass is generated in your portal. At the parking facility gate, the camera scans your QR pass to verify your booking and record your entry timestamp. When leaving, scanning the QR pass records your exit time, computes the duration fee, and marks the session complete.'
  },
  {
    q: 'What types of vehicles can I register in the system?',
    a: 'The system supports both Two-Wheelers (motorcycles, scooters) and Four-Wheelers (cars). You can save multiple vehicles under your profile and select which one you are driving before making a reservation.'
  },
  {
    q: 'What should I do if my assigned slot is physically blocked upon arrival?',
    a: 'You can immediately submit an Incident Report from your active booking screen with details and a description. Campus administrators monitor reports in real-time and can reassign you to another available slot on the same floor while updating your digital QR pass.'
  }
];

const LandingPage = () => {
  const { user, logout } = useAuth();

  // Interactive Simulator States
  const [selectedLot, setSelectedLot] = useState(CAMPUS_LOTS[0]);
  const [selectedFloor, setSelectedFloor] = useState('B1');
  const [slotTypeFilter, setSlotTypeFilter] = useState('all'); // 'all', 'four_wheeler', 'two_wheeler'

  // Active lot slots
  const currentLotSlots = LOT_SLOTS[selectedLot.id] || LOT_SLOTS['lot-1'];

  // Filtered displayed slots
  const displayedSlots = currentLotSlots
    .filter(s => s.floor === selectedFloor)
    .filter(s => slotTypeFilter === 'all' || s.type === slotTypeFilter);

  // Selected slot state (default to first available slot on floor)
  const [selectedSlot, setSelectedSlot] = useState(() => {
    return displayedSlots.find(s => s.status === 'available') || displayedSlots[0];
  });

  // Calculate live lot stats
  const totalSlotsCount = currentLotSlots.length;
  const availableSlotsCount = currentLotSlots.filter(s => s.status === 'available').length;

  // Nearest available slot on the current floor/filter
  const nearestAvailableSlot = displayedSlots.find(s => s.status === 'available' && s.id !== selectedSlot?.id);

  // Handle lot switch
  const handleLotSelect = (lot) => {
    setSelectedLot(lot);
    const newLotSlots = LOT_SLOTS[lot.id] || LOT_SLOTS['lot-1'];
    const matching = newLotSlots.filter(s => s.floor === selectedFloor && (slotTypeFilter === 'all' || s.type === slotTypeFilter));
    if (matching.length > 0) {
      setSelectedSlot(matching.find(s => s.status === 'available') || matching[0]);
    }
  };

  // Handle floor switch
  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    const matching = currentLotSlots.filter(s => s.floor === floor && (slotTypeFilter === 'all' || s.type === slotTypeFilter));
    if (matching.length > 0) {
      setSelectedSlot(matching.find(s => s.status === 'available') || matching[0]);
    }
  };

  // Handle vehicle filter switch
  const handleFilterSelect = (filter) => {
    setSlotTypeFilter(filter);
    const matching = currentLotSlots.filter(s => s.floor === selectedFloor && (filter === 'all' || s.type === filter));
    if (matching.length > 0) {
      setSelectedSlot(matching.find(s => s.status === 'available') || matching[0]);
    }
  };

  // Dynamic Calculator States (Strictly Two-Wheeler and Four-Wheeler)
  const [calcVehicle, setCalcVehicle] = useState('four_wheeler'); // 'four_wheeler' or 'two_wheeler'
  const [calcMode, setCalcMode] = useState('pre'); // 'pre' or 'live'
  const [calcHours, setCalcHours] = useState(2);

  // Role Perspective State
  const [activeRole, setActiveRole] = useState('driver'); // 'driver' or 'admin'

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Demo Credentials Modal
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Real-world pricing rates
  const RATES = {
    four_wheeler: { name: 'Four-Wheeler (Car)', hourly: 30, baseFare: 20, icon: 'fa-car' },
    two_wheeler: { name: 'Two-Wheeler (Bike/Scooter)', hourly: 15, baseFare: 10, icon: 'fa-motorcycle' }
  };

  const currentRate = RATES[calcVehicle];
  const totalTariff = currentRate.hourly * calcHours;
  const baseFarePayable = calcMode === 'pre' ? currentRate.baseFare : 0;
  const exitPayable = calcMode === 'pre' ? Math.max(0, totalTariff - baseFarePayable) : totalTariff;

  return (
    <div className="landing-wrapper">
      {/* Subtle Ambient Background Mesh */}
      <div className="landing-ambient-bg">
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>
        <div className="ambient-grid-overlay"></div>
      </div>

      {/* ====================================================================
          Navigation Bar
          ==================================================================== */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-icon">
              <i className="fa-solid fa-square-parking"></i>
            </div>
            <div className="landing-brand-text">
              <h1>
                SPMS <span className="landing-brand-tag">Smart Parking</span>
              </h1>
            </div>
          </Link>

          <ul className="landing-nav-links">
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#live-slots">Live Parking Map</a></li>
            <li><a href="#calculator">Tariff Calculator</a></li>
            <li><a href="#roles">Portals</a></li>
            <li><a href="#faqs">FAQs</a></li>
          </ul>

          <div className="landing-nav-actions">
            <button
              className="btn-landing-secondary"
              onClick={() => setShowDemoModal(true)}
              title="Quick test accounts"
            >
              <i className="fa-solid fa-key" style={{ color: 'var(--accent-gold)' }}></i>
              <span>Demo Logins</span>
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Signed in as <strong style={{ color: '#fff' }}>{user.full_name?.split(' ')[0]}</strong>
                </span>
                <button
                  onClick={logout}
                  className="btn-landing-secondary"
                  title="Sign out"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-landing-secondary">
                  <span>Sign In</span>
                </Link>
                <Link to="/register" className="btn-landing-primary">
                  <span>Register Driver</span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.8rem' }}></i>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ====================================================================
          Hero Section: Real-World Smart Parking Platform
          ==================================================================== */}
      <header className="landing-hero" id="overview">
        <div className="hero-badge-pill">
          <span className="pulse-dot"></span>
          <span>CAMPUS SMART PARKING MANAGEMENT SYSTEM • OPERATIONAL</span>
        </div>

        <h1 className="hero-main-title">
          Intelligent Parking <br />
          <span className="hero-highlight-gold">Made Effortless & Contactless</span> <br />
          <span className="hero-highlight-emerald">For Campus Drivers & Visitors</span>
        </h1>

        <p className="hero-subtext">
          Discover available parking spaces in real-time, reserve slots in advance with pre-booking, 
          enjoy seamless entry and exit with digital QR codes, and pay securely online without ticket friction.
        </p>

        <div className="hero-cta-group">
          <Link to="/login" className="btn-landing-primary hero-btn-large">
            <i className="fa-solid fa-arrow-right-to-bracket"></i>
            <span>Sign In</span>
          </Link>
          <Link to="/register" className="btn-landing-secondary hero-btn-large">
            <i className="fa-solid fa-user-plus"></i>
            <span>Register</span>
          </Link>
          <a href="#how-it-works" className="btn-landing-secondary hero-btn-large" style={{ opacity: 0.85 }}>
            <i className="fa-solid fa-circle-info"></i>
            <span>System Overview</span>
          </a>
          <a href="#live-slots" className="btn-landing-secondary hero-btn-large" style={{ opacity: 0.85 }}>
            <i className="fa-solid fa-map-location-dot"></i>
            <span>Live Lot Map</span>
          </a>
        </div>

        <div className="hero-demo-strip">
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
            <i className="fa-solid fa-circle-info"></i> Pre-Configured Test Logins:
          </span>
          <span>Driver: <strong style={{ color: '#fff' }}>mehanna@spms.com</strong> (user123)</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>Admin: <strong style={{ color: '#fff' }}>admin@spms.com</strong> (admin123)</span>
          <button onClick={() => setShowDemoModal(true)} className="hero-demo-pill">
            View Accounts
          </button>
        </div>

        {/* Live System Operational Stats */}
        <div className="hero-telemetry-grid">
          <div className="telemetry-card">
            <div className="telemetry-val" style={{ color: 'var(--accent-gold)' }}>4 Lots</div>
            <div className="telemetry-label">
              <i className="fa-solid fa-location-dot"></i> Campus Parking Hubs
            </div>
          </div>
          <div className="telemetry-card">
            <div className="telemetry-val" style={{ color: 'var(--accent-emerald)' }}>160 Slots</div>
            <div className="telemetry-label">
              <i className="fa-solid fa-layer-group"></i> Multi-Floor Bays
            </div>
          </div>
          <div className="telemetry-card">
            <div className="telemetry-val" style={{ color: '#38bdf8' }}>&lt; 2.0s</div>
            <div className="telemetry-label">
              <i className="fa-solid fa-qrcode"></i> QR Gate Validation
            </div>
          </div>
          <div className="telemetry-card">
            <div className="telemetry-val" style={{ color: '#10b981' }}>100%</div>
            <div className="telemetry-label">
              <i className="fa-solid fa-ticket"></i> Digital & Paperless
            </div>
          </div>
        </div>

        {/* Hero Interactive Terminal Cockpit */}
        <div className="hero-cockpit-box">
          <div className="cockpit-header-bar">
            <div className="cockpit-title-group">
              <span className="cockpit-status-dot"></span>
              <strong style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem' }}>
                Live Facility Status & Digital Pass Preview
              </strong>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time slot availability synced with entrance gate sensors
            </div>
          </div>

          <div className="cockpit-grid-layout">
            {/* Live Lot Radar */}
            <div className="cockpit-lot-preview">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Central Parking Hub
                  </div>
                  <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem' }}>
                    Basement 1 (B1) - Real-Time Feed
                  </h4>
                </div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                  Active Sensor Feed
                </span>
              </div>

              <div className="cockpit-slots-radar">
                <div
                  className="radar-slot-item status-avail"
                  onClick={() => {
                    handleFloorSelect('B1');
                    const slot = currentLotSlots.find(s => s.id === 'A1');
                    if (slot) setSelectedSlot(slot);
                    document.getElementById('live-slots')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title="Click to view Slot A1 details"
                >
                  <div className="radar-slot-code">A1</div>
                  <div className="radar-slot-state" style={{ color: 'var(--status-available)' }}>Available</div>
                </div>

                <div
                  className="radar-slot-item status-avail"
                  onClick={() => {
                    handleFloorSelect('B1');
                    const slot = currentLotSlots.find(s => s.id === 'A2');
                    if (slot) setSelectedSlot(slot);
                    document.getElementById('live-slots')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title="Click to view Slot A2 details"
                >
                  <div className="radar-slot-code">A2</div>
                  <div className="radar-slot-state" style={{ color: 'var(--status-available)' }}>Available</div>
                </div>

                <div
                  className="radar-slot-item status-res"
                  onClick={() => {
                    handleFloorSelect('GF');
                    const slot = currentLotSlots.find(s => s.id === 'C5');
                    if (slot) setSelectedSlot(slot);
                    document.getElementById('live-slots')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title="Click to view Reserved Slot C5 details"
                >
                  <div className="radar-slot-code">C5</div>
                  <div className="radar-slot-state" style={{ color: 'var(--status-reserved)' }}>Reserved</div>
                </div>

                <div
                  className="radar-slot-item status-occ"
                  onClick={() => {
                    handleFloorSelect('B1');
                    const slot = currentLotSlots.find(s => s.id === 'B8');
                    if (slot) setSelectedSlot(slot);
                    document.getElementById('live-slots')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title="Click to view Occupied Slot B8 details"
                >
                  <div className="radar-slot-code">B8</div>
                  <div className="radar-slot-state" style={{ color: 'var(--status-occupied)' }}>Occupied</div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span><i className="fa-solid fa-car"></i> Four-Wheeler Rate: ₹30/hr</span>
                <span><i className="fa-solid fa-motorcycle"></i> Two-Wheeler Rate: ₹15/hr</span>
              </div>
            </div>

            {/* Digital Pass Preview */}
            <div className="cockpit-qr-pass-preview">
              <div className="qr-ticket-header">
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-gold)' }}>
                    Digital QR Parking Pass
                  </span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Gate Entry & Exit Token</div>
                </div>
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  Verified Active
                </span>
              </div>

              <div className="qr-ticket-body">
                <div className="qr-code-box-sim">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=SPMS-GATE-PASS-TS09AB1234"
                    alt="Digital Pass QR"
                    style={{ width: '100%', height: '100%', borderRadius: '4px' }}
                  />
                </div>

                <div className="qr-ticket-meta">
                  <div className="qr-ticket-meta-row">
                    <div className="qr-ticket-meta-label">Vehicle Number</div>
                    <div className="qr-ticket-meta-val">TS09 AB 1234 (Four-Wheeler)</div>
                  </div>
                  <div className="qr-ticket-meta-row">
                    <div className="qr-ticket-meta-label">Allocated Bay</div>
                    <div className="qr-ticket-meta-val" style={{ color: 'var(--accent-gold)' }}>
                      Slot C5 • Ground Floor (GF)
                    </div>
                  </div>
                  <div className="qr-ticket-meta-row">
                    <div className="qr-ticket-meta-label">Booking Mode</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      Pre-Booking (Base Fare Paid)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span><i className="fa-regular fa-clock"></i> Entry Scan: Verified</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Fast Gate Access</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ====================================================================
          How It Works: 6 Step Driver Journey
          ==================================================================== */}
      <section className="landing-section" id="how-it-works">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-route"></i> The Driver Journey
          </div>
          <h2 className="section-main-heading">
            How Smart Parking Works
          </h2>
          <p className="section-description">
            A frictionless, end-to-end digital experience designed to eliminate parking congestion 
            and search time across campus facilities.
          </p>
        </div>

        <div className="process-grid-cards">
          <div className="process-step-card">
            <div className="process-step-badge">
              <div className="step-num-pill">01</div>
              <div className="step-srs-tag">Discovery</div>
            </div>
            <h3 className="process-step-title">1. Search Parking Facilities</h3>
            <p className="process-step-desc">
              Search across 4 campus parking hubs: Central Parking, Science Block, Library, and Hostel. 
              Check live capacity and floor vacancy in real-time.
            </p>
            <div className="process-step-footer-pill">
              <i className="fa-solid fa-check-circle"></i>
              <span>Live vacancy per floor</span>
            </div>
          </div>

          <div className="process-step-card">
            <div className="process-step-badge">
              <div className="step-num-pill">02</div>
              <div className="step-srs-tag">Reservation</div>
            </div>
            <h3 className="process-step-title">2. Choose Your Booking Method</h3>
            <p className="process-step-desc">
              Choose <strong>Pre-Booking</strong> to reserve an advance spot with an upfront base fare deposit, 
              or choose <strong>Live Booking</strong> for instant parking upon arrival.
            </p>
            <div className="process-step-footer-pill">
              <i className="fa-solid fa-lock"></i>
              <span>Guaranteed spot reservation</span>
            </div>
          </div>

          <div className="process-step-card">
            <div className="process-step-badge">
              <div className="step-num-pill">03</div>
              <div className="step-srs-tag">Digital Pass</div>
            </div>
            <h3 className="process-step-title">3. Receive Instant QR Pass</h3>
            <p className="process-step-desc">
              Your confirmed booking generates a unique digital QR pass tied to your vehicle registration. 
              Save it on your mobile device for fast gate verification.
            </p>
            <div className="process-step-footer-pill">
              <i className="fa-solid fa-qrcode"></i>
              <span>Mobile-ready entry pass</span>
            </div>
          </div>

          <div className="process-step-card">
            <div className="process-step-badge">
              <div className="step-num-pill">04</div>
              <div className="step-srs-tag">Gate Entry</div>
            </div>
            <h3 className="process-step-title">4. Contactless Gate Entry</h3>
            <p className="process-step-desc">
              Drive up to the parking entrance. The gate scanner reads your QR code in under 2 seconds, 
              authorizes entry, records your arrival timestamp, and opens the barrier.
            </p>
            <div className="process-step-footer-pill">
              <i className="fa-solid fa-bolt"></i>
              <span>Fast & contactless check-in</span>
            </div>
          </div>

          <div className="process-step-card">
            <div className="process-step-badge">
              <div className="step-num-pill">05</div>
              <div className="step-srs-tag">Time Tracking</div>
            </div>
            <h3 className="process-step-title">5. Automated Duration Logging</h3>
            <p className="process-step-desc">
              The system accurately logs your exact parking minutes. No paper tickets to lose and 
              no manual billing calculation disputes.
            </p>
            <div className="process-step-footer-pill">
              <i className="fa-solid fa-stopwatch"></i>
              <span>Accurate per-minute tracking</span>
            </div>
          </div>

          <div className="process-step-card">
            <div className="process-step-badge">
              <div className="step-num-pill">06</div>
              <div className="step-srs-tag">Gate Exit</div>
            </div>
            <h3 className="process-step-title">6. Auto-Deduction & Digital Receipt</h3>
            <p className="process-step-desc">
              At the exit gate, your base fare is credited against the total parking bill. 
              Pay any balance online and instantly receive a digital invoice.
            </p>
            <div className="process-step-footer-pill">
              <i className="fa-solid fa-receipt"></i>
              <span>Instant digital receipt</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Platform Features Grid
          ==================================================================== */}
      <section className="landing-section" id="features">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-cubes"></i> Core Capabilities
          </div>
          <h2 className="section-main-heading">
            Everything You Need for Campus Parking
          </h2>
          <p className="section-description">
            A comprehensive suite of tools built for campus drivers, security operators, 
            and facility administrators.
          </p>
        </div>

        <div className="srs-cards-grid">
          {PLATFORM_FEATURES.map((feat, i) => (
            <div key={i} className="srs-req-card">
              <div className="srs-card-top">
                <span className="srs-id-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className={`fa-solid ${feat.icon}`}></i> {feat.title}
                </span>
                <span className="srs-priority-badge priority-low">
                  {feat.tag}
                </span>
              </div>
              <p className="srs-card-desc" style={{ marginTop: '0.5rem' }}>{feat.desc}</p>
              <div className="srs-card-tech">
                <span>Integrated System Module</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>● Active</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          Interactive Live Parking Map Simulator
          ==================================================================== */}
      <section className="landing-section" id="live-slots">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-gamepad"></i> Live Interactive Preview
          </div>
          <h2 className="section-main-heading">
            Live Parking Slot Explorer
          </h2>
          <p className="section-description">
            Explore parking capacity across campus facilities. Select a lot and floor, 
            filter by vehicle type, and inspect bay status.
          </p>
        </div>

        <div className="simulator-container">
          {/* Lot Selection Tabs */}
          <div className="sim-lots-tabs">
            {CAMPUS_LOTS.map(lot => {
              const lotSlots = LOT_SLOTS[lot.id] || LOT_SLOTS['lot-1'];
              const freeCount = lotSlots.filter(s => s.status === 'available').length;
              const totalCount = lotSlots.length;
              return (
                <button
                  key={lot.id}
                  className={`sim-lot-tab-btn ${selectedLot.id === lot.id ? 'active' : ''}`}
                  onClick={() => handleLotSelect(lot)}
                >
                  <i className="fa-solid fa-square-parking"></i>
                  <div style={{ textAlign: 'left' }}>
                    <div>{lot.name}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.75, fontWeight: 500 }}>
                      {freeCount} of {totalCount} slots free
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Controls: Floor pills, vehicle filter, and legend */}
          <div className="sim-controls-row">
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="sim-floor-pills">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Floor:</span>
                {['B1', 'GF', 'FF'].map(floor => (
                  <button
                    key={floor}
                    className={`sim-floor-btn ${selectedFloor === floor ? 'active' : ''}`}
                    onClick={() => handleFloorSelect(floor)}
                  >
                    {floor === 'B1' ? 'Basement 1' : floor === 'GF' ? 'Ground Floor' : 'First Floor'}
                  </button>
                ))}
              </div>

              {/* Vehicle Type Filter (Strictly Two-Wheeler and Four-Wheeler) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle:</span>
                <button
                  type="button"
                  className={`sim-floor-btn ${slotTypeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`sim-floor-btn ${slotTypeFilter === 'four_wheeler' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('four_wheeler')}
                >
                  <i className="fa-solid fa-car"></i> Cars
                </button>
                <button
                  type="button"
                  className={`sim-floor-btn ${slotTypeFilter === 'two_wheeler' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('two_wheeler')}
                >
                  <i className="fa-solid fa-motorcycle"></i> Bikes
                </button>
              </div>
            </div>

            <div className="legend-bar" style={{ flexWrap: 'wrap' }}>
              <div className="legend-item"><span className="dot available"></span> Available</div>
              <div className="legend-item"><span className="dot reserved"></span> Reserved</div>
              <div className="legend-item"><span className="dot occupied"></span> Occupied</div>
              <div className="legend-item"><span className="dot maintenance"></span> Maintenance</div>
            </div>
          </div>

          {/* Slot Grid + Inspector Drawer */}
          <div className="sim-grid-layout">
            <div className="sim-slots-board">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>Viewing slots in <strong>{selectedLot.name} ({selectedFloor})</strong> &bull; <strong style={{ color: 'var(--accent-emerald)' }}>{availableSlotsCount} of {totalSlotsCount}</strong> bays vacant</span>
                <span>Click a slot to inspect details</span>
              </div>

              {displayedSlots.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No parking slots found matching the selected filter on this floor.
                </div>
              ) : (
                <div className="sim-slots-grid-10">
                  {displayedSlots.map(slot => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const isCar = slot.type === 'four_wheeler' || slot.type === 'car';
                    return (
                      <div
                        key={slot.id}
                        className={`sim-slot-tile ${slot.status} ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="sim-slot-tile-id">{slot.id}</div>
                        <div className="sim-slot-tile-type">
                          <i className={`fa-solid ${isCar ? 'fa-car' : 'fa-motorcycle'}`}></i>
                          <span>{isCar ? 'Car' : 'Bike'}</span>
                        </div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.35rem', color: slot.status === 'available' ? 'var(--status-available)' : slot.status === 'reserved' ? 'var(--status-reserved)' : slot.status === 'occupied' ? 'var(--status-occupied)' : 'var(--status-maintenance)' }}>
                          {slot.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inspector Details Panel */}
            {selectedSlot && (
              <div className="sim-inspector-panel">
                <div className="sim-inspector-header">
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Slot Telemetry
                  </div>
                  <h3 style={{ margin: '0.2rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem' }}>
                    Slot {selectedSlot.id}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontWeight: 700,
                      background:
                        selectedSlot.status === 'available'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : selectedSlot.status === 'reserved'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : selectedSlot.status === 'occupied'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(107, 114, 128, 0.15)',
                      color:
                        selectedSlot.status === 'available'
                          ? 'var(--status-available)'
                          : selectedSlot.status === 'reserved'
                          ? 'var(--status-reserved)'
                          : selectedSlot.status === 'occupied'
                          ? 'var(--status-occupied)'
                          : 'var(--status-maintenance)'
                    }}
                  >
                    Status: {selectedSlot.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <div className="sim-inspector-body-row">
                    <span style={{ color: 'var(--text-muted)' }}>Parking Facility</span>
                    <span style={{ fontWeight: 700 }}>{selectedLot.name}</span>
                  </div>
                  <div className="sim-inspector-body-row">
                    <span style={{ color: 'var(--text-muted)' }}>Floor Level</span>
                    <span style={{ fontWeight: 700 }}>{selectedSlot.floor}</span>
                  </div>
                  <div className="sim-inspector-body-row">
                    <span style={{ color: 'var(--text-muted)' }}>Vehicle Type</span>
                    <span style={{ fontWeight: 700 }}>
                      {selectedSlot.type === 'four_wheeler' || selectedSlot.type === 'car' ? 'Four-Wheeler (Car)' : 'Two-Wheeler (Bike)'}
                    </span>
                  </div>
                  <div className="sim-inspector-body-row">
                    <span style={{ color: 'var(--text-muted)' }}>Hourly Parking Rate</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>₹{selectedSlot.price}.00 / hr</span>
                  </div>
                  <div className="sim-inspector-body-row">
                    <span style={{ color: 'var(--text-muted)' }}>Pre-Booking Base Fare</span>
                    <span style={{ fontWeight: 700 }}>
                      ₹{selectedSlot.type === 'two_wheeler' ? '10.00' : '20.00'} (Credited at exit)
                    </span>
                  </div>
                  <div className="sim-inspector-body-row">
                    <span style={{ color: 'var(--text-muted)' }}>Gate Authentication</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>Digital QR Pass</span>
                  </div>
                </div>

                {/* Purely Informational Bay Telemetry */}
                <div style={{ marginTop: '1.25rem' }}>
                  {selectedSlot.status === 'available' ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-available)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>Bay Available for Reservation</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        This parking space is currently vacant in the facility database. Drivers can book this space in advance or upon arrival once signed in to their account.
                      </p>
                    </div>
                  ) : selectedSlot.status === 'occupied' ? (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-occupied)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        <i className="fa-solid fa-ban"></i>
                        <span>Bay Currently Occupied</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        A vehicle is physically parked in this bay. The system automatically releases this space when the vehicle checks out at the exit gate scanner.
                      </p>
                    </div>
                  ) : selectedSlot.status === 'reserved' ? (
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-reserved)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        <i className="fa-solid fa-clock"></i>
                        <span>Bay Pre-Booked (Reserved)</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        This slot has been reserved in advance by a registered driver holding an active digital QR pass. It remains locked until arrival or booking expiration.
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(107, 114, 128, 0.08)', border: '1px solid rgba(107, 114, 128, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        <i className="fa-solid fa-wrench"></i>
                        <span>Under Scheduled Maintenance</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        This slot is temporarily disabled for line repainting or sensor maintenance and is excluded from active reservations.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          Transparent Tariff & Fare Calculator (Strictly Two/Four Wheeler)
          ==================================================================== */}
      <section className="landing-section" id="calculator">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-calculator"></i> Transparent Pricing
          </div>
          <h2 className="section-main-heading">
            Tariff & Base Fare Calculator
          </h2>
          <p className="section-description">
            Calculate your parking cost accurately. Choose your vehicle type (Two-Wheeler or Four-Wheeler), 
            booking mode, and estimated duration.
          </p>
        </div>

        <div className="calculator-box">
          <div className="calculator-grid">
            {/* Input Controls */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                1. Select Vehicle Classification
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.75rem' }}>
                {Object.entries(RATES).map(([key, data]) => (
                  <div
                    key={key}
                    className={`vehicle-option-card ${calcVehicle === key ? 'selected' : ''}`}
                    onClick={() => setCalcVehicle(key)}
                  >
                    <i className={`fa-solid ${data.icon}`} style={{ fontSize: '1.6rem', color: calcVehicle === key ? 'var(--accent-gold)' : 'var(--text-muted)', marginBottom: '0.5rem' }}></i>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{data.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{data.hourly}/hr (Base: ₹{data.baseFare})</div>
                  </div>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                2. Select Booking Mode
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem' }}>
                <button
                  type="button"
                  onClick={() => setCalcMode('pre')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: calcMode === 'pre' ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    background: calcMode === 'pre' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-input)',
                    color: calcMode === 'pre' ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-clock"></i> Pre-Booking (Advance Space)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('live')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: calcMode === 'live' ? '1.5px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                    background: calcMode === 'live' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-input)',
                    color: calcMode === 'live' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-car-on"></i> Live Booking (On-Arrival)
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    3. Estimated Parking Duration:
                  </label>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'Outfit, sans-serif' }}>
                    {calcHours} {calcHours === 1 ? 'Hour' : 'Hours'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={calcHours}
                  onChange={(e) => setCalcHours(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  <span>1 Hour</span>
                  <span>4 Hours</span>
                  <span>8 Hours</span>
                  <span>12 Hours</span>
                </div>
              </div>
            </div>

            {/* Price Output Breakdown */}
            <div className="calc-breakdown-card">
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Estimated Billing Breakdown
              </div>
              <h3 style={{ margin: '0 0 1.25rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem' }}>
                Payment Summary
              </h3>

              <div className="calc-breakdown-row">
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Type</span>
                <span style={{ fontWeight: 700 }}>{currentRate.name}</span>
              </div>
              <div className="calc-breakdown-row">
                <span style={{ color: 'var(--text-muted)' }}>Hourly Tariff</span>
                <span style={{ fontWeight: 700 }}>₹{currentRate.hourly}.00 / hr</span>
              </div>
              <div className="calc-breakdown-row">
                <span style={{ color: 'var(--text-muted)' }}>Estimated Duration</span>
                <span style={{ fontWeight: 700 }}>{calcHours} Hours</span>
              </div>

              {calcMode === 'pre' ? (
                <>
                  <div className="calc-breakdown-row" style={{ color: 'var(--accent-gold)' }}>
                    <span>Advance Base Fare (Paid now)</span>
                    <span style={{ fontWeight: 700 }}>₹{baseFarePayable}.00</span>
                  </div>
                  <div className="calc-breakdown-row" style={{ color: 'var(--accent-emerald)' }}>
                    <span>Remaining Balance (Due at exit)</span>
                    <span style={{ fontWeight: 700 }}>₹{exitPayable}.00</span>
                  </div>
                </>
              ) : (
                <div className="calc-breakdown-row" style={{ color: 'var(--accent-emerald)' }}>
                  <span>Advance Payment Required</span>
                  <span style={{ fontWeight: 700 }}>₹0.00 (Pay at exit)</span>
                </div>
              )}

              <div className="calc-grand-total">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Total Estimated Charge
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    Based on ₹{currentRate.hourly}/hr × {calcHours} hrs
                  </div>
                </div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  ₹{totalTariff}.00
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-gold)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <i className="fa-solid fa-calculator"></i>
                  <span>Automated Tariff Enforcement</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Tariffs are automatically computed at gate exit based on exact timestamps. For pre-booked slots, the base fare is credited directly toward your final parking balance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Dedicated Portals for Drivers & Administrators
          ==================================================================== */}
      <section className="landing-section" id="roles">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-users-gear"></i> Platform Portals
          </div>
          <h2 className="section-main-heading">
            Built for Drivers and Operations
          </h2>
          <p className="section-description">
            Dedicated interfaces designed specifically for drivers looking for parking spaces 
            and campus administrators managing facility operations.
          </p>
        </div>

        <div className="perspective-toggle-bar">
          <div className="perspective-toggle-container">
            <button
              className={`perspective-btn ${activeRole === 'driver' ? 'active' : ''}`}
              onClick={() => setActiveRole('driver')}
            >
              <i className="fa-solid fa-car-side"></i>
              <span>Driver & Commuter Portal</span>
            </button>
            <button
              className={`perspective-btn ${activeRole === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveRole('admin')}
            >
              <i className="fa-solid fa-shield-halved"></i>
              <span>Administrator Command Deck</span>
            </button>
          </div>
        </div>

        <div className="perspective-card">
          {activeRole === 'driver' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                    Frictionless Mobility for Campus Commuters
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Search parking, reserve slots in advance, access lots with mobile QR codes, and pay contactlessly.
                  </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--accent-gold)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-id-card"></i>
                  <span>Driver & Commuter Access</span>
                </div>
              </div>

              <div className="perspective-grid">
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-id-card" style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>Vehicle Garage</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Register both Two-Wheelers and Four-Wheelers with license plate numbers. Switch your active parking vehicle with one tap.
                  </p>
                </div>
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--accent-emerald)', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>Live Slot Grid</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Interactive multi-floor layout showing real-time slot vacancy across Basement 1, Ground Floor, and First Floor.
                  </p>
                </div>
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-qrcode" style={{ color: '#38bdf8', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>Digital QR Passes</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Instant QR gate entry passes stored directly in your portal. Ready for immediate camera scan at entrance and exit.
                  </p>
                </div>
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-receipt" style={{ color: '#a855f7', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>History & Digital Receipts</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    View complete history of your past parking sessions, duration timestamps, payments, and downloadable invoices.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                    Total Operational Control for Facility Administrators
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Live gate camera scanner, lot layout management, dynamic pricing controls, and issue triage.
                  </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--accent-emerald)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-shield-halved"></i>
                  <span>Administrator Command Deck</span>
                </div>
              </div>

              <div className="perspective-grid">
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-camera" style={{ color: 'var(--accent-emerald)', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>Gate Scanner Terminal</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Dedicated entry and exit terminal with live camera QR scanner for instant vehicle check-in and check-out.
                  </p>
                </div>
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>Lots & Slots Management</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Add new parking lots, create slots, modify floor assignments, and set maintenance flags when bays need servicing.
                  </p>
                </div>
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-tags" style={{ color: '#38bdf8', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>Pricing & Tariff Control</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Configure base fares and hourly parking tariffs per lot or individual slot to match campus parking policies.
                  </p>
                </div>
                <div className="perspective-feature-item">
                  <i className="fa-solid fa-chart-line" style={{ color: '#ec4899', fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>Occupancy & Revenue Reports</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Monitor real-time occupancy percentages, daily revenue trends, peak parking hours, and gate scan logs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================
          Enterprise Non-Functional Benchmarks
          ==================================================================== */}
      <section className="landing-section" id="benchmarks">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-shield-halved"></i> Engineering Standards
          </div>
          <h2 className="section-main-heading">
            Performance, Reliability & Security
          </h2>
          <p className="section-description">
            Engineered to handle high-traffic campus rush hours while safeguarding user data 
            and ensuring data consistency.
          </p>
        </div>

        <div className="benchmarks-grid">
          <div className="benchmark-card">
            <i className="fa-solid fa-bolt" style={{ color: 'var(--accent-gold)', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
            <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
              Sub-2-Second Gate Scans
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              QR entry and exit validation operates in under 2.0 seconds, preventing vehicle bottlenecks 
              at campus parking gates.
            </p>
            <div className="benchmark-target-pill">
              <i className="fa-solid fa-check"></i> Gate Validation &le; 2.0s
            </div>
          </div>

          <div className="benchmark-card">
            <i className="fa-solid fa-server" style={{ color: 'var(--accent-emerald)', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
            <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
              10,000+ Concurrent Scale
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              High-throughput backend architecture with database connection pooling designed to support 
              peak arrival periods across all campus zones.
            </p>
            <div className="benchmark-target-pill">
              <i className="fa-solid fa-check"></i> Scalable Architecture
            </div>
          </div>

          <div className="benchmark-card">
            <i className="fa-solid fa-lock" style={{ color: '#38bdf8', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
            <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
              Zero Double-Booking
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Strict database transaction locks ensure a parking bay cannot be reserved by more than one 
              driver for the same timeframe.
            </p>
            <div className="benchmark-target-pill">
              <i className="fa-solid fa-check"></i> Atomic Transaction Locks
            </div>
          </div>

          <div className="benchmark-card">
            <i className="fa-solid fa-shield-check" style={{ color: '#a855f7', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
            <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
              Security & Confidentiality
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Role-based access control (RBAC), salted password encryption, and cryptographic token 
              validation protecting user and payment records.
            </p>
            <div className="benchmark-target-pill">
              <i className="fa-solid fa-check"></i> Secure JWT & Cryptography
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Frequently Asked Questions
          ==================================================================== */}
      <section className="landing-section" id="faqs">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-circle-question"></i> Help & FAQs
          </div>
          <h2 className="section-main-heading">
            Frequently Asked Questions
          </h2>
          <p className="section-description">
            Answers to common questions about campus parking bookings, payments, and gate access.
          </p>
        </div>

        <div className="faq-accordion-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: 'var(--accent-gold)' }}></i>
                </button>
                {isOpen && (
                  <div className="faq-answer-body">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ====================================================================
          Call to Action Banner
          ==================================================================== */}
      <section className="landing-section">
        <div className="landing-cta-banner">
          <div className="section-pill-tag" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <i className="fa-solid fa-car-side"></i> Ready to Park?
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, margin: '1rem 0' }}>
            Get Started with Smart Campus Parking
          </h2>
          <p style={{ maxWidth: '650px', margin: '0 auto 2rem auto', color: 'var(--text-muted)', fontSize: '1rem' }}>
            Sign in with demo credentials or create a driver account to search lots, 
            reserve parking slots, and experience contactless QR entry.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn-landing-primary hero-btn-large">
              <i className="fa-solid fa-arrow-right-to-bracket"></i>
              <span>Sign In to System</span>
            </Link>
            <Link to="/register" className="btn-landing-secondary hero-btn-large">
              <i className="fa-solid fa-user-plus"></i>
              <span>Register New Driver</span>
            </Link>
            <button onClick={() => setShowDemoModal(true)} className="btn-landing-secondary hero-btn-large">
              <i className="fa-solid fa-key"></i>
              <span>View Test Credentials</span>
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Footer
          ==================================================================== */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="footer-col">
            <div className="landing-brand" style={{ marginBottom: '1rem' }}>
              <div className="landing-brand-icon">
                <i className="fa-solid fa-square-parking"></i>
              </div>
              <div className="landing-brand-text">
                <h1 style={{ fontSize: '1.25rem' }}>SPMS</h1>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: '340px' }}>
              Smart Parking Management System providing centralized parking reservations, 
              real-time slot availability, QR-based entry/exit, and automated digital payments.
            </p>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span className="pulse-dot" style={{ display: 'inline-block' }}></span>
              <span>All 4 Campus Parking Hubs Online</span>
            </div>
          </div>

          <div className="footer-col">
            <h5>Navigation</h5>
            <ul className="footer-links-list">
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#features">Core Features</a></li>
              <li><a href="#live-slots">Live Parking Map</a></li>
              <li><a href="#calculator">Tariff Calculator</a></li>
              <li><a href="#roles">Portals</a></li>
              <li><a href="#faqs">FAQs</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Access Portals</h5>
            <ul className="footer-links-list">
              <li><Link to="/login">Sign In (Driver & Admin)</Link></li>
              <li><Link to="/register">Driver Registration</Link></li>
              <li><a href="#roles">Driver Portal Features</a></li>
              <li><a href="#roles">Admin Control Deck</a></li>
              <li><a href="#benchmarks">System Benchmarks</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Quick Access</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
              Instantly test with pre-seeded demo accounts:
            </p>
            <button
              onClick={() => setShowDemoModal(true)}
              className="btn-landing-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              <i className="fa-solid fa-key" style={{ color: 'var(--accent-gold)' }}></i>
              <span>View Test Credentials</span>
            </button>
          </div>
        </div>

        <div className="footer-sub-row">
          <div>
            &copy; 2026 SPMS Smart Parking Management System. All rights reserved.
          </div>
          <div>
            Centralized Web Platform for Two-Wheelers & Four-Wheelers
          </div>
        </div>
      </footer>

      {/* ====================================================================
          Pre-Seeded Demo Accounts Modal
          ==================================================================== */}
      {showDemoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowDemoModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-bright)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <i className="fa-solid fa-key" style={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }}></i>
                <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem' }}>
                  Pre-Configured Demo Accounts
                </h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
              Choose a role below to sign in:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Mehanna Reddy</span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-gold)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                      DRIVER
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    mehanna@spms.com • Pass: user123
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
                    Vehicle: TS09 AB 1234 (Four-Wheeler) • Slot C5 Reserved
                  </div>
                </div>
                <Link
                  to="/login"
                  className="btn-landing-primary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
                >
                  Sign In
                </Link>
              </div>

              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Super Admin</span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                      ADMINISTRATOR
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    admin@spms.com • Pass: admin123
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                    Facility CRUD, Pricing, Gate Scanner & Analytics
                  </div>
                </div>
                <Link
                  to="/login"
                  className="btn-landing-primary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem', background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' }}
                >
                  Admin Login
                </Link>
              </div>

              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Security Operator</span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                      GATE ADMIN
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    operator@spms.com • Pass: admin123
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Entry & Exit Gate Camera Scanner Tool
                  </div>
                </div>
                <Link
                  to="/login"
                  className="btn-landing-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
                >
                  Sign In
                </Link>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                onClick={() => setShowDemoModal(false)}
                className="btn-landing-secondary"
                style={{ fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
