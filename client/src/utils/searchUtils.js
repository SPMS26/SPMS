export const normalize = (v) => String(v || '').toUpperCase().replace(/[\s-]/g, '');

// True when any field contains the query. Spaces, dashes and case are ignored, so MH02 finds MH-02-CP-9090.
export const matchesSearch = (query, fields) => {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((field) => normalize(field).includes(q));
};
