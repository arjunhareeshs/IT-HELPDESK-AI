import React from 'react';
import { TicketStatus } from '../../types/ticket';
import { Badge } from '../ui/Badge';
import { Clock, CheckCircle2, RotateCcw, Wrench, ShieldAlert, ArrowRightCircle } from 'lucide-react';

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  switch (status) {
    case 'Resolved':
    case 'Closed':
      return (
        <Badge variant="success">
          <CheckCircle2 size={12} strokeWidth={2} />
          <span>{status}</span>
        </Badge>
      );
    case 'Awaiting verification':
      return (
        <Badge variant="high">
          <Clock size={12} strokeWidth={2} />
          <span>Awaiting Verification</span>
        </Badge>
      );
    case 'Re-evaluation':
      return (
        <Badge variant="critical">
          <RotateCcw size={12} strokeWidth={2} />
          <span>Re-evaluation</span>
        </Badge>
      );
    case 'In progress':
      return (
        <Badge variant="medium">
          <Wrench size={12} strokeWidth={2} />
          <span>In Progress</span>
        </Badge>
      );
    case 'Assigned':
      return (
        <Badge variant="low">
          <ArrowRightCircle size={12} strokeWidth={2} />
          <span>Assigned</span>
        </Badge>
      );
    case 'Triaged':
      return (
        <Badge variant="medium">
          <ShieldAlert size={12} strokeWidth={2} />
          <span>Triaged</span>
        </Badge>
      );
    case 'Submitted':
    default:
      return (
        <Badge variant="unknown">
          <Clock size={12} strokeWidth={2} />
          <span>{status || 'Submitted'}</span>
        </Badge>
      );
  }
};
