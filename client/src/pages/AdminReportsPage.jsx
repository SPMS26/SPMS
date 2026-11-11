import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { reportService } from '../services/reportService';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/common/ConfirmProvider';

const AdminReportsPage = () => {
  const confirm = useConfirm();
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
    const ok = await confirm(status === 'solved'
      ? { title: 'Mark this report as solved?', message: 'The user will see it as resolved.', confirmLabel: 'Mark solved' }
      : { title: 'Reopen this report?', message: 'The user will see it as open again.', confirmLabel: 'Reopen' });
    if (!ok) return;
    try {
      await reportService.updateStatus(id, status, status === 'solved' ? 'Resolved by the lot owner' : undefined);
      toast.success(status === 'solved' ? 'Report marked as solved.' : 'Report reopened.');
      fetchReports();
    } catch (err) {
      toast.error('Failed to update report status.');
    }
  };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Incident reports</h1>
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
                      {rep.status === 'solved'
                        ? <span className="badge badge-ok">Solved</span>
                        : <span className="badge badge-warn">Pending</span>}
                    </td>
                    <td>
                      {/* Only the move that makes sense from the current status */}
                      {rep.status === 'solved' ? (
                        <button className="change-btn" onClick={() => handleStatusChange(rep.id, 'pending')}>
                          Reopen
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(rep.id, 'solved')}>
                          Mark solved
                        </button>
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

export default AdminReportsPage;
