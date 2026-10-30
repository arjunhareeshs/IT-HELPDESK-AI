import React from 'react';
import { SeverityLevel } from '../../types/ticket';
import { Badge } from '../ui/Badge';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, HelpCircle } from 'lucide-react';

export const PriorityBadge: React.FC<{ priority: SeverityLevel }> = ({ priority }) => {
  const norm = (priority || 'unknown').toLowerCase() as SeverityLevel;

  switch (norm) {
    case 'critical':
      return (
        <Badge variant="critical">
          <AlertOctagon size={12} strokeWidth={2.5} />
          <span>Critical</span>
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="high">
          <AlertTriangle size={12} strokeWidth={2.5} />
          <span>High</span>
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="medium">
          <Info size={12} strokeWidth={2.5} />
          <span>Medium</span>
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="low">
          <CheckCircle2 size={12} strokeWidth={2} />
          <span>Low</span>
        </Badge>
      );
    case 'unknown':
    default:
      return (
        <Badge variant="unknown">
          <HelpCircle size={12} strokeWidth={2} />
          <span>Unknown</span>
        </Badge>
      );
  }
};
