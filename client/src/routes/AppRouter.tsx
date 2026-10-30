import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDefaultRouteForRole } from '../utils/permissions';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ComplainantLayout } from '../layouts/ComplainantLayout';
import { TechnicianLayout } from '../layouts/TechnicianLayout';

// Guard
import { ProtectedRoute } from './ProtectedRoute';

// Pages
import { LoginPage } from '../features/auth/pages/LoginPage';
import { DashboardPage } from '../features/admin/pages/DashboardPage';
import { RegistryPage } from '../features/admin/pages/RegistryPage';
import { TicketDetailPage } from '../features/admin/pages/TicketDetailPage';
import { TechniciansPage } from '../features/admin/pages/TechniciansPage';
import { ReportsPage } from '../features/admin/pages/ReportsPage';

import { NewComplaintPage } from '../features/complainant/pages/NewComplaintPage';
import { MyComplaintsPage } from '../features/complainant/pages/MyComplaintsPage';
import { ComplaintDetailPage } from '../features/complainant/pages/ComplaintDetailPage';

import { TechnicianQueuePage } from '../features/technician/pages/TechnicianQueuePage';
import { TechnicianWorkPage } from '../features/technician/pages/TechnicianWorkPage';
import { TechnicianHistoryPage } from '../features/technician/pages/TechnicianHistoryPage';

export const AppRouter: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            <Navigate to={getDefaultRouteForRole(user.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Auth route */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/registry" element={<RegistryPage />} />
          <Route path="/admin/new-complaint" element={<NewComplaintPage />} />
          <Route path="/admin/tickets/:ticketId" element={<TicketDetailPage />} />
          <Route path="/admin/technicians" element={<TechniciansPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Complainant routes */}
      <Route element={<ProtectedRoute allowedRoles={['complainant']} />}>
        <Route element={<ComplainantLayout />}>
          <Route path="/complainant/new-complaint" element={<NewComplaintPage />} />

          <Route path="/complainant/my-complaints" element={<MyComplaintsPage />} />
          <Route path="/complainant/tickets/:ticketId" element={<ComplaintDetailPage />} />
        </Route>
      </Route>

      {/* Technician routes */}
      <Route element={<ProtectedRoute allowedRoles={['technician']} />}>
        <Route element={<TechnicianLayout />}>
          <Route path="/technician/queue" element={<TechnicianQueuePage />} />
          <Route path="/technician/tickets/:ticketId" element={<TechnicianWorkPage />} />
          <Route path="/technician/history" element={<TechnicianHistoryPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
