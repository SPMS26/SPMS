import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { reportService } from '../services/reportService';
import toast from 'react-hot-toast';

const AdminReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await reportService.getReports();
      setReports(res.reports || []);
    } catch (err) {
      toast.error('Failed to load incident reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await reportService.updateStatus(id, status, 'Resolved by Admin');
      toast.success(`Report status updated to ${status.toUpperCase()}`);
      fetchReports();
    } catch (err) {
      toast.error('Failed to update report status.');
    }
  };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Incident Reports Management</h1>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent-gold)' }}>
            <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No incident reports submitted yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Submitted By</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Photo Evidence</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(rep => (
                  <tr key={rep.id}>
                    <td><strong style={{ color: 'var(--accent-gold)' }}>{rep.id.substring(0, 7).toUpperCase()}</strong></td>
                    <td>{rep.user ? rep.user.full_name : 'N/A'}</td>
                    <td><strong>{rep.incident_type}</strong></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '250px' }}>{rep.description}</td>
                    <td>
                      {rep.image_url ? (
                        <a href={rep.image_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)', fontSize: '0.78rem', textDecoration: 'none' }}>
                          <i className="fa-solid fa-image"></i> View Image
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        background: rep.status === 'solved' ? 'rgba(227, 204, 154, 0.18)' : 'rgba(217, 191, 140, 0.18)',
                        color: rep.status === 'solved' ? 'var(--accent-emerald)' : 'var(--accent-gold)',
                        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700
                      }}>
                        {rep.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="change-btn" style={{ borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }} onClick={() => handleStatusChange(rep.id, 'solved')}>
                          Mark Solved
                        </button>
                        <button className="change-btn" style={{ borderColor: 'var(--border-subtle)' }} onClick={() => handleStatusChange(rep.id, 'pending')}>
                          Pending
                        </button>
                      </div>
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

export default AdminReportsPage;
