import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { reportService } from '../services/reportService';
import { lotService } from '../services/lotService';
import { formatDateTime } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const ReportIssuePage = () => {
  const [category, setCategory] = useState('Blocked Slot');
  const [lots, setLots] = useState([]);
  const [lotId, setLotId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await reportService.getReports();
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load user reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
    lotService.getAllLots().then((res) => {
      setLots(res.lots || []);
      setLotId((res.lots || [])[0]?.id || '');
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe the problem.');
      return;
    }

    try {
      setSubmitting(true);
      await reportService.submitReport({ category, lot_id: lotId || undefined, description: description.trim() });
      toast.success('Report sent to the lot owner.');
      setDescription('');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  // Server statuses are 'pending' and 'solved'
  const getStatusBadge = (status) => (status === 'solved'
    ? <span className="badge badge-ok">Solved</span>
    : <span className="badge badge-warn">Pending</span>);

  return (
    <AppLayout>
      <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Page Header */}
        <div className="page-header-row" style={{ marginBottom: 0 }}>
          <div className="page-title-box">
            <h1>Report an issue</h1>
          </div>
        </div>

        {/* Submit Report Card */}
        <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--accent-gold-bg)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.15rem'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                New Incident Report
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Our operations and parking management team will review and resolve it promptly.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Parking Lot
              </label>
              <select
                className="search-input"
                style={{ width: '100%', padding: '0.6rem 0.85rem', boxSizing: 'border-box' }}
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                required
              >
                {lots.map((l) => <option key={l.id} value={l.id}>{l.name}{l.owner_name ? ` - ${l.owner_name}` : ''}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Incident Category
              </label>
              <select
                className="search-input"
                style={{ width: '100%', padding: '0.6rem 0.85rem', boxSizing: 'border-box' }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Blocked Slot">Blocked Parking Slot</option>
                <option value="Damaged Slot / Barrier">Damaged Slot / Barrier</option>
                <option value="Payment Failure">Payment / Fee Issue</option>
                <option value="QR Scanner Issue">QR Scanner / Gate Issue</option>
                <option value="Other Issue">Other Complaint / Feedback</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Problem Description
              </label>
              <textarea
                className="search-input"
                rows={4}
                style={{ width: '100%', padding: '0.65rem 0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
                placeholder="Describe the issue encountered at the parking lot (e.g. unauthorized car parked in your slot, barrier gate arm stuck, etc.)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="change-btn"
                disabled={submitting}
                style={{
                  background: 'var(--accent-gold-bg)',
                  color: 'var(--accent-gold)',
                  borderColor: 'var(--accent-gold)',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Submitting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i> Submit Incident Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Previous Reports Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>
              My Reported Incidents
            </h3>
            <button
              className="change-btn"
              onClick={fetchReports}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              <i className="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>

          {loadingReports ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-gold)' }}>
              <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
            </div>
          ) : reports.length === 0 ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '14px' }}>
              <i className="fa-solid fa-clipboard-check" style={{ fontSize: '2.25rem', marginBottom: '0.65rem', opacity: 0.5 }}></i>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No incident reports submitted yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {r.incident_type || r.category || 'Incident'}
                      </span>
                      {getStatusBadge(r.status)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDateTime(r.created_at)}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {r.description}
                  </p>

                  {r.admin_response && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: 'var(--surface-2)',
                      borderLeft: '3px solid var(--accent-gold)'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.2rem' }}>
                        Admin Response:
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                        {r.admin_response}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportIssuePage;
