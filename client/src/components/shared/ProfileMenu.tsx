import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react';

export const ProfileMenu: React.FC = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 13.5, color: 'var(--color-ink)' }}>{user.name}</span>
      <button
        onClick={() => logout()}
        className="btn btn-secondary btn-sm"
        style={{ padding: '3px 8px' }}
      >
        <LogOut size={14} />
        <span>Sign out</span>
      </button>
    </div>
  );
};
