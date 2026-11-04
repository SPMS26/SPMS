export const normalize = (v) => String(v || '').toUpperCase().replace(/[\s-]/g, '');

export const formatDuration = (from, to = null) => {
  if (!from) return '-';
  const end = to ? new Date(to).getTime() : Date.now();
  const mins = Math.max(1, Math.floor((end - new Date(from).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
};

// Running estimate only; the server computes the authoritative bill at checkout
export const estimateCharge = (item) => {
  if (!item.entry_time) return null;
  const mins = Math.max(1, Math.ceil((Date.now() - new Date(item.entry_time).getTime()) / 60000));
  return Math.max(1, Math.ceil(mins / 60)) * Number(item.hourly_price || 0);
};

// Matches by vehicle number, ticket / pass code, or user name (spaces, dashes and case ignored)
export const matchesQuery = (item, query) => {
  const q = normalize(query);
  if (!q) return true;
  return normalize(item.vehicleNo).includes(q)
    || normalize(item.bookingId).includes(q)
    || normalize(item.ticket_code).includes(q)
    || normalize(item.userName).includes(q);
};

export const formatTime = (t) => (t ? new Date(t).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-');
