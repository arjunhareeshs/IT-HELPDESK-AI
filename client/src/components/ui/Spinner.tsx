import React from 'react';

export const Spinner: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return (
    <div
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '3px solid var(--border-subtle)',
        borderTopColor: 'var(--color-rose)',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }}
      role="status"
      aria-label="Loading"
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
