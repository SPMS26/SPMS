import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lotService } from '../services/lotService';
import { authService } from '../services/authService';
import { homeForRole } from '../components/layout/ProtectedRoute';
import './LandingPage.css';
import { useConfirm } from '../components/common/ConfirmProvider';

// Sample lots used by the interactive slot explorer
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

// Sample slot layout per lot (two-wheeler and four-wheeler bays)
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
    desc: 'See available, reserved and occupied slots across every listed lot and floor before you set off.',
    tag: 'Live Occupancy'
  },
  {
    icon: 'fa-calendar-check',
    title: 'Advance Pre-Booking',
    desc: 'Reserve a specific slot for your planned arrival time by paying a small reservation fee set by the lot.',
    tag: 'Guaranteed Space'
  },
  {
    icon: 'fa-person-walking-luggage',
    title: 'Walk-in Check-in',
    desc: 'No booking? Gate security assigns a free slot on the spot. It shows as occupied to every user immediately.',
    tag: 'Gate Desk'
  },
  {
    icon: 'fa-qrcode',
    title: 'Contactless QR Gate Access',
    desc: 'Every paid pre-booking generates a signed QR pass. Security scans it at the gate to check you in and out.',
    tag: 'Zero Queues'
  },
  {
    icon: 'fa-clock-rotate-left',
    title: 'Precise Duration Tracking',
    desc: 'Arrival and exit times are logged to the minute, so the parking charge is calculated without disputes.',
    tag: 'Automated Logs'
  },
  {
    icon: 'fa-receipt',
    title: 'Clear Payments',
    desc: 'The reservation fee is paid when you book. The parking charge, hours times the slot rate, is paid at exit.',
    tag: 'Digital Billing'
  },
  {
    icon: 'fa-motorcycle',
    title: 'Multi-Vehicle Management',
    desc: 'Register two-wheelers and four-wheelers on one account and switch the active vehicle with one click.',
    tag: 'Fleet Support'
  },
  {
    icon: 'fa-ban',
    title: 'One Slot Per Vehicle',
    desc: 'A vehicle cannot hold two slots at overlapping times, whether it was pre-booked or checked in at the gate.',
    tag: 'No Double-Booking'
  },
  {
    icon: 'fa-triangle-exclamation',
    title: 'Incident Reporting',
    desc: 'Report a blocked slot, scanner fault or damaged bay. The report goes straight to the owner of that lot.',
    tag: 'User Support'
  },
  {
    icon: 'fa-building-shield',
    title: 'Lot Owner Registration',
    desc: 'Parking lot owners register for a one-time fee, then list their own lots and slots for users to book.',
    tag: 'Multi-Owner'
  },
  {
    icon: 'fa-user-shield',
    title: 'Security Staff Per Lot',
    desc: 'Owners create gate accounts tied to one lot. A guard can only scan and check in vehicles for that lot.',
    tag: 'Scoped Access'
  },
  {
    icon: 'fa-chart-pie',
    title: 'Owner Dashboard & Analytics',
    desc: 'Owners see revenue, month-wise history, peak times and incident reports for their own lots only.',
    tag: 'Control Deck'
  }
];

const FAQS = [
  {
    q: 'What is the difference between pre-booking and a walk-in?',
    a: 'Pre-booking reserves a specific slot for a planned arrival time. You pay the lot\'s reservation fee up front and receive a QR pass. A walk-in is for users who arrive without a booking: gate security picks a free slot, checks the vehicle in, and you pay the parking charge when you leave.'
  },
  {
    q: 'What do I pay, and when?',
    a: 'When you pre-book, you pay the reservation fee set by that lot. At exit you pay the parking charge, which is the number of hours parked (rounded up) times the slot\'s hourly rate. Walk-ins pay only the parking charge at exit.'
  },
  {
    q: 'How does the QR code gate entry and exit work?',
    a: 'Once your pre-booking is paid, a digital QR pass appears in your portal. Gate security scans it to check you in and record your entry time. When you leave, security starts checkout, the parking charge is calculated from your exact duration, and the slot is freed once payment is collected.'
  },
  {
    q: 'Can one vehicle book more than one slot at the same time?',
    a: 'No. A vehicle can only occupy one slot at a time. A new booking is refused if the same vehicle already has a booking or a parked session that overlaps the requested time. Back-to-back bookings are fine.'
  },
  {
    q: 'What happens if I do not pay my reservation fee?',
    a: 'An unpaid pre-booking holds the slot for 15 minutes. After that it is cancelled automatically and the slot becomes available to other users.'
  },
  {
    q: 'How do I list my own parking lot?',
    a: 'Register as a lot owner and pay the one-time registration fee. You can then create your lots, generate slots, set hourly prices and the reservation fee, and add security accounts. Users see your lot alongside every other listed lot.'
  },
  {
    q: 'How do security accounts work?',
    a: 'A lot owner creates security accounts and assigns each one to a single lot. A guard can scan passes, check in walk-ins and check vehicles out for that lot only. Owners manage the business side and do not use the gate screens.'
  },
  {
    q: 'What should I do if my slot is blocked when I arrive?',
    a: 'Submit an incident report from the Report Issue page and select the lot. It goes to that lot\'s owner, who can resolve it. You can also tell the gate security on site.'
  }
];

// Content for the three role tabs
const ROLE_CONTENT = {
  user: {
    label: 'User',
    icon: 'fa-car-side',
    title: 'Find and book parking in any listed lot',
    badge: 'User',
    items: [
      { icon: 'fa-id-card', color: 'var(--accent-gold)', title: 'Vehicle Garage', desc: 'Register two-wheelers and four-wheelers with their plate numbers and switch the active vehicle with one tap.' },
      { icon: 'fa-map-location-dot', color: 'var(--accent-emerald)', title: 'Live Slot Grid', desc: 'A multi-floor layout showing which slots are free, reserved or occupied right now.' },
      { icon: 'fa-qrcode', color: '#C9B07A', title: 'Digital QR Passes', desc: 'Your paid pre-booking generates a QR pass in your portal, ready to scan at the gate.' },
      { icon: 'fa-receipt', color: '#EBD9AE', title: 'History & Receipts', desc: 'Review past sessions with entry and exit times, durations and payments.' }
    ]
  },
  owner: {
    label: 'Lot Owner',
    icon: 'fa-building-shield',
    title: 'Run your own parking lot',
    badge: 'Lot Owner',
    items: [
      { icon: 'fa-layer-group', color: 'var(--accent-gold)', title: 'Lots & Slots', desc: 'Create lots with opening hours and contact details, generate slots by section, and mark bays for maintenance.' },
      { icon: 'fa-tags', color: '#C9B07A', title: 'Your Own Pricing', desc: 'Set the hourly price per slot and the reservation fee for each lot.' },
      { icon: 'fa-user-shield', color: 'var(--accent-emerald)', title: 'Security Staff', desc: 'Create gate accounts, assign each to one lot, reset passwords and deactivate access at any time.' },
      { icon: 'fa-chart-line', color: '#D9BF8C', title: 'Analytics & Reports', desc: 'Revenue, month-wise history, peak times and incident reports, limited to your own lots.' }
    ]
  },
  security: {
    label: 'Gate Security',
    icon: 'fa-user-shield',
    title: 'Run the gate for one lot',
    badge: 'Gate Security',
    items: [
      { icon: 'fa-camera', color: 'var(--accent-emerald)', title: 'Gate Scanner', desc: 'Scan QR passes to check pre-booked users in and out of your assigned lot.' },
      { icon: 'fa-person-walking-luggage', color: 'var(--accent-gold)', title: 'Walk-in Desk', desc: 'Pick a free slot on the live map, enter the plate number and check the vehicle in. Search any vehicle by number.' },
      { icon: 'fa-square-parking', color: '#C9B07A', title: 'Parked & Pre-booked', desc: 'Separate lists of parked vehicles and expected pre-bookings, each searchable, with check-in and check-out.' },
      { icon: 'fa-bolt', color: '#EBD9AE', title: 'Live Bookings', desc: 'Every walk-in session for the day, with running charges and completed sessions.' }
    ]
  }
};

const LandingPage = () => {
    const { user, logout } = useAuth();
  const confirm = useConfirm();

  // Live platform stats and owner registration fee come from the API
  const [stats, setStats] = useState(null);
  const [ownerFee, setOwnerFee] = useState(999);
  useEffect(() => {
    lotService.getAllLots().then((res) => {
      const lots = res.lots || [];
      setStats({
        lots: lots.length,
        slots: lots.reduce((n, l) => n + (l.total_slots || 0), 0),
        owners: new Set(lots.map((l) => l.owner_name).filter(Boolean)).size
      });
    }).catch(() => {});
    authService.getAdminRegistrationConfig().then((r) => setOwnerFee(r.fee)).catch(() => {});
  }, []);


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
  const [calcMode, setCalcMode] = useState('pre'); // 'pre' (pre-booking) or 'walkin'
  const [calcHours, setCalcHours] = useState(2);

  // Role Perspective State
  const [activeRole, setActiveRole] = useState('user'); // 'user', 'owner' or 'security'

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);


    // Sample pricing. Each lot owner sets their own hourly rate and reservation fee.
  const RESERVATION_FEE = 10;
  const RATES = {
    four_wheeler: { name: 'Four-Wheeler (Car)', hourly: 30, icon: 'fa-car' },
    two_wheeler: { name: 'Two-Wheeler (Bike/Scooter)', hourly: 15, icon: 'fa-motorcycle' }
  };

  const currentRate = RATES[calcVehicle];
  const parkingCharge = currentRate.hourly * calcHours;
  const reservationFee = calcMode === 'pre' ? RESERVATION_FEE : 0;
  const grandTotal = parkingCharge + reservationFee;


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
                        <li><a href="#live-slots">Slot Explorer</a></li>
            <li><a href="#calculator">Tariff Calculator</a></li>
            <li><a href="#roles">Portals</a></li>
            <li><a href="#faqs">FAQs</a></li>
          </ul>

          <div className="landing-nav-actions">
            {user ? (
              <>
                <button
                  onClick={async () => { if (await confirm({ title: 'Sign out?', message: 'You will need to sign in again to use your account.', confirmLabel: 'Sign out' })) logout('/'); }}
                  className="btn-landing-secondary"
                  title="Sign out"
                >
                  <span>Sign Out</span>
                </button>
                <Link to={homeForRole(user.role)} className="btn-landing-primary">
                  <span>Open Dashboard</span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.8rem' }}></i>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-landing-secondary">
                  <span>Sign In</span>
                </Link>
                <Link to="/register-owner" className="btn-landing-secondary">
                  <span>List Your Lot</span>
                </Link>
                <Link to="/register" className="btn-landing-primary">
                  <span>Register User</span>
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
          <span>SMART PARKING FOR USERS AND LOT OWNERS</span>
        </div>

        <h1 className="hero-main-title">
                    Book Parking in Any Lot <br />
          <span className="hero-highlight-gold">Or Run Your Own</span> <br />
          <span className="hero-highlight-emerald">Contactless From Gate to Exit</span>
        </h1>

        <p className="hero-subtext">
                    Users find open slots in real time, pre-book with a QR pass, and pay at exit. Parking lot owners
          register, list their lots, add gate security and track revenue from one dashboard.
        </p>

          {user ? (
            <div className="hero-cta-group">
              <Link to={homeForRole(user.role)} className="btn-landing-primary hero-btn-large">
                <i className="fa-solid fa-gauge-high"></i>
                <span>Open Dashboard</span>
              </Link>
              <a href="#live-slots" className="btn-landing-secondary hero-btn-large" style={{ opacity: 0.85 }}>
                <i className="fa-solid fa-map-location-dot"></i>
                <span>Slot Explorer</span>
              </a>
            </div>
          ) : (
        <div className="hero-cta-group">
            <Link to="/login" className="btn-landing-primary hero-btn-large">
              <i className="fa-solid fa-arrow-right-to-bracket"></i>
              <span>Sign In</span>
            </Link>
            <Link to="/register" className="btn-landing-secondary hero-btn-large">
              <i className="fa-solid fa-user-plus"></i>
              <span>Register as User</span>
            </Link>
                      <Link to="/register-owner" className="btn-landing-secondary hero-btn-large">
              <i className="fa-solid fa-building-shield"></i>
              <span>Register Your Lot</span>
            </Link>
            <a href="#live-slots" className="btn-landing-secondary hero-btn-large" style={{ opacity: 0.85 }}>
              <i className="fa-solid fa-map-location-dot"></i>
              <span>Slot Explorer</span>
            </a>
          </div>
          )}


        {/* Live System Operational Stats */}
        <div className="hero-telemetry-grid">
          <div className="telemetry-card">
                        <div className="telemetry-val" style={{ color: 'var(--accent-gold)' }}>{stats ? stats.lots : '-'} {stats && stats.lots === 1 ? 'Lot' : 'Lots'}</div>
            <div className="telemetry-label">
              <i className="fa-solid fa-location-dot"></i> Listed Parking Lots
            </div>
          </div>
          <div className="telemetry-card">
                        <div className="telemetry-val" style={{ color: 'var(--accent-emerald)' }}>{stats ? stats.slots : '-'} {stats && stats.slots === 1 ? 'Slot' : 'Slots'}</div>
            <div className="telemetry-label">
              <i className="fa-solid fa-layer-group"></i> Bookable Slots
            </div>
          </div>
          <div className="telemetry-card">
                        <div className="telemetry-val" style={{ color: '#C9B07A' }}>{stats ? stats.owners : '-'} {stats && stats.owners === 1 ? 'Owner' : 'Owners'}</div>
            <div className="telemetry-label">
              <i className="fa-solid fa-building"></i> Lot Owners
            </div>
          </div>
          <div className="telemetry-card">
            <div className="telemetry-val" style={{ color: '#E3CC9A' }}>100%</div>
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
              Sample lot preview
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
                <span style={{ fontSize: '0.75rem', background: 'rgba(227, 204, 154, 0.15)', color: 'var(--accent-emerald)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                  Sample Data
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
                <span style={{ background: 'rgba(227, 204, 154, 0.2)', color: 'var(--accent-emerald)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
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
                      Pre-Booking (Reservation Fee Paid)
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
          How It Works: 6 Step User Journey
          ==================================================================== */}
      <section className="landing-section" id="how-it-works">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-route"></i> The User Journey
          </div>
          <h2 className="section-main-heading">
            How Smart Parking Works
          </h2>
          <p className="section-description">
                        From finding a slot to paying at exit, every step is digital.
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
                            Browse lots from every registered owner. Check live capacity and floor vacancy,
              opening hours and hourly rates before you travel.
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
                        <h3 className="process-step-title">2. Pre-Book Your Slot</h3>
            <p className="process-step-desc">
              Pick a slot and pay the lot's small <strong>reservation fee</strong> to lock it.
              Arriving without a booking? Gate security can check you in as a <strong>walk-in</strong>.
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
                            Your exact arrival and exit times are logged. No paper tickets to lose and
              no billing disputes.
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
                        <h3 className="process-step-title">6. Pay at Exit</h3>
            <p className="process-step-desc">
              Security starts checkout and the parking charge is calculated from your duration
              and the slot's hourly rate. Pay it and the slot is freed.
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
            Everything for Users, Owners and Gate Security
          </h2>
          <p className="section-description">
                        Tools for users who park, owners who run lots, and security staff who run the gate.
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
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}><i className="fa-solid fa-circle" style={{ fontSize: '0.5rem', verticalAlign: 'middle' }}></i> Active</span>
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
            <i className="fa-solid fa-gamepad"></i> Interactive Preview
          </div>
          <h2 className="section-main-heading">
                        Parking Slot Explorer

          </h2>
          <p className="section-description">
                        Explore a sample lot layout. Select a lot and floor, filter by vehicle type,
            and inspect bay status.
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
                          ? 'rgba(227, 204, 154, 0.15)'
                          : selectedSlot.status === 'reserved'
                          ? 'rgba(217, 191, 140, 0.15)'
                          : selectedSlot.status === 'occupied'
                          ? 'rgba(138, 132, 120, 0.15)'
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
                    <span style={{ color: 'var(--text-muted)' }}>Reservation Fee</span>
                    <span style={{ fontWeight: 700 }}>
                      ₹{RESERVATION_FEE}.00 (paid when booking)
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
                    <div style={{ background: 'rgba(227, 204, 154, 0.08)', border: '1px solid rgba(227, 204, 154, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-available)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>Bay Available for Reservation</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        This parking space is currently vacant in the facility database. Users can book this space in advance or upon arrival once signed in to their account.
                      </p>
                    </div>
                  ) : selectedSlot.status === 'occupied' ? (
                    <div style={{ background: 'rgba(138, 132, 120, 0.08)', border: '1px solid rgba(138, 132, 120, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-occupied)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        <i className="fa-solid fa-ban"></i>
                        <span>Bay Currently Occupied</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        A vehicle is physically parked in this bay. The system automatically releases this space when the vehicle checks out at the exit gate scanner.
                      </p>
                    </div>
                  ) : selectedSlot.status === 'reserved' ? (
                    <div style={{ background: 'rgba(217, 191, 140, 0.08)', border: '1px solid rgba(217, 191, 140, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-reserved)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        <i className="fa-solid fa-clock"></i>
                        <span>Bay Pre-Booked (Reserved)</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        This slot has been reserved in advance by a registered user holding an active digital QR pass. It remains locked until arrival or booking expiration.
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(107, 114, 128, 0.08)', border: '1px solid rgba(107, 114, 128, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A8A39A', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
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
                        Tariff Calculator

          </h2>
          <p className="section-description">
                        Estimate your cost. Rates shown are samples: each lot owner sets their own hourly price
            and reservation fee.
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{data.hourly}/hr</div>
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
                    background: calcMode === 'pre' ? 'rgba(217, 191, 140, 0.1)' : 'var(--bg-input)',
                    color: calcMode === 'pre' ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-clock"></i> Pre-Booking
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('walkin')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: calcMode === 'walkin' ? '1.5px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                    background: calcMode === 'walkin' ? 'rgba(227, 204, 154, 0.1)' : 'var(--bg-input)',
                    color: calcMode === 'walkin' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-car-on"></i> Walk-in (Pay at Exit)
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
                                        <span>Reservation Fee (Paid when booking)</span>
                    <span style={{ fontWeight: 700 }}>₹{reservationFee}.00</span>
                  </div>
                  <div className="calc-breakdown-row" style={{ color: 'var(--accent-emerald)' }}>
                    <span>Parking Charge (Due at exit)</span>
                    <span style={{ fontWeight: 700 }}>₹{parkingCharge}.00</span>
                  </div>
                </>
              ) : (
                <div className="calc-breakdown-row" style={{ color: 'var(--accent-emerald)' }}>
                  <span>Parking Charge (Due at exit)</span>
                  <span style={{ fontWeight: 700 }}>₹{parkingCharge}.00</span>
                </div>
              )}

              <div className="calc-grand-total">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Total Estimated Charge
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    Parking ₹{currentRate.hourly}/hr × {calcHours} hrs{calcMode === 'pre' ? ` + ₹${RESERVATION_FEE} reservation fee` : ''}
                  </div>
                </div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                                    ₹{grandTotal}.00

                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-gold)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <i className="fa-solid fa-calculator"></i>
                                    <span>How billing works</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  The parking charge is calculated at exit from your exact duration, rounded up to the next hour. The reservation fee is separate and paid when you pre-book.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Portals for Users, Lot Owners and Gate Security
          ==================================================================== */}
      <section className="landing-section" id="roles">
        <div className="section-header-centered">
          <div className="section-pill-tag">
            <i className="fa-solid fa-users-gear"></i> Platform Portals
          </div>
          <h2 className="section-main-heading">
            One Platform, Three Portals
          </h2>
          <p className="section-description">
            Users book slots, lot owners run their lots, and gate security handles arrivals and departures.
          </p>
        </div>

        <div className="perspective-toggle-bar">
          <div className="perspective-toggle-container">
            {Object.entries(ROLE_CONTENT).map(([key, role]) => (
              <button
                key={key}
                className={`perspective-btn ${activeRole === key ? 'active' : ''}`}
                onClick={() => setActiveRole(key)}
              >
                <i className={`fa-solid ${role.icon}`}></i>
                <span>{role.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="perspective-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                {ROLE_CONTENT[activeRole].title}
              </h3>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(217, 191, 140, 0.12)', border: '1px solid rgba(217, 191, 140, 0.3)', color: 'var(--accent-gold)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                <i className={`fa-solid ${ROLE_CONTENT[activeRole].icon}`}></i>
                <span>{ROLE_CONTENT[activeRole].badge}</span>
              </div>
            </div>

            <div className="perspective-grid">
              {ROLE_CONTENT[activeRole].items.map((item) => (
                <div key={item.title} className="perspective-feature-item">
                  <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: '1.3rem', marginBottom: '0.75rem' }}></i>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {activeRole === 'owner' && (
              <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/register-owner" className="btn-landing-primary">
                  <i className="fa-solid fa-building-shield"></i>
                  <span>Register Your Lot</span>
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  One-time registration fee: <strong style={{ color: 'var(--accent-gold)' }}>₹{Number(ownerFee).toFixed(2)}</strong>
                </span>
              </div>
            )}
          </div>
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
                        Built to stay fast at busy gates while keeping every owner's data separate and consistent.
          </p>
        </div>

        <div className="benchmarks-grid">
          <div className="benchmark-card">
            <i className="fa-solid fa-bolt" style={{ color: 'var(--accent-gold)', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
            <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
              Sub-2-Second Gate Scans
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            QR entry and exit validation is designed to complete in under 2.0 seconds,
              preventing vehicle bottlenecks at the gate.
            </p>
            <div className="benchmark-target-pill">
              <i className="fa-solid fa-check"></i> Gate Validation &le; 2.0s
            </div>
          </div>

          <div className="benchmark-card">
            <i className="fa-solid fa-server" style={{ color: 'var(--accent-emerald)', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
            <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
                            Isolated Owner Data
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Each owner sees only their own lots, bookings, revenue and reports. Security staff
              are limited to the single lot they are assigned to.
            </p>
            <div className="benchmark-target-pill">
              <i className="fa-solid fa-check"></i> Per-Owner Access Control
            </div>
          </div>

          <div className="benchmark-card">
            <i className="fa-solid fa-lock" style={{ color: '#C9B07A', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
            <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
              Zero Double-Booking
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            Database transaction locks ensure a bay cannot be reserved twice, and a vehicle
              cannot hold two slots at overlapping times.
            </p>
            <div className="benchmark-target-pill">
              <i className="fa-solid fa-check"></i> Atomic Transaction Locks
            </div>
          </div>

          <div className="benchmark-card">
            <i className="fa-solid fa-shield-halved" style={{ color: '#EBD9AE', fontSize: '1.6rem', marginBottom: '1rem' }}></i>
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
            Answers about bookings, payments, gate access and listing your lot.
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
          <div className="section-pill-tag" style={{ background: 'rgba(217, 191, 140, 0.15)' }}>
            <i className="fa-solid fa-car-side"></i> Ready to Park?
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, margin: '1rem 0' }}>
                        Get Started with Smart Parking

          </h2>
          <p style={{ maxWidth: '650px', margin: '0 auto 2rem auto', color: 'var(--text-muted)', fontSize: '1rem' }}>
                        Create a user account to book a slot, or register as a lot owner to list your own parking lot.
          </p>

          {user ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to={homeForRole(user.role)} className="btn-landing-primary hero-btn-large">
                <i className="fa-solid fa-gauge-high"></i>
                <span>Open Dashboard</span>
              </Link>
            </div>
          ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/login" className="btn-landing-primary hero-btn-large">
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                <span>Sign In</span>
              </Link>
                          <Link to="/register" className="btn-landing-secondary hero-btn-large">
                <i className="fa-solid fa-user-plus"></i>
                <span>Register as User</span>
              </Link>
              <Link to="/register-owner" className="btn-landing-secondary hero-btn-large">
                <i className="fa-solid fa-building-shield"></i>
                <span>Register Your Lot</span>
              </Link>
            </div>
          )}
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
                            A parking platform where users book slots in any listed lot and owners manage their own
              lots, security staff and revenue.
            </p>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span className="pulse-dot" style={{ display: 'inline-block' }}></span>
              <span>{stats ? `${stats.lots} parking lots online` : 'Parking lots online'}</span>
            </div>
          </div>

          <div className="footer-col">
            <h5>Navigation</h5>
            <ul className="footer-links-list">
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#features">Core Features</a></li>
                            <li><a href="#live-slots">Slot Explorer</a></li>
              <li><a href="#calculator">Tariff Calculator</a></li>
              <li><a href="#roles">Portals</a></li>
              <li><a href="#faqs">FAQs</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Access Portals</h5>
            <ul className="footer-links-list">
              <li><Link to="/login">Sign In (User, Owner & Security)</Link></li>
              <li><Link to="/register">User Registration</Link></li>
              <li><Link to="/register-owner">Register Your Parking Lot</Link></li>
                            <li><a href="#roles">Portal Features</a></li>
              <li><a href="#benchmarks">Reliability & Security</a></li>
            </ul>
          </div>

        </div>

        <div className="footer-sub-row">
          <div>
            &copy; 2026 SPMS Smart Parking Management System. All rights reserved.
          </div>
          <div>
            Parking for Two-Wheelers & Four-Wheelers
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
