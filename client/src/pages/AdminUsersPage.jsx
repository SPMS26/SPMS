import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      toast.error('Failed to load registered users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>User Management</h1>
          <p>View and manage all registered drivers and system administrators</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent-gold)' }}>
            <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Role</th>
                  <th>Registered Vehicles</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {u.full_name.charAt(0)}
                        </div>
                        <strong>{u.full_name}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone || 'N/A'}</td>
                    <td>
                      <span style={{
                        background: u.role === 'ADMIN' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                        color: u.role === 'ADMIN' ? 'var(--accent-emerald)' : 'var(--accent-gold)',
                        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.vehicles && u.vehicles.length > 0 ? (
                        u.vehicles.map(v => <span key={v.id} style={{ display: 'inline-block', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', margin: '0.1rem' }}>{v.vehicle_number}</span>)
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No vehicle</span>
                      )}
                    </td>
                    <td>
                      {u.is_verified ? (
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.8rem' }}>
                          <i className="fa-solid fa-check-circle"></i> Verified
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>Unverified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminUsersPage;
