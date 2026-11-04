import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-layout user-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar onClose={() => setSidebarOpen(false)} />
      <div className="main-wrapper user-main-wrapper">
        <TopHeader
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          sidebarOpen={sidebarOpen}
        />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
