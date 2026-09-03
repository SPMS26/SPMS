import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, vehicles, setSelectedVehicle } = useAuth();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehData, setVehData] = useState({
    vehicle_number: '',
    vehicle_type: 'four_wheeler',
    vehicle_model: '',
    vehicle_color: ''
  });

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/vehicles', vehData);
      toast.success('Vehicle added successfully!');
      setShowAddVehicle(false);
      setVehData({ vehicle_number: '', vehicle_type: 'four_wheeler', vehicle_model: '', vehicle_color: '' });
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add vehicle.');
    }
  };

  const handleDeleteVehicle = async (id) => {
    try {
      await api.delete(`/users/vehicles/${id}`);
      toast.success('Vehicle removed.');
      window.location.reload();
    } catch (err) {
      toast.error('Failed to remove vehicle.');
    }
  };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Profile & Vehicles</h1>
          <p>Manage personal details and registered vehicles</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
        {/* User Card */}
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img
              src={user && user.profile_image ? user.profile_image : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'}
              alt="Avatar"
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
            />
            <h3 style={{ margin: '0.75rem 0 0.25rem 0' }}>{user ? user.full_name : 'Mehanna Reddy'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{user ? user.email : 'mehanna@spms.com'}</p>
            <span style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.5rem', display: 'inline-block' }}>
              Registered User
            </span>
          </div>

          <div className="details-row">
            <span className="key">Phone:</span>
            <span className="val">{user && user.phone ? user.phone : '+91 9123456789'}</span>
          </div>
          <div className="details-row">
            <span className="key">Status:</span>
            <span className="val" style={{ color: 'var(--accent-emerald)' }}>Verified Account</span>
          </div>
        </div>

        {/* Vehicles List Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Registered Vehicles</h3>
            <button className="change-btn" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }} onClick={() => setShowAddVehicle(!showAddVehicle)}>
              <i className="fa-solid fa-plus"></i> Add Vehicle
            </button>
          </div>

          {showAddVehicle && (
            <form onSubmit={handleAddVehicle} style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--accent-gold)' }}>Add New Vehicle</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Vehicle Reg No (e.g. TS09 AB 1234)"
                  className="search-input"
                  value={vehData.vehicle_number}
                  onChange={(e) => setVehData({ ...vehData, vehicle_number: e.target.value })}
                  required
                />
                <select
                  className="search-input"
                  value={vehData.vehicle_type}
                  onChange={(e) => setVehData({ ...vehData, vehicle_type: e.target.value })}
                >
                  <option value="four_wheeler">Car / Four Wheeler</option>
                  <option value="two_wheeler">Bike / Two Wheeler</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Model (e.g. Hyundai i20)"
                  className="search-input"
                  value={vehData.vehicle_model}
                  onChange={(e) => setVehData({ ...vehData, vehicle_model: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Color (e.g. White)"
                  className="search-input"
                  value={vehData.vehicle_color}
                  onChange={(e) => setVehData({ ...vehData, vehicle_color: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-select-slot" style={{ marginTop: 0, padding: '0.5rem' }}>Save Vehicle</button>
            </form>
          )}

          {vehicles.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No vehicles registered yet.</p>
          ) : (
            vehicles.map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="car-icon">
                    <i className="fa-solid fa-car-side"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{v.vehicle_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.vehicle_model || 'Standard Car'} ({v.vehicle_color || 'N/A'})</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="change-btn" onClick={() => setSelectedVehicle(v)}>Set Default</button>
                  <button className="change-btn" style={{ borderColor: 'var(--status-occupied)', color: 'var(--status-occupied)' }} onClick={() => handleDeleteVehicle(v.id)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
