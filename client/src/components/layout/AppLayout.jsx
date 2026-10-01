import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useAuth } from '../../context/AuthContext';

const AppLayout = ({ children }) => {
  const { isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-layout ${!isAdmin ? 'user-layout' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {!isAdmin && sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${!isAdmin ? 'user-main-wrapper' : ''}`}>
        <TopHeader onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
