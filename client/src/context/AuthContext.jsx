import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('spms_jwt_token');
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
          setVehicles(res.vehicles || []);
          if (res.vehicles && res.vehicles.length > 0) {
            const defaultVeh = res.vehicles.find(v => v.is_default) || res.vehicles[0];
            setSelectedVehicle(defaultVeh);
          }
        } catch (err) {
          console.error('Failed to restore auth session:', err);
          authService.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    setVehicles(res.vehicles || []);
    if (res.vehicles && res.vehicles.length > 0) {
      setSelectedVehicle(res.vehicles.find(v => v.is_default) || res.vehicles[0]);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    setUser(res.user);
    if (res.vehicle) {
      setVehicles([res.vehicle]);
      setSelectedVehicle(res.vehicle);
    }
    return res;
  };

    const logout = (redirectTo = '/login') => {
    authService.clearSession();
    setUser(null);
    setVehicles([]);
    setSelectedVehicle(null);
    navigate(redirectTo, { replace: true });
  };

  const isAdmin = !!user && user.role === 'ADMIN';
  const isSecurity = !!user && user.role === 'SECURITY';
  const isStaff = isAdmin || isSecurity;

  // Used by the payment flow, which logs the new owner in directly
  const loginWithSession = (sessionUser) => setUser(sessionUser);

  return (
    <AuthContext.Provider value={{
      user,
      vehicles,
      setVehicles,
      selectedVehicle,
      setSelectedVehicle,
      loading,
      login,
      register,
      logout,
      loginWithSession,
      isAdmin,
      isSecurity,
      isStaff
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
