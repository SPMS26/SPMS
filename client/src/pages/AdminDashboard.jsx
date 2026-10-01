import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import KPICard from '../components/admin/KPICard';
import SlotGrid from '../components/parking/SlotGrid';
import SlotDetailsPanel from '../components/parking/SlotDetailsPanel';
import HeatmapGrid from '../components/admin/HeatmapGrid';
import AdminReserveModal from '../components/admin/AdminReserveModal';

import { analyticsService } from '../services/analyticsService';
import { adminService } from '../services/adminService';
import { lotService } from '../services/lotService';
import { qrService } from '../services/qrService';
import { reportService } from '../services/reportService';
import { useSocket } from '../context/SocketContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { socket } = useSocket();
  const [kpis, setKpis] = useState({
    totalBookings: '1,248',
    activeVehicles: '312',
    revenueGenerated: '₹ 2,48,760',
    totalSlots: '420'
  });

  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [activeFloor, setActiveFloor] = useState('B1');
  const [selectedAdminSlot, setSelectedAdminSlot] = useState(null);

  const [scanHistory, setScanHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [qrSelectOptions, setQrSelectOptions] = useState([]);
  const [selectedScanPass, setSelectedScanPass] = useState('');

  const [monthlyData, setMonthlyData] = useState([]);
  const [dailyRevenueData, setDailyRevenueData] = useState([]);
  const [peakTimesData, setPeakTimesData] = useState({ times: [], days: [], matrix: [] });
  const [showAdminReserveModal, setShowAdminReserveModal] = useState(false);

  const fetchKpis = async () => {
    try {
      const res = await analyticsService.getKPIs();
      setKpis({
        totalBookings: res.kpis.totalBookings.toLocaleString(),
        activeVehicles: res.kpis.activeVehicles.toLocaleString(),
        revenueGenerated: `₹ ${res.kpis.revenueGenerated.toLocaleString()}`,
        totalSlots: res.kpis.totalSlots.toString()
      });
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  const fetchLotsAndSlots = async () => {
    try {
      const res = await lotService.getAllLots();
      setLots(res.lots || []);
      if (res.lots && res.lots.length > 0) {
        const defaultLot = res.lots[0];
        setSelectedLot(defaultLot);
        const slotRes = await lotService.getSlotsByLot(defaultLot.id, activeFloor);
        setSlots(slotRes.slots || []);
        if (slotRes.slots && slotRes.slots.length > 0) {
          setSelectedAdminSlot(slotRes.slots.find(s => s.slot_number === 'C5') || slotRes.slots[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching lots and slots:', err);
    }
  };

  const fetchAdminTables = async () => {
    try {
      const scanRes = await adminService.getScanHistory();
      setScanHistory(scanRes.history || []);
      setQrSelectOptions(scanRes.history || []);

      const reportRes = await reportService.getReports();
      setReports(reportRes.reports || []);
    } catch (err) {
      console.error('Error fetching admin tables:', err);
    }
  };

  const fetchAnalyticsCharts = async () => {
    try {
      const monthRes = await analyticsService.getMonthlyHistory();
      if (monthRes.monthlyData) {
        setMonthlyData(monthRes.monthlyData);
      } else if (monthRes.months) {
        const formattedMonth = monthRes.months.map((m, idx) => ({
          month: m,
          bookings: monthRes.bookingsData ? monthRes.bookingsData[idx] : 0,
          revenue: monthRes.revenueData ? monthRes.revenueData[idx] : 0
        }));
        setMonthlyData(formattedMonth);
      }

      const peakRes = await analyticsService.getPeakTimes();
      if (peakRes && peakRes.matrix) {
        setPeakTimesData({
          times: peakRes.times || [],
          days: peakRes.days || [],
          matrix: peakRes.matrix || []
        });
      }

      const dayRes = await analyticsService.getDayWiseRevenue();
      if (dayRes.dailyValues) {
        const formattedDay = dayRes.dailyValues.map((val, idx) => ({
          day: idx + 1,
          revenue: val
        }));
        setDailyRevenueData(formattedDay);
      }
    } catch (err) {
      console.error('Error fetching analytics charts:', err);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchLotsAndSlots();
    fetchAdminTables();
    fetchAnalyticsCharts();
  }, []);

  useEffect(() => {
    if (selectedLot) {
      lotService.getSlotsByLot(selectedLot.id, activeFloor).then(res => setSlots(res.slots || []));
    }
  }, [selectedLot, activeFloor]);

  // Socket.io real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('slot:statusChanged', ({ slotId, status }) => {
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status } : s));
        fetchKpis();
        fetchAdminTables();
      });
    }
  }, [socket]);

  const handleAdminSlotAction = async (actionType) => {
    if (!selectedAdminSlot) return;

    if (actionType === 'reserve_override') {
      setShowAdminReserveModal(true);
      return;
    }

    try {
      await lotService.updateSlotStatus(selectedAdminSlot.id, actionType);
      toast.success(`Slot ${selectedAdminSlot.slot_number} marked as ${actionType.toUpperCase()}`);
      setSlots(prev => prev.map(s => s.id === selectedAdminSlot.id ? { ...s, status: actionType } : s));
      setSelectedAdminSlot(prev => ({ ...prev, status: actionType }));
      fetchKpis();
    } catch (err) {
      toast.error('Failed to update slot status.');
    }
  };

  const handleAdminReserveOverride = async (driverName, vehicleNo) => {
    try {
      await lotService.updateSlotStatus(selectedAdminSlot.id, 'reserved');
      toast.success(`Admin Override Reserved! Slot ${selectedAdminSlot.slot_number} reserved for ${driverName} (${vehicleNo})`);
      setSlots(prev => prev.map(s => s.id === selectedAdminSlot.id ? { ...s, status: 'reserved' } : s));
      setSelectedAdminSlot(prev => ({ ...prev, status: 'reserved' }));
      fetchKpis();
      fetchAdminTables();
    } catch (err) {
      toast.error('Failed to reserve override.');
    }
  };

  const handleAdminScanQR = async () => {
    if (!selectedScanPass) {
      toast.error('Please select a QR pass to scan.');
      return;
    }
    try {
      const res = await qrService.validateEntry(selectedScanPass);
      toast.success(`QR Code Verified!\nUser: ${res.user_name} | Slot: ${res.slot_number}\nStatus: ENTRY VALIDATED`);
      fetchAdminTables();
      fetchKpis();
      fetchLotsAndSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'QR validation failed.');
    }
  };

  const handleReportStatusChange = async (reportId, newStatus) => {
    try {
      await reportService.updateStatus(reportId, newStatus, 'Resolved by Admin');
      toast.success(`Report status updated to ${newStatus.toUpperCase()}`);
      fetchAdminTables();
    } catch (err) {
      toast.error('Failed to update report status.');
    }
  };

  return (
    <AppLayout>
      {/* Page Title & Date Filter */}
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Dashboard</h1>
          <p>Overview of parking system, slot maintenance & incident reports</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <i className="fa-regular fa-calendar"></i>
          <span>May 01 - May 31, 2025</span>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}></i>
        </div>
      </div>

      {/* KPI Row */}
      <div className="admin-kpi-grid">
        <KPICard title="Total Bookings" value={kpis.totalBookings} trend="18.6%" iconClass="fa-calendar-check" colorClass="kpi-icon-gold" sparklinePoints={[12, 18, 15, 24, 20, 28, 35, 30, 42]} />
        <KPICard title="Active Vehicles" value={kpis.activeVehicles} trend="14.2%" iconClass="fa-car" colorClass="kpi-icon-green" sparklinePoints={[8, 14, 12, 18, 22, 19, 25, 29, 31]} />
        <KPICard title="Revenue Generated" value={kpis.revenueGenerated} trend="22.4%" iconClass="fa-indian-rupee-sign" colorClass="kpi-icon-purple" sparklinePoints={[10, 15, 22, 19, 28, 34, 30, 42, 50]} />
        <KPICard title="Total Slots" value={kpis.totalSlots} trend="" iconClass="fa-parking" colorClass="kpi-icon-orange" sparklinePoints={[30, 30, 30, 30, 30, 30, 30, 30, 30]} />
      </div>

      {/* Section: Admin Interactive Parking Slot Grid */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="section-subtitle">
          <span><i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-gold)' }}></i> Admin Interactive Slot Grid & Advanced Maintenance Control</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click any slot to mark Maintenance or Override Booking</span>
        </div>

        <div className="slot-booking-layout">
          <SlotGrid
            slots={slots}
            selectedSlot={selectedAdminSlot}
            activeFloor={activeFloor}
            onFloorChange={(f) => setActiveFloor(f)}
            onSlotClick={(s) => setSelectedAdminSlot(s)}
          />

          <SlotDetailsPanel
            selectedSlot={selectedAdminSlot}
            activeFloor={activeFloor}
            isAdmin={true}
            onAdminAction={handleAdminSlotAction}
          />
        </div>
      </div>

      {/* Section: Admin QR Code Scanner & Barrier Control Hub */}
      <div className="card" style={{ marginBottom: '1.75rem', background: 'linear-gradient(135deg, rgba(22, 28, 43, 0.95), rgba(19, 24, 38, 0.95))', border: '1px solid var(--border-bright)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-qrcode" style={{ color: 'var(--accent-gold)' }}></i>
              Automated Optical QR Scanner & Barrier Terminal Hub
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Optical video camera scanning • Instant HMAC security validation • Automated barrier control (Req-7, Req-8)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fa-solid fa-circle" style={{ fontSize: '0.55rem' }}></i> Optical Engine Ready
            </span>
            <a
              href="/admin/scanner"
              className="btn-select-slot"
              style={{
                marginTop: 0,
                textDecoration: 'none',
                padding: '0.55rem 1.25rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              <i className="fa-solid fa-camera"></i> Open Fullscreen Camera Scanner
            </a>
          </div>
        </div>

        {/* 2-Column Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          
          {/* Box 1: Quick Pass / Barcode / Vehicle Search */}
          <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <i className="fa-solid fa-barcode" style={{ color: 'var(--accent-gold)' }}></i>
                Quick Manual / Barcode Gun Pass Verification:
              </label>

              <select
                className="search-input"
                style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.75rem' }}
                value={selectedScanPass}
                onChange={(e) => setSelectedScanPass(e.target.value)}
              >
                <option value="">-- Choose Registered Active Vehicle Pass --</option>
                {qrSelectOptions.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bookingId} | {b.userName} ({b.vehicleNo}) - Slot {b.slotCode}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-select-slot"
                style={{ marginTop: 0, flex: 1, padding: '0.65rem 1rem', background: 'var(--accent-emerald)', fontSize: '0.82rem' }}
                onClick={handleAdminScanQR}
                disabled={!selectedScanPass}
              >
                <i className="fa-solid fa-shield-check"></i> Validate & Trigger Barrier
              </button>
            </div>
          </div>

          {/* Box 2: Gate Terminal Quick Launch & Status */}
          <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <i className="fa-solid fa-video" style={{ color: '#38bdf8' }}></i>
                Dedicated Optical Camera Gate Terminals:
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <a
                  href="/admin/scanner"
                  style={{
                    textDecoration: 'none',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    textAlign: 'center',
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'block'
                  }}
                >
                  <i className="fa-solid fa-arrow-down-to-bracket" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '0.25rem' }}></i>
                  Entrance Gate Terminal
                </a>

                <a
                  href="/admin/scanner"
                  style={{
                    textDecoration: 'none',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    textAlign: 'center',
                    color: '#38bdf8',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'block'
                  }}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '0.25rem' }}></i>
                  Exit Gate Terminal
                </a>
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Autonomous Gate Mode: <strong style={{ color: '#10b981' }}>Enabled</strong></span>
              <span>Audio Chime: <strong style={{ color: 'var(--accent-gold)' }}>Active</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* Section: Incident Reports Management */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--accent-gold)' }}></i> Incident Reports Management (FR26)
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manage user complaints & issues</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Submitted By</th>
                <th>Category</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No user incident reports found.</td>
                </tr>
              ) : (
                reports.map(rep => (
                  <tr key={rep.id}>
                    <td><strong style={{ color: 'var(--accent-gold)' }}>{rep.id.substring(0, 7).toUpperCase()}</strong></td>
                    <td>{rep.user ? rep.user.full_name : 'Mehanna Reddy'}</td>
                    <td><strong>{rep.incident_type}</strong></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '220px' }}>{rep.description}</td>
                    <td>
                      <span style={{
                        background: rep.status === 'solved' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                        color: rep.status === 'solved' ? 'var(--accent-emerald)' : 'var(--accent-gold)',
                        fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700
                      }}>
                        {rep.status}
                      </span>
                    </td>
                    <td>
                      <button className="change-btn" style={{ borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }} onClick={() => handleReportStatusChange(rep.id, 'solved')}>
                        Mark Solved
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section: Admin User Scanned History Table */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent-gold)' }}></i> User Booking & Scanned Entry History
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Real-time database sync</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>User Name</th>
                <th>Vehicle Number</th>
                <th>Slot & Lot Location</th>
                <th>Scan Timestamp</th>
                <th>Amount Paid</th>
                <th>Entry Status</th>
              </tr>
            </thead>
            <tbody>
              {scanHistory.map(log => (
                <tr key={log.id}>
                  <td><strong style={{ color: 'var(--accent-gold)' }}>{log.bookingId}</strong></td>
                  <td>{log.userName}</td>
                  <td><span style={{ fontWeight: 700, color: '#a5b4fc' }}>{log.vehicleNo}</span></td>
                  <td><strong>{log.slotCode}</strong> ({log.lotName})</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                  <td><span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{log.amountPaid}</span></td>
                  <td>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-available)', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      <i className="fa-solid fa-check-double"></i> {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.25rem' }}>
        {/* Chart 1: Month Wise History */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}><i className="fa-regular fa-calendar"></i> Month Wise History</h3>
            <select style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem' }}>
              <option>This Year</option>
            </select>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ background: '#161c28', borderColor: '#354360', borderRadius: '8px' }} />
                <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Peak Times Heatmap */}
        <div className="card">
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}><i className="fa-regular fa-clock"></i> Peak Times (This Month)</h3>
          <HeatmapGrid times={peakTimesData.times} days={peakTimesData.days} matrix={peakTimesData.matrix} />
        </div>

        {/* Chart 3: Day Wise Revenue */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}><i className="fa-solid fa-indian-rupee-sign"></i> Revenue (Day Wise)</h3>
            <select style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem' }}>
              <option>This Month</option>
            </select>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenueData}>
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ background: '#161c28', borderColor: '#354360', borderRadius: '8px' }} />
                <Bar dataKey="revenue" fill="#d97706" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <AdminReserveModal
        isOpen={showAdminReserveModal}
        onClose={() => setShowAdminReserveModal(false)}
        slot={selectedAdminSlot}
        onConfirmReserve={handleAdminReserveOverride}
      />
    </AppLayout>
  );
};

export default AdminDashboard;
