import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const vehicleIcon = (v) => (v?.vehicle_type === 'two_wheeler' ? 'fa-motorcycle' : 'fa-car-side');
const vehicleKind = (v) => (v?.vehicle_type === 'two_wheeler' ? 'Two-wheeler' : 'Car');

const VehicleSelector = () => {
  const { vehicles, selectedVehicle, setSelectedVehicle } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Make sure a vehicle is selected when the user has any
  useEffect(() => {
    if (!selectedVehicle && vehicles && vehicles.length > 0) {
      setSelectedVehicle(vehicles.find((v) => v.is_default) || vehicles[0]);
    }
  }, [vehicles, selectedVehicle, setSelectedVehicle]);

  const goToProfile = () => {
    setOpen(false);
    navigate('/profile');
  };

  return (
    <div style={{ position: 'relative' }} ref={rootRef}>
      <div className="vehicle-selector-pill">
        <div className="car-icon"><i className={`fa-solid ${vehicleIcon(selectedVehicle)}`}></i></div>
        <div>
          <div className="dim" style={{ fontSize: '0.75rem' }}>Booking for</div>
          {selectedVehicle
            ? <span className="plate">{selectedVehicle.vehicle_number}</span>
            : <strong style={{ fontSize: '0.9rem' }}>No vehicle added</strong>}
        </div>
        <button
          className="change-btn"
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          Change <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }}></i>
        </button>
      </div>

      {open && (
        <div className="vehicle-dropdown-menu" role="listbox" aria-label="Choose a vehicle">
          <div className="vehicle-dropdown-header">
            <span className="vehicle-dropdown-title">Your vehicles</span>
          </div>

          <div className="vehicle-dropdown-list">
            {vehicles && vehicles.length > 0 ? (
              vehicles.map((v) => {
                const isSelected = selectedVehicle && selectedVehicle.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`vehicle-dropdown-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedVehicle(v);
                      setOpen(false);
                      toast.success(`Booking for ${v.vehicle_number}`);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <div className="car-icon"><i className={`fa-solid ${vehicleIcon(v)}`}></i></div>
                      <div>
                        <span className="plate">{v.vehicle_number}</span>
                        <div className="dim" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                          {[vehicleKind(v), v.vehicle_model].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    {isSelected && <i className="fa-solid fa-check" style={{ color: 'var(--accent)' }}></i>}
                  </button>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: '1rem 0.5rem' }}>
                <p style={{ marginBottom: '0.75rem' }}>You haven't added a vehicle yet.</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={goToProfile}>Add a vehicle</button>
              </div>
            )}
          </div>

          {vehicles && vehicles.length > 0 && (
            <div className="vehicle-dropdown-footer">
              <button type="button" onClick={goToProfile} className="vehicle-dropdown-footer-btn">
                Manage vehicles
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
