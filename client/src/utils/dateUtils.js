/**
 * Format a Date or date string to DD/MM/YYYY
 * @param {Date|string|number} t
 * @returns {string}
 */
export const formatDate = (t) => {
  if (!t) return '-';
  const d = new Date(t);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format a Date or date string to DD/MM/YYYY, hh:mm A
 * @param {Date|string|number} t
 * @returns {string}
 */
export const formatDateTime = (t) => {
  if (!t) return '-';
  const d = new Date(t);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day}/${month}/${year}, ${time}`;
};
