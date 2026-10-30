import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  ShieldCheckIcon,
  TicketIcon,
  UsersIcon,
  BarChart3Icon,
} from '../ui/Icons';
import {
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  Briefcase,
  History,
  LogOut,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <aside className="app-sidebar">
      {/* Branding Header matching Image */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <ShieldCheckIcon width="20" height="20" color="#FFFFFF" />
        </div>
        <div className="sidebar-title">IT Helpdesk<small>Operations Portal</small></div>
      </div>

      <nav className="sidebar-nav">
        {user.role === 'admin' && (
          <>
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/admin/registry"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <TicketIcon width="18" height="18" />
              <span>Ticket registry</span>
            </NavLink>
            <NavLink
              to="/admin/new-complaint"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <PlusCircle size={18} />
              <span>Report Issue</span>
            </NavLink>
            <NavLink
              to="/admin/technicians"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <UsersIcon width="18" height="18" />
              <span>Technicians</span>
            </NavLink>
            <NavLink
              to="/admin/reports"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <BarChart3Icon width="18" height="18" />
              <span>Reports</span>
            </NavLink>
          </>
        )}

        {user.role === 'complainant' && (
          <>
            <NavLink
              to="/complainant/my-complaints"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ListOrdered size={18} />
              <span>My Complaints</span>
            </NavLink>
            <NavLink
              to="/complainant/new-complaint"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <PlusCircle size={18} />
              <span>Report Issue</span>
            </NavLink>
          </>
        )}

        {user.role === 'technician' && (
          <>
            <NavLink
              to="/technician/queue"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Briefcase size={18} />
              <span>Work Queue</span>
            </NavLink>
            <NavLink
              to="/technician/history"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <History size={18} />
              <span>History</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={() => logout()}
          className="sidebar-logout-btn"
          aria-label="Log out"
        >
          <LogOut size={17} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
