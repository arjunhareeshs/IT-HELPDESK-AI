import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTicket, useSubmitWorkReport, useUploadAttachment } from '../../../hooks/useTickets';
import { PageTitle } from '../../../components/shared/PageTitle';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { TicketTimeline } from '../../../components/shared/TicketTimeline';
import { ReferenceImageGallery } from '../../../components/shared/ReferenceImageGallery';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTimestamp } from '../../../utils/date';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';

export const TechnicianWorkPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ticket, isLoading, isError } = useTicket(ticketId || '');
  const reportMutation = useSubmitWorkReport();
  const uploadMutation = useUploadAttachment();

  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadAttachment = async (file: File) => {
    if (!ticketId) return;
    await uploadMutation.mutateAsync({
      ticketId,
      file,
      type: 'diagnostic',
    });
  };

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
        <Button variant="secondary" onClick={() => navigate('/technician/queue')} style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back
        </Button>
        <EmptyState title="Ticket Not Found" description="The requested ticket could not be found." />
      </div>
    );
  }

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!notes.trim() || notes.trim().length < 15) {
      setError('Please provide detailed action notes describing the troubleshooting steps and fix applied (at least 15 characters).');
      return;
    }

    if (!ticketId) return;

    try {
      await reportMutation.mutateAsync({
        ticketId,
        notes,
        actor: user?.name || 'Technician',
      });
      setSuccessMsg('Work report submitted. The ticket is now Awaiting Verification from the complainant.');
      setNotes('');
    } catch {
      setError('Failed to submit work report. Please try again.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/technician/queue')}>
          <ArrowLeft size={15} />
          <span>Back to Work Queue</span>
        </Button>
      </div>

      <PageTitle
        title={`Work Order: ${ticket.ticket_id}`}
        subtitle={`Logged on ${formatTimestamp(ticket.created_at)} • Location: ${ticket.building}`}
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PriorityBadge priority={ticket.severity} />
            <StatusBadge status={ticket.status} />
          </div>
        }
      />

      {successMsg && (
        <div
          style={{
            background: 'var(--status-success-bg)',
            color: 'var(--status-success-text)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-control)',
            marginBottom: '20px',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left Column: Complaint Details & Action Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Incident Context */}
          <div className="panel">
            <h2 style={{ marginBottom: '12px' }}>Incident Information</h2>
            <div style={{ background: 'var(--surface-muted)', padding: '14px', borderRadius: 'var(--radius-control)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                COMPLAINANT REPORT
              </div>
              <p style={{ color: 'var(--color-ink)', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                {ticket.complaint_text}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Building / Room</span>
                <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{ticket.building}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category</span>
                <div style={{ fontWeight: 600, color: 'var(--color-plum)' }}>{ticket.predicted_category}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assessed Urgency</span>
                <div style={{ fontWeight: 600, color: 'var(--color-rose)', textTransform: 'capitalize' }}>
                  {ticket.urgency || 'Normal'}
                </div>
              </div>
            </div>

            {ticket.service_impact && (
              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Operational Impact:</strong> {ticket.service_impact}
              </div>
            )}
          </div>

          {/* Reference Images for Technician Diagnosis */}
          <ReferenceImageGallery
            attachments={ticket.attachments}
            title="Reference Images & Visual Evidence"
            subtitle="Photos and visual attachments supplied by complainant or administrator"
            canUpload={true}
            onUpload={handleUploadAttachment}
            isUploading={uploadMutation.isPending}
            emptyMessage="No reference images or screenshots attached for this ticket."
          />

          {/* Re-evaluation Alert if Active */}
          {ticket.status === 'Re-evaluation' && (
            <div className="panel" style={{ borderLeft: '4px solid #C4384A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C4384A', marginBottom: '8px' }}>
                <ShieldAlert size={18} />
                <h3 style={{ color: '#C4384A' }}>Complainant Requested Re-evaluation</h3>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink)' }}>
                {ticket.re_evaluation_reason}
              </p>
            </div>
          )}

          {/* Action Submission Form */}
          <div className="panel">
            <h2 style={{ marginBottom: '8px' }}>Submit Action Report</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Document troubleshooting steps and resolution applied. Submitting moves the ticket to <strong>Awaiting Verification</strong> for complainant sign-off.
            </p>

            <form onSubmit={handleSubmitReport}>
              <Textarea
                label="Resolution Notes & Work Summary"
                placeholder="E.g., Replaced faulty power supply unit on rack switch. Tested ping to gateway and confirmed 48 ports online..."
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />

              {error && (
                <div
                  style={{
                    background: 'var(--status-critical-bg)',
                    color: 'var(--status-critical-text)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-control)',
                    marginBottom: '16px',
                    fontSize: '13px',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={reportMutation.isPending}
                >
                  <CheckCircle2 size={16} />
                  <span>Submit Work Report</span>
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div>
          <div className="panel">
            <h3 style={{ marginBottom: '16px' }}>Ticket Timeline</h3>
            <TicketTimeline timeline={ticket.timeline} />
          </div>
        </div>
      </div>
    </div>
  );
};
