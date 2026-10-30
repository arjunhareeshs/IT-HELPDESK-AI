import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '../components/shared/PriorityBadge';
import { StatusBadge } from '../components/shared/StatusBadge';
import { MetricCard } from '../components/shared/MetricCard';
import { getDefaultRouteForRole, isRoleAllowed } from '../utils/permissions';

describe('UI and Utility Components', () => {
  it('renders PriorityBadge with text and semantic accessible attributes', () => {
    render(<PriorityBadge priority="critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();

    render(<PriorityBadge priority="low" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders StatusBadge with correct status label', () => {
    render(<StatusBadge status="Awaiting verification" />);
    expect(screen.getByText('Awaiting Verification')).toBeInTheDocument();

    render(<StatusBadge status="Resolved" />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('renders MetricCard with label and value', () => {
    render(<MetricCard label="Active Tickets" value={42} subtext="Pending review" />);
    expect(screen.getByText('Active Tickets')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });

  it('routes correctly by role', () => {
    expect(getDefaultRouteForRole('admin')).toBe('/admin/dashboard');
    expect(getDefaultRouteForRole('complainant')).toBe('/complainant/my-complaints');
    expect(getDefaultRouteForRole('technician')).toBe('/technician/queue');
    expect(isRoleAllowed('admin', ['admin'])).toBe(true);
    expect(isRoleAllowed('complainant', ['admin'])).toBe(false);
  });
});
