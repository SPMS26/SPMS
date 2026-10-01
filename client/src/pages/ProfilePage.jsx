import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, vehicles, setVehicles, setSelectedVehicle } = useAuth();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [editData, setEditData] = useState({
    phone: '',
    email: ''
  });
  const [vehData, setVehData] = useState({
    vehicle_number: '',
    vehicle_type: 'four_wheeler',
    vehicle_model: '',
    vehicle_color: ''
  });

  useEffect(() => {
    if (user) {
      setEditData({
        phone: user.phone || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await api.put('/users/profile', {
        phone: editData.phone,
        email: editData.email
      });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleSavePassword = async (e) => {
    e?.preventDefault();
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please enter both password fields.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/users/password', {
        password: passwordData.newPassword
      });
      toast.success('Password updated successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setIsEditingPassword(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

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

  const handleSetDefault = async (v) => {
    try {
      await api.put(`/users/vehicles/${v.id}/default`);
      if (setVehicles) {
        setVehicles(prev => prev.map(veh => ({
          ...veh,
          is_default: veh.id === v.id
        })));
      }
      setSelectedVehicle({ ...v, is_default: true });
      toast.success(`${v.vehicle_number} set as default!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set default vehicle.');
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* User Identity Card */}
        <div>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
            User Identity Card
          </h3>

          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
              <img
                src={user && user.profile_image ? user.profile_image : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=d97706&color=fff&bold=true`}
                alt="Avatar"
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--accent-gold)', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: '220px' }}>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {user ? user.full_name : 'User'}
                </h3>

                {!isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div
                      onClick={() => setIsEditing(true)}
                      title="Click to edit email"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}
                    >
                      <i className="fa-regular fa-envelope" style={{ fontSize: '0.85rem' }}></i>
                      <span>{user && user.email ? user.email : 'Click to add email'}</span>
                      <i className="fa-solid fa-pen" style={{ fontSize: '0.7rem', opacity: 0.6 }}></i>
                    </div>
                    <div
                      onClick={() => setIsEditing(true)}
                      title="Click to edit phone"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}
                    >
                      <i className="fa-solid fa-phone" style={{ fontSize: '0.85rem' }}></i>
                      <span>{user && user.phone ? user.phone : 'Click to add phone number'}</span>
                      <i className="fa-solid fa-pen" style={{ fontSize: '0.7rem', opacity: 0.6 }}></i>
                    </div>
                    <div
                      onClick={() => {
                        setIsEditingPassword(prev => !prev);
                        if (isEditing) setIsEditing(false);
                      }}
                      title={isEditingPassword ? "Click to close password form" : "Click to edit password"}
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontSize: '0.88rem', marginTop: '0.2rem', fontWeight: 500 }}
                    >
                      <i className={`fa-solid ${isEditingPassword ? 'fa-lock-open' : 'fa-key'}`} style={{ fontSize: '0.85rem' }}></i>
                      <span>{isEditingPassword ? 'Close Password Form' : 'Edit Password'}</span>
                      <i className={`fa-solid ${isEditingPassword ? 'fa-xmark' : 'fa-pen'}`} style={{ fontSize: '0.7rem', opacity: 0.7 }}></i>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Email</label>
                      <input
                        type="email"
                        className="search-input"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        placeholder="Enter email"
                        style={{ padding: '0.45rem 0.75rem', width: '100%', maxWidth: '340px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Phone</label>
                      <input
                        type="text"
                        className="search-input"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        placeholder="Enter phone number"
                        style={{ padding: '0.45rem 0.75rem', width: '100%', maxWidth: '340px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        className="change-btn"
                        style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }}
                        onClick={handleSaveProfile}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="change-btn"
                        onClick={() => {
                          setIsEditing(false);
                          setEditData({ phone: user?.phone || '', email: user?.email || '' });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Password Form (collapsible) */}
            {isEditingPassword && (
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  width: '100%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}></i>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Change Password
                  </h4>
                </div>

                <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '420px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="search-input"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Enter new password (min. 6 characters)"
                        style={{ padding: '0.5rem 2.4rem 0.5rem 0.75rem', width: '100%', boxSizing: 'border-box' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="search-input"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        style={{
                          padding: '0.5rem 2.4rem 0.5rem 0.75rem',
                          width: '100%',
                          boxSizing: 'border-box',
                          borderColor:
                            passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                              ? 'var(--status-occupied)'
                              : passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword
                              ? 'var(--status-available)'
                              : undefined
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {passwordData.confirmPassword && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {passwordData.newPassword === passwordData.confirmPassword ? (
                          <span style={{ color: 'var(--status-available)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <i className="fa-solid fa-circle-check"></i> Passwords match
                          </span>
                        ) : (
                          <span style={{ color: 'var(--status-occupied)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <i className="fa-solid fa-circle-xmark"></i> Passwords do not match
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="submit"
                      className="change-btn"
                      disabled={savingPassword}
                      style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }}
                    >
                      {savingPassword ? 'Saving...' : 'Save Password'}
                    </button>
                    <button
                      type="button"
                      className="change-btn"
                      onClick={() => {
                        setIsEditingPassword(false);
                        setPasswordData({ newPassword: '', confirmPassword: '' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Registered Vehicles Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Registered Vehicles
            </h3>
          </div>

          {vehicles.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '14px' }}>
              <i className="fa-solid fa-car-side" style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
              <p style={{ margin: 0 }}>No vehicles registered yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {vehicles.map(v => (
                <div
                  key={v.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-gold)',
                        fontSize: '1.1rem',
                        flexShrink: 0
                      }}
                    >
                      <i className={`fa-solid ${v.vehicle_type === 'two_wheeler' ? 'fa-motorcycle' : 'fa-car'}`}></i>
                    </div>
                    <div style={{ minWidth: '120px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plate</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{v.vehicle_number}</div>
                    </div>
                    <div style={{ minWidth: '130px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Model</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{v.vehicle_model || 'Standard'}</div>
                    </div>
                    <div style={{ minWidth: '110px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Color tag</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {v.vehicle_color ? (
                          <>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'inline-block' }}></span>
                            {v.vehicle_color}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {v.is_default ? (
                      <span
                        style={{
                          background: 'rgba(217, 119, 6, 0.15)',
                          color: 'var(--accent-gold)',
                          border: '1px solid var(--accent-gold)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '92px',
                          boxSizing: 'border-box'
                        }}
                      >
                        ✓ Default
                      </span>
                    ) : (
                      <button
                        className="change-btn"
                        style={{ minWidth: '92px', textAlign: 'center' }}
                        onClick={() => handleSetDefault(v)}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      className="change-btn"
                      style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--status-occupied)', minWidth: '80px' }}
                      onClick={() => handleDeleteVehicle(v.id)}
                    >
                      <i className="fa-solid fa-trash"></i> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Vehicle Button (clean previous button style, NOT golden) */}
          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="change-btn"
              onClick={() => setShowAddVehicle(!showAddVehicle)}
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.92rem', fontWeight: 600 }}
            >
              <i className="fa-solid fa-plus"></i> Add Vehicle
            </button>
          </div>

          {showAddVehicle && (
            <form
              onSubmit={handleAddVehicle}
              style={{
                background: 'var(--bg-card)',
                padding: '1.25rem',
                borderRadius: '14px',
                marginTop: '1rem',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.9rem', color: 'var(--accent-gold)' }}>Add New Vehicle</h4>
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
                  placeholder="Model (e.g. Tesla Model 3)"
                  className="search-input"
                  value={vehData.vehicle_model}
                  onChange={(e) => setVehData({ ...vehData, vehicle_model: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Color (e.g. Midnight Cherry Red)"
                  className="search-input"
                  value={vehData.vehicle_color}
                  onChange={(e) => setVehData({ ...vehData, vehicle_color: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="change-btn" onClick={() => setShowAddVehicle(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="change-btn"
                  style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }}
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
