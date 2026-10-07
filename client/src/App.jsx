import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookingsPage from './pages/BookingsPage';
import ProfilePage from './pages/ProfilePage';
import ReportIssuePage from './pages/ReportIssuePage';
import QRScannerPage from './pages/QRScannerPage';
import AdminLotsPage from './pages/AdminLotsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminReportsPage from './pages/AdminReportsPage';
import NotFoundPage from './pages/NotFoundPage';
import LandingPage from './pages/LandingPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import AdminSecurityPage from './pages/AdminSecurityPage';
import GateDeskPage from './pages/GateDeskPage';
import GateParkedPage from './pages/GateParkedPage';
import GatePrebookedPage from './pages/GatePrebookedPage';
import GateLivePage from './pages/GateLivePage';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#111114',
                color: '#F2EFE8',
                border: '1px solid rgba(255, 255, 255, 0.16)'
              }
            }}
          />
          <Routes>
            {/* Landing & Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register-owner" element={<AdminRegisterPage />} />

            {/* User Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute roles={['USER']}><UserDashboard /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute roles={['USER']}><BookingsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/report-issue" element={<ProtectedRoute roles={['USER']}><ReportIssuePage /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute roles={['USER']}><ReportIssuePage /></ProtectedRoute>} />

            {/* Admin Protected Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/lots" element={<ProtectedRoute requireAdmin={true}><AdminLotsPage /></ProtectedRoute>} />
            <Route path="/admin/scanner" element={<ProtectedRoute roles={['SECURITY']}><QRScannerPage /></ProtectedRoute>} />
            <Route path="/admin/desk" element={<ProtectedRoute roles={['SECURITY']}><GateDeskPage /></ProtectedRoute>} />
            <Route path="/admin/parked" element={<ProtectedRoute roles={['SECURITY']}><GateParkedPage /></ProtectedRoute>} />
            <Route path="/admin/prebooked" element={<ProtectedRoute roles={['SECURITY']}><GatePrebookedPage /></ProtectedRoute>} />
            <Route path="/admin/live" element={<ProtectedRoute roles={['SECURITY']}><GateLivePage /></ProtectedRoute>} />
            <Route path="/admin/security" element={<ProtectedRoute requireAdmin={true}><AdminSecurityPage /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requireAdmin={true}><AdminReportsPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin={true}><AdminUsersPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
