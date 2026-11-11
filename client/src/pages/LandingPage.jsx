import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { lotService } from '../services/lotService';
import { authService } from '../services/authService';
import { homeForRole } from '../components/layout/ProtectedRoute';
import { useConfirm } from '../components/common/ConfirmProvider';
import { lotPriceLabel, lotHoursLabel } from '../components/parking/LotCard';
import './LandingPage.css';

const STEPS = [
  {
    title: 'Pick a free slot',
    body: 'Choose a lot and see every bay on every floor, live: free, reserved, occupied or closed.'
  },
  {
    title: 'Pay a small fee to hold it',
    body: 'The lot\'s reservation fee holds the slot and gives you a QR pass. Unpaid holds are released after 15 minutes.'
  },
  {
    title: 'Scan in, park, scan out',
    body: 'Show the pass at the gate. When you leave you pay for the hours you parked, rounded up, at the slot\'s rate.'
  }
];

const OWNER_POINTS = [
  { title: 'Lots and slots', body: 'Add lots with opening hours, generate slots by section and floor, close bays for maintenance.' },
  { title: 'Your own prices', body: 'Set the hourly rate per slot and the reservation fee for each lot.' },
  { title: 'Gate staff accounts', body: 'Give each guard an account tied to one lot. They scan passes and handle walk-ins.' },
  { title: 'Revenue and incidents', body: 'Bookings, revenue, peak hours and incident reports for your lots only.' }
];

const FAQS = [
  {
    q: 'What is the difference between pre-booking and a walk-in?',
    a: 'Pre-booking reserves a specific slot for a planned arrival time. You pay the lot\'s reservation fee up front and receive a QR pass. A walk-in is for drivers who arrive without a booking: gate security picks a free slot, checks the vehicle in, and you pay the parking charge when you leave.'
  },
  {
    q: 'What do I pay, and when?',
    a: 'When you pre-book, you pay the reservation fee set by that lot. At exit you pay the parking charge: the hours parked (rounded up) times the slot\'s hourly rate. Walk-ins pay only the parking charge at exit.'
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Yes, any time before you check in at the gate, from My bookings or by tapping your slot on the map. The reservation fee is not refunded.'
  },
  {
    q: 'Can one vehicle book more than one slot at the same time?',
    a: 'No. A vehicle can only hold one slot at a time, so a booking that overlaps another booking or a parked session for the same vehicle is refused. Back-to-back bookings are fine.'
  },
  {
    q: 'What happens if I don\'t pay the reservation fee?',
    a: 'An unpaid pre-booking holds the slot for 15 minutes. After that it is cancelled automatically and the slot opens up again.'
  },
  {
    q: 'How do I list my own parking lot?',
    a: 'Register as a lot owner and pay the one-time registration fee. Then create your lots, generate slots, set prices and add gate staff accounts. Drivers see your lots alongside every other listed lot.'
  },
  {
    q: 'What if my slot is blocked when I arrive?',
    a: 'Tell the gate staff on site, or send a report from Report an issue. It goes straight to that lot\'s owner.'
  }
];

// The drawn example in the hero: one floor of bays and a pass
const DEMO_BAYS = 'ffoffrffofffoffxffofoffffofrfffffoffffxo';
const BAY_CLASS = { f: 'free', o: 'busy', r: 'held', x: 'closed' };

// A real, scannable QR code for the example pass, drawn black on white like the printed thing
const DEMO_PASS = 'BK-7F3C21A0';

const useDemoQr = () => {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(`SPMS example pass ${DEMO_PASS}`, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: { dark: '#0B0B0D', light: '#FFFFFF' }
    }).then((url) => alive && setSrc(url)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return src;
};

const HeroVisual = () => {
  const qr = useDemoQr();
  return (
  <div className="lp-visual" aria-hidden="true">
    <div className="lp-visual-map">
      <div className="lp-visual-head">
        <span>Central Parking</span>
        <span className="lp-visual-floor">Basement 1</span>
      </div>
      <div className="lp-bays">
        {DEMO_BAYS.split('').map((s, i) => (
          <span key={i} className={`lp-bay ${BAY_CLASS[s]} ${i === 13 ? 'mine' : ''}`}>
            {String.fromCharCode(65 + Math.floor(i / 10))}{(i % 10) + 1}
          </span>
        ))}
      </div>
    </div>
    <div className="lp-ticket">
      <div className="lp-ticket-top">
        <span className="lp-ticket-label">Parking pass</span>
        <span className="lp-ticket-slot">B4</span>
      </div>
      <div className="lp-ticket-qr">
        {qr && <img src={qr} alt="" width="120" height="120" />}
      </div>
      <div className="lp-ticket-rows">
        <div><span>Vehicle</span><span className="plate">TS09 AB 1234</span></div>
        <div><span>Pass</span><span className="mono">{DEMO_PASS}</span></div>
        <div><span>Valid until</span><span className="mono">18:30</span></div>
      </div>
    </div>
  </div>
  );
};

const LandingPage = () => {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const [lots, setLots] = useState(null);
  const [ownerFee, setOwnerFee] = useState(null);

  useEffect(() => {
    lotService.getAllLots().then((res) => setLots(res.lots || [])).catch(() => setLots([]));
    authService.getAdminRegistrationConfig().then((r) => setOwnerFee(r.fee)).catch(() => {});
  }, []);

  const stats = lots && lots.length > 0 ? {
    lots: lots.length,
    bays: lots.reduce((n, l) => n + (Number(l.total_slots) || 0), 0),
    free: lots.reduce((n, l) => n + (Number(l.available_slots) || 0), 0)
  } : null;

  const shownLots = (lots || []).slice().sort((a, b) => (b.available_slots || 0) - (a.available_slots || 0)).slice(0, 6);

  const signOut = async () => {
    if (await confirm({ title: 'Sign out?', message: 'You will need to sign in again to use your account.', confirmLabel: 'Sign out' })) logout('/');
  };

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-brand" aria-label="Smart Parking Management System, home">
            <span className="brand-logo-icon" aria-hidden="true"><i className="fa-solid fa-car"></i></span>
            <span className="brand-name">
              <span className="brand-full">Smart Parking Management System</span>
              <span className="brand-short" aria-hidden="true">SPMS</span>
            </span>
          </Link>
          <ul className="lp-nav-links">
            <li><a href="#how">How it works</a></li>
            <li><a href="#lots">Lots</a></li>
            <li><a href="#owners">For lot owners</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="lp-nav-actions">
            <ThemeToggle />
            {user ? (
              <>
                <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
                <Link to={homeForRole(user.role)} className="btn btn-primary">Open app</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                <Link to="/register" className="btn btn-primary">Get started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div>
            {stats && (
              <div className="lp-eyebrow">
                <span className="lp-live-dot" aria-hidden="true"></span>
                <span><strong>{stats.free}</strong> bays free right now across {stats.lots} lots</span>
              </div>
            )}
            <h1 className="lp-title">Know you have a space before you leave home.</h1>
            <p className="lp-lead">
              SPMS shows which parking slots are free right now, lets you hold one with a small reservation fee,
              and gets you through the gate with a QR pass. You pay for the time you actually park.
            </p>
            <div className="lp-cta">
              {user ? (
                <Link to={homeForRole(user.role)} className="btn btn-primary btn-lg">Open the app</Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">Create a free account</Link>
                  <Link to="/login" className="btn btn-lg">Sign in</Link>
                </>
              )}
            </div>
            {stats && (
              <dl className="lp-stats">
                <div><dt>Lots</dt><dd>{stats.lots}</dd></div>
                <div><dt>Bays</dt><dd>{stats.bays}</dd></div>
                <div><dt>Free right now</dt><dd className="ok">{stats.free}</dd></div>
              </dl>
            )}
          </div>
          <HeroVisual />
        </div>
      </header>

      <section className="lp-section" id="how">
        <div className="lp-container">
          <h2 className="lp-h2">How it works</h2>
          <ol className="lp-steps">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="lp-step-num">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="lp-note">
            No booking? Drive up anyway. Gate staff can check you into any free slot as a walk-in, and you pay only for the time parked.
          </p>
        </div>
      </section>

      <section className="lp-section lp-section-alt" id="lots">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-h2">Free right now</h2>
            <Link to={user ? homeForRole(user.role) : '/login'} className="btn">See all lots</Link>
          </div>
          {lots === null ? (
            <p className="muted">Loading lots…</p>
          ) : shownLots.length === 0 ? (
            <p className="muted">No lots are listed yet.</p>
          ) : (
            <div className="lp-lots">
              {shownLots.map((lot) => (
                <div key={lot.id} className="lp-lot">
                  <div className="lp-lot-main">
                    <h3>{lot.name}</h3>
                    <p>{[lot.address, lotHoursLabel(lot)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="lp-lot-side">
                    <span className="lp-lot-free"><strong>{lot.available_slots ?? 0}</strong> / {lot.total_slots ?? 0} free</span>
                    <span className="mono">{lotPriceLabel(lot)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="lp-section" id="owners">
        <div className="lp-container lp-owner-grid">
          <div>
            <h2 className="lp-h2">Own a parking lot?</h2>
            <p className="lp-lead" style={{ fontSize: '1rem' }}>
              List it on SPMS and run it from one place: bookings at the gate, walk-ins, prices and staff.
              {ownerFee !== null && <> Registration is a one-time fee of <strong className="mono">₹{ownerFee}</strong>.</>}
            </p>
            <Link to="/register-owner" className="btn btn-primary btn-lg">Register your lot</Link>
          </div>
          <ul className="lp-points">
            {OWNER_POINTS.map((p) => (
              <li key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-section lp-section-alt" id="faq">
        <div className="lp-container lp-faq-wrap">
          <h2 className="lp-h2">Questions</h2>
          <div className="lp-faq">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta-band">
        <div className="lp-container">
          <h2>Stop circling the block.</h2>
          <p>Create an account, add your vehicle, and book your next bay in under a minute.</p>
          <div className="lp-cta">
            {user ? (
              <Link to={homeForRole(user.role)} className="btn btn-primary btn-lg">Open the app</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">Create a free account</Link>
                <Link to="/register-owner" className="btn btn-lg">Register your lot</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Link to="/" className="lp-brand">
            <span className="brand-logo-icon" aria-hidden="true"><i className="fa-solid fa-car"></i></span>
            <span>Smart Parking Management System</span>
          </Link>
          <nav className="lp-footer-links">
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
            <Link to="/register-owner">Register a lot</Link>
          </nav>
          <span className="dim">© {new Date().getFullYear()} SPMS</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
