import React from 'react';

export interface MetricCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext, icon, onClick }) => {
  return (
    <div
      className="metric-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="metric-header">
        <div className="metric-label">{label}</div>
        {icon && (
          <div className="feature-icon feature-icon-rose">
            {icon}
          </div>
        )}
      </div>
      <div className="metric-value">{value}</div>
      {subtext && <div className="metric-subtext">{subtext}</div>}
    </div>
  );
};
