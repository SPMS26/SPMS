/**
 * Format a Date or date string to DD/MM/YYYY
 * @param {Date|string|number} t
 * @returns {string|null}
 */
export const formatDate = (t) => {
  if (!t) return null;
  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format a Date or date string to DD/MM/YYYY, hh:mm A
 * @param {Date|string|number} t
 * @returns {string|null}
 */
export const formatDateTime = (t) => {
  if (!t) return null;
  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}/${month}/${year}, ${time}`;
};
