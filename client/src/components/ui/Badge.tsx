import React from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'unknown' | 'success';
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'unknown', className, children }) => {
  return (
    <span className={clsx('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
};
