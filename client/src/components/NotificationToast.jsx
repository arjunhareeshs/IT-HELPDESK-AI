import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function NotificationToast() {
  const { toastMessage } = useAuth();

  if (!toastMessage) return null;

  const { message, type } = toastMessage;

  const bgStyles = {
    success: { border: '#34A853', bg: '#E6F4EA', color: '#137333', icon: '✓' },
    error: { border: '#EA4335', bg: '#FCE8E6', color: '#C5221F', icon: '⚠' },
    info: { border: '#8E1EA2', bg: '#F6E8F8', color: '#7B198C', icon: 'ℹ' },
    warning: { border: '#FBBC05', bg: '#FEF7E0', color: '#B06000', icon: '⚡' }
  }[type] || { border: '#8E1EA2', bg: '#F6E8F8', color: '#7B198C', icon: 'ℹ' };

  return (
    <div
      className="global-toast-container"
      role="alert"
      aria-live="polite"
    >
      <div
        className="global-toast-card"
        style={{
          borderLeft: `4px solid ${bgStyles.border}`,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          color: '#1F1F1F'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: bgStyles.bg,
            color: bgStyles.color,
            fontSize: '12px',
            fontWeight: 'bold',
            flexShrink: 0
          }}
        >
          {bgStyles.icon}
        </span>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4 }}>
          {message}
        </div>
      </div>
    </div>
  );
}
