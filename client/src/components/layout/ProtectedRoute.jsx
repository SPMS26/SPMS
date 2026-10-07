import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Landing page for each role after login / when a route is not permitted
export const homeForRole = (role) => {
  if (role === 'ADMIN') return '/admin';
  if (role === 'SECURITY') return '/admin/scanner';
  return '/dashboard';
};

// `roles` limits access to the listed roles; omit it for any signed-in user.
// `requireAdmin` is kept as shorthand for roles={['ADMIN']}.
const ProtectedRoute = ({ children, requireAdmin = false, roles = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--accent-gold)' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowed = requireAdmin ? ['ADMIN'] : roles;
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
