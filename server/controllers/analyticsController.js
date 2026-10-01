import db from '../config/database.js';

// Format a month-over-month change; null when there is no previous-month baseline
const formatTrend = (current, previous) => {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
};

// Get Dashboard KPIs (Raw SQL)
export const getKPIs = async (req, res, next) => {
  try {
    const [totals, active, slots, revenue, bookingMonths, revenueMonths] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM bookings'),
      db.query("SELECT COUNT(*)::int AS count FROM bookings WHERE booking_status = 'active'"),
      db.query('SELECT COUNT(*)::int AS count FROM parking_slots WHERE is_active = true'),
      db.query("SELECT COALESCE(SUM(amount), 0)::float AS sum FROM payments WHERE payment_status = 'paid'"),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP))::int AS current,
           COUNT(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP - INTERVAL '1 month'))::int AS previous
         FROM bookings`
      ),
      db.query(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', paid_at) = date_trunc('month', CURRENT_TIMESTAMP)), 0)::float AS current,
           COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', paid_at) = date_trunc('month', CURRENT_TIMESTAMP - INTERVAL '1 month')), 0)::float AS previous
         FROM payments WHERE payment_status = 'paid'`
      )
    ]);

    res.status(200).json({
      success: true,
      kpis: {
        totalBookings: totals.rows[0].count,
        activeVehicles: active.rows[0].count,
        revenueGenerated: revenue.rows[0].sum,
        totalSlots: slots.rows[0].count,
        bookingTrendPct: formatTrend(bookingMonths.rows[0].current, bookingMonths.rows[0].previous),
        revenueTrendPct: formatTrend(revenueMonths.rows[0].current, revenueMonths.rows[0].previous)
      }
    });
  } catch (err) {
    next(err);
  }
};

// FR28: Month Wise History
export const getMonthlyHistory = async (req, res, next) => {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Query actual monthly bookings from bookings table
    const bookingRes = await db.query(
      `SELECT 
         EXTRACT(MONTH FROM created_at)::int AS month_num,
         COUNT(*)::int AS bookings
       FROM bookings
       GROUP BY month_num`
    );

    // Query actual monthly revenue from paid payments
    const revenueRes = await db.query(
      `SELECT 
         EXTRACT(MONTH FROM COALESCE(paid_at, CURRENT_TIMESTAMP))::int AS month_num,
         COALESCE(SUM(amount), 0)::float AS revenue
       FROM payments
       WHERE payment_status = 'paid'
       GROUP BY month_num`
    );

    const bookingMap = {};
    const revenueMap = {};
    for (let i = 1; i <= 12; i++) {
      bookingMap[i] = 0;
      revenueMap[i] = 0;
    }

    bookingRes.rows.forEach(r => {
      bookingMap[r.month_num] = r.bookings;
    });

    revenueRes.rows.forEach(r => {
      revenueMap[r.month_num] = r.revenue;
    });

    const monthlyData = months.map((m, idx) => {
      const mNum = idx + 1;
      return {
        month: m,
        bookings: bookingMap[mNum] || 0,
        revenue: revenueMap[mNum] || 0
      };
    });

    const bookingsData = monthlyData.map(d => d.bookings);
    const revenueData = monthlyData.map(d => d.revenue);
    const totalBookingsYear = monthlyData.reduce((acc, d) => acc + d.bookings, 0);
    const totalRevenueYear = monthlyData.reduce((acc, d) => acc + d.revenue, 0);

    res.status(200).json({
      success: true,
      monthlyData,
      months,
      bookingsData,
      revenueData,
      totalBookingsYear,
      totalRevenueYear
    });
  } catch (err) {
    next(err);
  }
};

// FR28: Peak Times Heatmap Data
export const getPeakTimes = async (req, res, next) => {
  try {
    const times = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // 6 time buckets x 7 days matrix initialized to 0
    const matrix = Array.from({ length: 6 }, () => Array(7).fill(0));

    // Calculate actual counts by day of week (1=Mon, 7=Sun) and hour (0-23)
    const peakRes = await db.query(
      `SELECT 
         EXTRACT(ISODOW FROM COALESCE(entry_time, booking_start, created_at))::int AS day_of_week,
         EXTRACT(HOUR FROM COALESCE(entry_time, booking_start, created_at))::int AS hour_of_day,
         COUNT(*)::int AS count
       FROM bookings
       GROUP BY day_of_week, hour_of_day`
    );

    peakRes.rows.forEach(r => {
      const dayIdx = r.day_of_week - 1; // 1-7 -> 0-6 (Mon-Sun)
      const timeIdx = Math.min(Math.floor(r.hour_of_day / 4), 5); // 0-23 -> 0-5
      if (dayIdx >= 0 && dayIdx < 7 && timeIdx >= 0 && timeIdx < 6) {
        matrix[timeIdx][dayIdx] += r.count;
      }
    });

    res.status(200).json({
      success: true,
      times,
      days,
      matrix
    });
  } catch (err) {
    next(err);
  }
};

// FR28: Day Wise Revenue Data
export const getDayWiseRevenue = async (req, res, next) => {
  try {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyValues = Array(daysInMonth).fill(0);

    const dailyRes = await db.query(
      `SELECT 
         EXTRACT(DAY FROM COALESCE(paid_at, CURRENT_TIMESTAMP))::int AS day_num,
         COALESCE(SUM(amount), 0)::float AS revenue
       FROM payments
       WHERE payment_status = 'paid'
         AND EXTRACT(MONTH FROM COALESCE(paid_at, CURRENT_TIMESTAMP)) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
         AND EXTRACT(YEAR FROM COALESCE(paid_at, CURRENT_TIMESTAMP)) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
       GROUP BY day_num`
    );

    dailyRes.rows.forEach(r => {
      if (r.day_num >= 1 && r.day_num <= daysInMonth) {
        dailyValues[r.day_num - 1] = r.revenue;
      }
    });

    const totalRevenueMonth = dailyValues.reduce((acc, val) => acc + val, 0);
    const averagePerDay = daysInMonth > 0 ? parseFloat((totalRevenueMonth / daysInMonth).toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      dailyValues,
      totalRevenueMonth,
      averagePerDay
    });
  } catch (err) {
    next(err);
  }
};
