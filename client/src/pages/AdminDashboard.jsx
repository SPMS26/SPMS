import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import KPICard from '../components/admin/KPICard';
import SlotGrid, { sortFloors } from '../components/parking/SlotGrid';
import SlotDetailsPanel from '../components/parking/SlotDetailsPanel';
import LotMonitor from '../components/admin/LotMonitor';
import HeatmapGrid from '../components/admin/HeatmapGrid';

import { analyticsService } from '../services/analyticsService';
import { lotService } from '../services/lotService';
import { useSocket } from '../context/SocketContext';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/common/ConfirmProvider';
import { useTheme } from '../context/ThemeContext';

// Recharts draws SVG attributes, which can't read CSS variables, so the colours come from the theme here
const CHART_COLORS = {
  dark: { grid: '#24242A', axis: '#71717B', bar: '#2E64E0', line: '#5B93FF' },
  light: { grid: '#E2E0D9', axis: '#7D818B', bar: '#1E4ED8', line: '#1E4ED8' }
};

const AdminDashboard = () => {
  const chart = CHART_COLORS[useTheme().theme];
  const confirm = useConfirm();
  const { socket } = useSocket();
  const [kpis, setKpis] = useState({
    totalBookings: '—',
    activeVehicles: '—',
    revenueGenerated: '—',
    totalSlots: '—',
    bookingTrend: null,
    revenueTrend: null
  });

  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [activeFloor, setActiveFloor] = useState('');
  const [selectedAdminSlot, setSelectedAdminSlot] = useState(null);

  const [monthlyData, setMonthlyData] = useState([]);
  const [dailyRevenueData, setDailyRevenueData] = useState([]);
  const [peakTimesData, setPeakTimesData] = useState({ times: [], days: [], matrix: [] });

  const fetchKpis = async () => {
    try {
      const res = await analyticsService.getKPIs();
      setKpis({
        totalBookings: res.kpis.totalBookings.toLocaleString(),
        activeVehicles: res.kpis.activeVehicles.toLocaleString(),
        revenueGenerated: `₹ ${res.kpis.revenueGenerated.toLocaleString()}`,
        totalSlots: res.kpis.totalSlots.toString(),
        bookingTrend: res.kpis.bookingTrendPct,
        revenueTrend: res.kpis.revenueTrendPct
      });
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  const fetchLotsAndSlots = async () => {
    try {
      const res = await lotService.getMyLots();
      setLots(res.lots || []);
      if (res.lots && res.lots.length > 0) {
        setSelectedLot(res.lots[0]);
      }
    } catch (err) {
      console.error('Error fetching lots and slots:', err);
    }
  };

  // Refresh lot counts only, without changing the selected lot
  const refreshLots = async () => {
    try {
      const res = await lotService.getMyLots();
      setLots(res.lots || []);
    } catch (err) {
      console.error('Error refreshing lots:', err);
    }
  };

  const fetchAnalyticsCharts = async () => {
    try {
      const [monthRes, peakRes, dayRes] = await Promise.all([
        analyticsService.getMonthlyHistory(),
        analyticsService.getPeakTimes(),
        analyticsService.getDayWiseRevenue()
      ]);

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

      if (peakRes && peakRes.matrix) {
        setPeakTimesData({
          times: peakRes.times || [],
          days: peakRes.days || [],
          matrix: peakRes.matrix || []
        });
      }

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
    fetchAnalyticsCharts();
  }, []);

  // Default to the lot's first floor (floors come from the database)
  useEffect(() => {
    const floors = selectedLot ? sortFloors(selectedLot.floors) : [];
    if (floors.length > 0 && !floors.includes(activeFloor)) {
      setActiveFloor(floors[0]);
    }
  }, [selectedLot]);

  useEffect(() => {
    if (!selectedLot || !activeFloor) return;
    lotService.getSlotsByLot(selectedLot.id, activeFloor).then(res => {
      const floorSlots = res.slots || [];
      setSlots(floorSlots);
      setSelectedAdminSlot(prev => floorSlots.find(s => prev && s.id === prev.id) || floorSlots[0] || null);
    });
  }, [selectedLot, activeFloor]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!socket) return;
    const onSlotStatusChanged = ({ slotId, status }) => {
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status } : s));
    };
    socket.on('slot:statusChanged', onSlotStatusChanged);
    return () => socket.off('slot:statusChanged', onSlotStatusChanged);
  }, [socket]);

  // The figures come from the server, so only this owner's lots trigger a refresh
  useLiveRefresh(() => {
    fetchKpis();
    refreshLots();
  }, { groupMs: 1000, disconnectedPollMs: 15000, matches: (event) => lots.some((lot) => lot.id === event.lotId) });

  const handleAdminSlotAction = async (actionType) => {
    if (!selectedAdminSlot) return;

    if (selectedAdminSlot.status === 'occupied') {
      toast.error(actionType === 'maintenance'
        ? 'A vehicle is parked and cannot set to maintenance'
        : 'A vehicle is parked and cannot make it available');
      return;
    }

        const code = selectedAdminSlot.slot_number;
    const ok = await confirm(actionType === 'maintenance'
      ? { title: `Put slot ${code} under maintenance?`, message: 'Users will not be able to book it until you set it available again.', confirmLabel: 'Mark as Maintenance', danger: true }
      : { title: `Make slot ${code} available?`, message: 'Users will be able to book it straight away.', confirmLabel: 'Set Available' });
    if (!ok) return;

    try {
      await lotService.updateSlotStatus(selectedAdminSlot.id, actionType);
      toast.success(`Slot ${selectedAdminSlot.slot_number} marked as ${actionType.toUpperCase()}`);
      setSlots(prev => prev.map(s => s.id === selectedAdminSlot.id ? { ...s, status: actionType } : s));
      setSelectedAdminSlot(prev => ({ ...prev, status: actionType }));
      fetchKpis();
      refreshLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update slot status.');
    }
  };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Overview</h1>
        </div>
      </div>

      <LotMonitor lots={lots} selectedLotId={selectedLot?.id} onSelectLot={setSelectedLot} />

      {/* Slot maintenance */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="section-subtitle">
          <span><i className="fa-solid fa-wrench" style={{ color: 'var(--accent-gold)' }}></i> Slot Maintenance</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click a slot to mark it under maintenance or available</span>
        </div>

        <div className="slot-booking-layout">
          <SlotGrid
            slots={slots}
            floors={selectedLot ? selectedLot.floors : []}
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

      {/* KPI Row */}
      <div className="admin-kpi-grid">
        <KPICard title="Total Bookings" value={kpis.totalBookings} trend={kpis.bookingTrend} iconClass="fa-calendar-check" colorClass="kpi-icon-gold" />
        <KPICard title="Active Vehicles" value={kpis.activeVehicles} iconClass="fa-car" colorClass="kpi-icon-green" />
        <KPICard title="Revenue Generated" value={kpis.revenueGenerated} trend={kpis.revenueTrend} iconClass="fa-indian-rupee-sign" colorClass="kpi-icon-purple" />
        <KPICard title="Total Slots" value={kpis.totalSlots} iconClass="fa-parking" colorClass="kpi-icon-orange" />
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Chart 1: Month Wise History */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}><i className="fa-regular fa-calendar"></i> Month Wise History</h3>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={chart.axis} fontSize={10} />
                <YAxis yAxisId="bookings" stroke={chart.axis} fontSize={10} allowDecimals={false} />
                <YAxis yAxisId="revenue" orientation="right" stroke={chart.axis} fontSize={10} />
                <Tooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                <Bar yAxisId="bookings" dataKey="bookings" name="Bookings" fill={chart.bar} radius={[4, 4, 0, 0]} />
                <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue (INR)" stroke={chart.line} strokeWidth={2} dot={{ fill: chart.line }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Peak Times Heatmap */}
        <div className="card">
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}><i className="fa-regular fa-clock"></i> Peak Times</h3>
          <HeatmapGrid times={peakTimesData.times} days={peakTimesData.days} matrix={peakTimesData.matrix} />
        </div>

        {/* Chart 3: Day Wise Revenue */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}><i className="fa-solid fa-indian-rupee-sign"></i> Revenue (Day Wise)</h3>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenueData}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke={chart.axis} fontSize={10} />
                <YAxis stroke={chart.axis} fontSize={10} />
                <Tooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '8px' }} />
                <Bar dataKey="revenue" name="Revenue (INR)" fill={chart.bar} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </AppLayout>
  );
};

export default AdminDashboard;
