import React, { useState } from 'react';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

const ReportIssueModal = ({ isOpen, onClose, onSubmitSuccess }) => {
  const [category, setCategory] = useState('Blocked Slot');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please enter problem description.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await reportService.submitReport(formData);
      toast.success('Incident Report submitted successfully!');
      setDescription('');
      setImageFile(null);
      onClose();
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      toast.error('Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--accent-gold)' }}></i> Report Parking Incident
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Incident Category:
            </label>
            <select
              className="search-input"
              style={{ width: '100%' }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Blocked Slot">Blocked Parking Slot</option>
              <option value="Damaged Slot / Barrier">Damaged Slot / Barrier</option>
              <option value="Payment Failure">Payment / Fee Issue</option>
              <option value="QR Scanner Issue">QR Scanner / Gate Issue</option>
              <option value="Other Issue">Other Complaint</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Problem Details:
            </label>
            <textarea
              className="search-input"
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="Describe the issue encountered at the parking lot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Attach Photo Evidence (Optional - FR26):
            </label>
            <input
              type="file"
              accept="image/*"
              className="search-input"
              style={{ width: '100%', padding: '0.4rem' }}
              onChange={(e) => setImageFile(e.target.files[0])}
            />
          </div>

          <button type="submit" className="btn-select-slot" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Incident Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssueModal;
