import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { reportService } from '../services/reportService';
import toast from 'react-hot-toast';

const ReportIssuePage = () => {
  const [category, setCategory] = useState('Blocked Slot');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe the problem.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await reportService.submitReport(formData);
      toast.success('Incident Report submitted successfully!');
      setDescription('');
      setImageFile(null);
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'resolved') {
      return (
        <span style={{
          background: 'var(--status-available-bg)',
          color: 'var(--status-available)',
          border: '1px solid var(--status-available-border)',
          padding: '0.2rem 0.6rem',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          Resolved
        </span>
      );
    }
    if (s === 'investigating' || s === 'in_progress') {
      return (
        <span style={{
          background: 'var(--status-reserved-bg)',
          color: 'var(--status-reserved)',
          border: '1px solid var(--status-reserved-border)',
          padding: '0.2rem 0.6rem',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          Investigating
        </span>
      );
    }
    return (
      <span style={{
        background: 'rgba(154, 154, 159, 0.15)',
        color: 'var(--status-occupied)',
        border: '1px solid var(--status-occupied-border)',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 600,
        textTransform: 'uppercase'
      }}>
        Pending
      </span>
    );
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Page Header */}
        <div className="page-header-row" style={{ marginBottom: 0 }}>
          <div className="page-title-box">
            <h1>Report an Incident or Issue</h1>
            <p>Encountered a blocked slot, hardware fault, or payment discrepancy? Submit a report below.</p>
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

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Attach Photo Evidence (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                className="search-input"
                style={{ width: '100%', padding: '0.5rem 0.75rem', boxSizing: 'border-box' }}
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Supported formats: JPG, PNG, WEBP.
              </span>
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
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {r.description}
                  </p>

                  {r.image_url && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <a
                        href={r.image_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <i className="fa-solid fa-paperclip"></i> View Attached Photo
                      </a>
                    </div>
                  )}

                  {r.admin_response && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
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
