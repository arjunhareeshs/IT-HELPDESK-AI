import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTicket, useConfirmResolution, useRequestReEvaluation } from '../../../hooks/useTickets';
import { PageTitle } from '../../../components/shared/PageTitle';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { TicketTimeline } from '../../../components/shared/TicketTimeline';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Textarea } from '../../../components/ui/Textarea';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTimestamp } from '../../../utils/date';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { ReferenceImageGallery } from '../../../components/shared/ReferenceImageGallery';

export const ComplaintDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ticket, isLoading, isError } = useTicket(ticketId || '');

  const confirmMutation = useConfirmResolution();
  const reEvalMutation = useRequestReEvaluation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reEvalReason, setReEvalReason] = useState('');
  const [reEvalError, setReEvalError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div>
        <Button variant="secondary" onClick={() => navigate('/complainant/my-complaints')} style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back
        </Button>
        <EmptyState title="Complaint Not Found" description="The requested complaint could not be found." />
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!ticketId) return;
    await confirmMutation.mutateAsync({
      ticketId,
      actor: user?.name || 'Complainant',
    });
  };

  const handleReEvaluationSubmit = async () => {
    if (!reEvalReason.trim() || reEvalReason.trim().length < 10) {
      setReEvalError('Please provide a specific explanation of why the issue is not fixed (at least 10 characters).');
      return;
    }
    if (!ticketId) return;
    await reEvalMutation.mutateAsync({
      ticketId,
      reason: reEvalReason,
      actor: user?.name || 'Complainant',
    });
    setIsModalOpen(false);
    setReEvalReason('');
  };

  const isAwaitingVerification = ticket.status === 'Awaiting verification';

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/complainant/my-complaints')}>
          <ArrowLeft size={15} />
          <span>Back to Complaints</span>
        </Button>
      </div>

      <PageTitle
        title={`Complaint Reference: ${ticket.ticket_id}`}
        subtitle={`Logged on ${formatTimestamp(ticket.created_at)}`}
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PriorityBadge priority={ticket.severity} />
            <StatusBadge status={ticket.status} />
          </div>
        }
      />

      {/* Verification Action Banner */}
      {isAwaitingVerification && (
        <div
          className="panel"
          style={{
            borderLeft: '4px solid var(--color-rose)',
            background: 'var(--surface-muted)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '17px', color: 'var(--color-plum)', marginBottom: '4px' }}>
                Action Required: Verify Resolution
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                The assigned technician has reported work completed. Please verify if the issue has been resolved to your satisfaction.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                disabled={reEvalMutation.isPending || confirmMutation.isPending}
              >
                <RotateCcw size={15} />
                <span>Issue Not Fixed</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                isLoading={confirmMutation.isPending}
                disabled={reEvalMutation.isPending}
              >
                <CheckCircle2 size={15} />
                <span>Confirm Resolved</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left Column: Complaint Details & Technician Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel">
            <h2 style={{ marginBottom: '12px' }}>Your Complaint</h2>
            <div style={{ background: 'var(--surface-page-subtle)', padding: '14px', borderRadius: 'var(--radius-control)' }}>
              <p style={{ color: 'var(--color-ink)', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                {ticket.complaint_text}
              </p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Location</span>
                <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{ticket.building}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Identified Category</span>
                <div style={{ fontWeight: 600, color: 'var(--color-plum)' }}>{ticket.predicted_category}</div>
              </div>
            </div>
          </div>

          {/* Reference Images / Attachments */}
          <ReferenceImageGallery
            attachments={ticket.attachments}
            title="Attached Images & Documents"
            subtitle="Photos and evidence attached to this complaint"
            canUpload={false}
            emptyMessage="No attachments were uploaded with this complaint."
          />

          {/* Technician Action Notes */}
          {ticket.action_notes && (
            <div className="panel" style={{ borderLeft: '4px solid var(--color-mauve)' }}>
              <h2 style={{ marginBottom: '10px' }}>Technician Action Report</h2>
              <p style={{ fontSize: '14px', color: 'var(--color-ink)', whiteSpace: 'pre-wrap' }}>
                {ticket.action_notes}
              </p>
              {ticket.assigned_technician_name && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Submitted by {ticket.assigned_technician_name}
                </div>
              )}
            </div>
          )}

          {/* Re-evaluation note if active */}
          {ticket.status === 'Re-evaluation' && ticket.re_evaluation_reason && (
            <div className="panel" style={{ borderLeft: '4px solid #C4384A' }}>
              <h3 style={{ color: '#C4384A', marginBottom: '8px' }}>Re-evaluation Underway</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink)' }}>
                Reason stated: "{ticket.re_evaluation_reason}"
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Timeline */}
        <div>
          <div className="panel">
            <h3 style={{ marginBottom: '16px' }}>Ticket Timeline</h3>
            <TicketTimeline timeline={ticket.timeline} />
          </div>
        </div>
      </div>

      {/* Modal for Requesting Re-Evaluation */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Request Re-Evaluation">
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Please describe why the issue remains unresolved so the technician can address the remaining problem.
        </p>

        <Textarea
          label="Explanation of Remaining Issue"
          value={reEvalReason}
          onChange={(e) => setReEvalReason(e.target.value)}
          placeholder="E.g., The switch was powered on, but port 12 still has no signal..."
          rows={4}
          required
        />

        {reEvalError && (
          <div
            style={{
              background: 'var(--status-critical-bg)',
              color: 'var(--status-critical-text)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              marginBottom: '14px',
              fontSize: '13px',
            }}
          >
            {reEvalError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReEvaluationSubmit}
            isLoading={reEvalMutation.isPending}
          >
            Submit Re-evaluation Request
          </Button>
        </div>
      </Modal>
    </div>
  );
};
