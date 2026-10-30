import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { BellIcon, ShieldCheckIcon } from '../ui/Icons';
import { LogOut, User as UserIcon } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-mark">
          <ShieldCheckIcon width="16" height="16" />
        </div>
        <div>
          <span>Enterprise IT Helpdesk</span>
          <small>Service operations</small>
        </div>
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <button className="header-icon-btn" title="Notifications" aria-label="Notifications">
          <BellIcon width="16" height="16" />
          <span className="header-icon-badge" />
        </button>

        {user && (
          <div className="header-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div className="header-avatar" style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-blush, #EACDC2)', color: 'var(--color-plum, #372549)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <UserIcon size={16} />
            </div>
            <div className="header-user-copy" style={{ display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1 }}>
              <strong style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-on-light, #1A1423)', whiteSpace: 'nowrap' }}>
                {user.name}
              </strong>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(183, 93, 105, 0.12)',
                  color: 'var(--ui-rose, #B75D69)',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.role}
              </span>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out"
              className="header-icon-btn"
              aria-label="Sign out"
              style={{ marginLeft: '4px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
