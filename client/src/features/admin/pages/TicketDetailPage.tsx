import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicket, useAssignTechnician, useUploadAttachment } from '../../../hooks/useTickets';
import { useTechnicians } from '../../../hooks/useTechnicians';
import { PageTitle } from '../../../components/shared/PageTitle';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { TicketTimeline } from '../../../components/shared/TicketTimeline';
import { ReferenceImageGallery } from '../../../components/shared/ReferenceImageGallery';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTimestamp } from '../../../utils/date';
import { formatPercentage } from '../../../utils/format';
import { ArrowLeft, UserCheck, ShieldAlert, Cpu } from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading, isError } = useTicket(ticketId || '');
  const { data: technicians } = useTechnicians();
  const assignMutation = useAssignTechnician();
  const uploadMutation = useUploadAttachment();

  const [selectedTech, setSelectedTech] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleUploadAttachment = async (file: File) => {
    if (!ticketId) return;
    await uploadMutation.mutateAsync({
      ticketId,
      file,
      type: 'diagnostic',
    });
    setSuccessMsg('Reference image uploaded and dispatched to technician queue.');
    setTimeout(() => setSuccessMsg(null), 3500);
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
        <Button variant="secondary" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back
        </Button>
        <EmptyState title="Ticket Not Found" description={`Ticket ID ${ticketId} could not be located.`} />
      </div>
    );
  }

  const handleAssign = async () => {
    if (!selectedTech || !ticketId) return;
    try {
      await assignMutation.mutateAsync({
        ticketId,
        technicianId: selectedTech,
        actor: 'Admin Dispatcher',
      });
      setSuccessMsg('Technician successfully assigned.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error handled by hook
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
          <span>Back</span>
        </Button>
      </div>

      <PageTitle
        title={`Ticket ${ticket.ticket_id}`}
        subtitle={`Submitted by ${ticket.complainant_name} on ${formatTimestamp(ticket.created_at)}`}
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
            padding: '10px 14px',
            borderRadius: 'var(--radius-control)',
            marginBottom: '16px',
            fontSize: '13.5px',
          }}
        >
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left Column: Complaint & AI Triage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Complaint Panel */}
          <div className="panel">
            <h2 style={{ marginBottom: '12px' }}>Complainant Incident Details</h2>
            <div style={{ background: 'var(--surface-muted)', padding: '14px', borderRadius: 'var(--radius-control)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                RAW COMPLAINT TEXT
              </div>
              <p style={{ color: 'var(--color-ink)', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                {ticket.complaint_text}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Location / Building</span>
                <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{ticket.building}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complainant Name</span>
                <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{ticket.complainant_name}</div>
              </div>
            </div>
          </div>

          {/* Reference Images & Attachments */}
          <ReferenceImageGallery
            attachments={ticket.attachments}
            title="Reference Images & Diagnostic Attachments"
            subtitle="Uploaded images and diagrams for technician reference and diagnosis"
            canUpload={true}
            onUpload={handleUploadAttachment}
            isUploading={uploadMutation.isPending}
            emptyMessage="No reference images attached yet. Click 'Add Reference Image' to provide equipment photos for the technician."
          />

          {/* AI Triage & Severity Assessment Panel */}
          <div className="panel" style={{ borderLeft: '4px solid var(--color-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Cpu size={20} color="var(--color-rose)" />
              <h2>AI Triage & Severity Evidence</h2>
            </div>

            {/* Classifier Result */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '12px',
                background: 'var(--surface-page-subtle)',
                borderRadius: 'var(--radius-control)',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Predicted Category
                </div>
                <div style={{ fontWeight: 600, color: 'var(--color-plum)' }}>{ticket.predicted_category}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Subcategory
                </div>
                <div style={{ fontWeight: 600 }}>{ticket.predicted_subcategory || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  ML Confidence (Calibrated)
                </div>
                <div style={{ fontWeight: 600, color: 'var(--color-rose)' }}>
                  {formatPercentage(ticket.classification_confidence)}
                </div>
              </div>
            </div>

            {/* LLM Severity Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-mauve)', marginBottom: '4px' }}>
                  REASONING SUMMARY (LLM Qualitative Assessment)
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--color-ink)' }}>
                  {ticket.reasoning_summary || 'No reasoning summary provided.'}
                </p>
              </div>

              {ticket.service_impact && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-mauve)', marginBottom: '4px' }}>
                    SERVICE IMPACT
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    {ticket.service_impact}
                  </p>
                </div>
              )}

              {ticket.evidence && ticket.evidence.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-mauve)', marginBottom: '4px' }}>
                    SUPPORTING EVIDENCE FROM INPUT
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--color-ink)' }}>
                    {ticket.evidence.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ticket.recommended_next_step && (
                <div style={{ background: 'var(--surface-muted)', padding: '10px 14px', borderRadius: 'var(--radius-control)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-plum)', marginBottom: '2px' }}>
                    SAFE NON-EXECUTING RECOMMENDATION
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-ink)' }}>
                    {ticket.recommended_next_step}
                  </div>
                </div>
              )}

              {ticket.requires_human_review && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--status-critical-bg)',
                    color: 'var(--status-critical-text)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-control)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <ShieldAlert size={16} />
                  <span>Flagged for Mandatory Human Review</span>
                </div>
              )}
            </div>
          </div>

          {/* Technician Resolution Notes (if available) */}
          {ticket.action_notes && (
            <div className="panel">
              <h2 style={{ marginBottom: '10px' }}>Technician Work Report</h2>
              <p style={{ fontSize: '14px', color: 'var(--color-ink)', whiteSpace: 'pre-wrap' }}>
                {ticket.action_notes}
              </p>
              {ticket.resolution_confirmed_at && (
                <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--status-success-text)', fontWeight: 600 }}>
                  ✓ Resolution confirmed by complainant on {formatTimestamp(ticket.resolution_confirmed_at)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Actions & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Dispatch & Assign Control */}
          <div className="panel">
            <h3 style={{ marginBottom: '12px' }}>Assign Technician</h3>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Currently Assigned:</span>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                {ticket.assigned_technician_name || 'Unassigned'}
              </div>
            </div>

            <div className="form-group">
              <select
                className="form-select"
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
              >
                <option value="">Select Technician...</option>
                {(technicians || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.department} - {t.workload_status})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              onClick={handleAssign}
              disabled={!selectedTech || assignMutation.isPending}
              isLoading={assignMutation.isPending}
              style={{ width: '100%' }}
            >
              <UserCheck size={16} />
              <span>Assign / Reassign</span>
            </Button>
          </div>

          {/* Ticket Timeline */}
          <div className="panel">
            <h3 style={{ marginBottom: '16px' }}>Status Timeline</h3>
            <TicketTimeline timeline={ticket.timeline} />
          </div>
        </div>
      </div>
    </div>
  );
};
