import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/shared/AppHeader';
import { Sidebar } from '../components/shared/Sidebar';

export const ComplainantLayout: React.FC = () => {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-layout">
        <AppHeader />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
