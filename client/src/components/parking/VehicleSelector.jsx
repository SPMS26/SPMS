import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const VehicleSelector = () => {
  const { vehicles, selectedVehicle, setSelectedVehicle } = useAuth();
  const navigate = useNavigate();
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const vehicleDropdownRef = useRef(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target)) {
        setShowVehicleDropdown(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowVehicleDropdown(false);
    };

    if (showVehicleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showVehicleDropdown]);

  // Ensure an active vehicle is selected if available
  useEffect(() => {
    if (!selectedVehicle && vehicles && vehicles.length > 0) {
      const def = vehicles.find(v => v.is_default) || vehicles[0];
      setSelectedVehicle(def);
    }
  }, [vehicles, selectedVehicle, setSelectedVehicle]);

  return (
    <div style={{ position: 'relative' }} ref={vehicleDropdownRef}>
      <div
        className="vehicle-selector-pill"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setShowVehicleDropdown(prev => !prev)}
        title="Click to select vehicle"
      >
        <div className="car-icon">
          <i className={`fa-solid ${selectedVehicle?.vehicle_type === 'two_wheeler' ? 'fa-motorcycle' : 'fa-car-side'}`}></i>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {selectedVehicle?.vehicle_type === 'two_wheeler' ? '2-Wheeler' : selectedVehicle ? '4-Wheeler' : 'Current Vehicle'}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            {selectedVehicle ? selectedVehicle.vehicle_number : 'No Vehicle Added'}
          </div>
        </div>
        <button
          className="change-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowVehicleDropdown(prev => !prev);
          }}
          aria-expanded={showVehicleDropdown}
          aria-haspopup="listbox"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: 'pointer'
          }}
        >
          <span>Change</span>
          <i
            className={`fa-solid fa-chevron-${showVehicleDropdown ? 'up' : 'down'}`}
            style={{ fontSize: '0.65rem', opacity: 0.8 }}
          ></i>
        </button>
      </div>

      {showVehicleDropdown && (
        <div
          className="vehicle-dropdown-menu"
          role="listbox"
          aria-label="Select Vehicle"
        >
          <div className="vehicle-dropdown-header">
            <span className="vehicle-dropdown-title">
              Select Vehicle
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>
              {vehicles && vehicles.length > 0 ? `${vehicles.length} available` : '0 registered'}
            </span>
          </div>

          <div className="vehicle-dropdown-list">
            {vehicles && vehicles.length > 0 ? (
              vehicles.map(v => {
                const isSelected = selectedVehicle && selectedVehicle.id === v.id;
                const isTwoWheeler = v.vehicle_type === 'two_wheeler';
                const typeLabel = isTwoWheeler ? '2-Wheeler (Motorcycle)' : '4-Wheeler (Car)';
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`vehicle-dropdown-item ${isSelected ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicle(v);
                      setShowVehicleDropdown(false);
                      toast.success(`Active vehicle: ${v.vehicle_number}`);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isSelected ? 'var(--accent-gold-bg)' : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? 'var(--accent-gold)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}>
                        <i className={`fa-solid ${isTwoWheeler ? 'fa-motorcycle' : 'fa-car'}`}></i>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: isSelected ? 'var(--accent-gold)' : 'var(--text-main)',
                          letterSpacing: '0.02em'
                        }}>
                          {v.vehicle_number}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {typeLabel} {v.vehicle_model ? `• ${v.vehicle_model}` : ''}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}></i>
                    )}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <p style={{ margin: '0 0 0.5rem' }}>No vehicles registered yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowVehicleDropdown(false);
                    navigate('/profile');
                  }}
                  className="change-btn"
                  style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                >
                  Add Vehicle in Profile
                </button>
              </div>
            )}
          </div>

          {vehicles && vehicles.length > 0 && (
            <div className="vehicle-dropdown-footer">
              <button
                type="button"
                onClick={() => {
                  setShowVehicleDropdown(false);
                  navigate('/profile');
                }}
                className="vehicle-dropdown-footer-btn"
              >
                <i className="fa-solid fa-gear" style={{ fontSize: '0.7rem' }}></i>
                <span>Manage in Profile</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
