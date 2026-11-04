import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { adminService } from '../services/adminService';
import { lotService } from '../services/lotService';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/common/ConfirmProvider';

const labelStyle = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' };
const emptyForm = { full_name: '', email: '', password: '', phone: '', assigned_lot_id: '' };

const AdminSecurityPage = () => {
  const confirm = useConfirm();
  const [staff, setStaff] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const [staffRes, lotsRes] = await Promise.all([adminService.getSecurityStaff(), lotService.getMyLots()]);
      setStaff(staffRes.staff || []);
      const myLots = (lotsRes.lots || []).filter((l) => l.is_active);
      setLots(myLots);
      setForm((prev) => ({ ...prev, assigned_lot_id: prev.assigned_lot_id || myLots[0]?.id || '' }));
    } catch (err) {
      toast.error('Failed to load security staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();

    const trimmedPhone = form.phone.trim();
    if (!trimmedPhone) {
      toast.error('Phone number is required.');
      return;
    }

    // Client-side quick duplicate check against currently loaded staff
    const cleanPhone = trimmedPhone.replace(/[\s-]/g, '');
    const duplicatePhone = staff.some(
      (s) => s.phone && s.phone.replace(/[\s-]/g, '') === cleanPhone
    );
    if (duplicatePhone) {
      toast.error('A security staff member with this phone number already exists.');
      return;
    }

    setSaving(true);
    try {
      const res = await adminService.createSecurity({
        ...form,
        phone: trimmedPhone
      });
      toast.success(res.message);
      setForm({ ...emptyForm, assigned_lot_id: form.assigned_lot_id });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create security account.');
    } finally {
      setSaving(false);
    }
  };

  const update = async (id, payload, successMsg) => {
    try {
      await adminService.updateSecurity(id, payload);
      toast.success(successMsg);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

    const handleResetPassword = async (member) => {
    const password = await confirm({
      title: `Reset password for ${member.full_name}?`,
      message: 'Their current password stops working immediately.',
      input: { label: 'New password (min 6 characters)', type: 'password', minLength: 6 },
      confirmLabel: 'Reset Password',
      danger: true
    });
    if (password) update(member.id, { password }, 'Password reset.');
  };

  const handleToggleActive = async (member) => {
    const ok = await confirm(member.is_active
      ? { title: `Deactivate ${member.full_name}?`, message: 'They will be signed out and cannot log in until you activate the account again.', confirmLabel: 'Deactivate', danger: true }
      : { title: `Activate ${member.full_name}?`, message: 'They will be able to log in and run the gate for their assigned lot.', confirmLabel: 'Activate' });
    if (ok) update(member.id, { is_active: !member.is_active }, member.is_active ? 'Account deactivated.' : 'Account activated.');
  };

  const handleReassign = async (member, lotId) => {
    const lotName = lots.find((l) => l.id === lotId)?.name;
    const ok = await confirm({ title: `Move ${member.full_name} to ${lotName}?`, message: 'They will only be able to scan and check in vehicles for this lot from now on.', confirmLabel: 'Move Guard' });
    if (ok) update(member.id, { assigned_lot_id: lotId }, 'Lot assignment updated.');
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setDeleting(true);
    try {
      const res = await adminService.deleteSecurity(staffToDelete.id);
      toast.success(res.message || 'Security account deleted.');
      setStaffToDelete(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete security account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Security Staff</h1>
        </div>
      </div>

      {!loading && lots.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Create a parking lot first (Manage Lots & Slots), then add security staff for it.
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Add Security Account</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input className="search-input" style={{ width: '100%' }} name="full_name" value={form.full_name} onChange={handleChange} required />
              </div>
              <div>
                <label style={labelStyle}>Login Email</label>
                <input className="search-input" style={{ width: '100%' }} type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input className="search-input" style={{ width: '100%' }} type="text" name="password" minLength={6} value={form.password} onChange={handleChange} required />
              </div>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input
                  className="search-input"
                  style={{ width: '100%' }}
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Assigned Lot</label>
                <select className="search-input" style={{ width: '100%' }} name="assigned_lot_id" value={form.assigned_lot_id} onChange={handleChange} required>
                  {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.25rem' }} disabled={saving}>
              {saving ? 'Creating...' : 'Create Security Account'}
            </button>
          </form>

          <div className="card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Your Security Team ({staff.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Assigned Lot</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.full_name}</strong></td>
                      <td>{m.email}</td>
                      <td>{m.phone || '-'}</td>
                      <td>
                        <select
                          className="search-input"
                          value={m.assigned_lot_id || ''}
                          onChange={(e) => handleReassign(m, e.target.value)}
                        >
                          {!m.assigned_lot_id && <option value="">Unassigned</option>}
                          {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: m.is_active ? 'var(--accent-emerald)' : 'var(--status-occupied)' }}>
                          {m.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button className="change-btn" onClick={() => handleResetPassword(m)}>
                            Reset Password
                          </button>
                          <button
                            className="change-btn"
                            style={{
                              borderColor: m.is_active ? 'var(--status-occupied)' : 'var(--accent-emerald)',
                              color: m.is_active ? 'var(--status-occupied)' : 'var(--accent-emerald)'
                            }}
                            onClick={() => handleToggleActive(m)}
                          >
                            {m.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className="change-btn"
                            style={{
                              borderColor: '#EF4444',
                              color: '#EF4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                            onClick={() => setStaffToDelete(m)}
                            title="Delete this security account"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && staff.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No security accounts yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-box" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', margin: 0 }}>
                Delete Security Account
              </h3>
              <button
                className="modal-close"
                disabled={deleting}
                onClick={() => !deleting && setStaffToDelete(null)}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1rem 0 0.5rem 0' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                Do you wish to delete this account?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Account for <strong style={{ color: 'var(--text-main)' }}>{staffToDelete.full_name}</strong> (<span style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{staffToDelete.email}</span>) will be permanently deleted from your database.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="change-btn"
                  style={{
                    padding: '0.6rem 1.4rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    minWidth: '100px',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)'
                  }}
                  disabled={deleting}
                  onClick={() => setStaffToDelete(null)}
                >
                  No
                </button>
                <button
                  type="button"
                  className="btn-select-slot"
                  style={{
                    marginTop: 0,
                    width: 'auto',
                    padding: '0.6rem 1.4rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    minWidth: '100px',
                    background: '#EF4444',
                    borderColor: '#EF4444',
                    color: '#ffffff'
                  }}
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                >
                  {deleting ? (
                    <span><i className="fa-solid fa-spinner fa-spin"></i> Deleting...</span>
                  ) : (
                    <span>Yes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminSecurityPage;
