import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { adminService } from '../services/adminService';
import { lotService } from '../services/lotService';
import toast from 'react-hot-toast';

const labelStyle = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' };
const emptyForm = { full_name: '', email: '', password: '', phone: '', assigned_lot_id: '' };

const AdminSecurityPage = () => {
  const [staff, setStaff] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      const res = await adminService.createSecurity(form);
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

  const handleResetPassword = (member) => {
    const password = window.prompt(`Enter a new password for ${member.full_name} (min 6 characters):`);
    if (!password) return;
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    update(member.id, { password }, 'Password reset.');
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
                <label style={labelStyle}>Phone</label>
                <input className="search-input" style={{ width: '100%' }} name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div>
                <label style={labelStyle}>Assigned Lot</label>
                <select className="search-input" style={{ width: '100%' }} name="assigned_lot_id" value={form.assigned_lot_id} onChange={handleChange} required>
                  {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.25rem' }} disabled={saving}>
              <i className="fa-solid fa-user-plus"></i> {saving ? 'Creating...' : 'Create Security Account'}
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
                          onChange={(e) => update(m.id, { assigned_lot_id: e.target.value }, 'Lot assignment updated.')}
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
                            <i className="fa-solid fa-key"></i> Reset Password
                          </button>
                          <button
                            className="change-btn"
                            style={{
                              borderColor: m.is_active ? 'var(--status-occupied)' : 'var(--accent-emerald)',
                              color: m.is_active ? 'var(--status-occupied)' : 'var(--accent-emerald)'
                            }}
                            onClick={() => update(m.id, { is_active: !m.is_active }, m.is_active ? 'Account deactivated.' : 'Account activated.')}
                          >
                            {m.is_active ? 'Deactivate' : 'Activate'}
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
    </AppLayout>
  );
};

export default AdminSecurityPage;
