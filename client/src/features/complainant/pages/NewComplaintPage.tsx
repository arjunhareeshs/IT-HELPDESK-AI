import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useCreateComplaint } from '../../../hooks/useTickets';
import { PageTitle } from '../../../components/shared/PageTitle';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { AttachmentUpload } from '../../../components/shared/AttachmentUpload';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const FACILITY_BUILDINGS = [
  { value: 'Science Block', label: 'Science Block' },
  { value: 'Examination Complex', label: 'Examination Complex' },
  { value: 'Engineering Hall', label: 'Engineering Hall' },
  { value: 'Library West', label: 'Library West' },
  { value: 'Operations Center', label: 'Operations Center' },
  { value: 'Administrative Tower', label: 'Administrative Tower' },
];

export const NewComplaintPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createMutation = useCreateComplaint();
  const isAdmin = user?.role === 'admin';

  const [building, setBuilding] = useState('Science Block');
  const [complaintText, setComplaintText] = useState('');
  const [affectedService, setAffectedService] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [attachmentFailed, setAttachmentFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!complaintText.trim() || complaintText.trim().length < 10) {
      setError('Please provide a specific description of the IT issue (at least 10 characters).');
      return;
    }

    try {
      const ticket = await createMutation.mutateAsync({
        data: {
          building,
          complaint_text: complaintText,
          affected_service: affectedService || undefined,
          attachment,
        },
        complainant: {
          id: user?.id || 'anonymous',
          name: user?.name || 'Complainant',
        },
      });

      setAttachmentFailed(!!ticket.attachment_failed);
      setSubmittedTicketId(ticket.ticket_id);
    } catch {
      setError('Failed to submit incident ticket. Please check your connection.');
    }
  };

  if (submittedTicketId) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--status-success-bg)',
              color: 'var(--status-success-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>Complaint Successfully Registered</h1>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            Your ticket has entered automated triage and priority assessment.
          </p>
          {attachmentFailed && (
            <p style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--status-critical-text, #9A3412)' }}>
              The ticket was created, but your attachment could not be uploaded. Please add it again from the ticket page
              or tell the technician directly.
            </p>
          )}

          <div
            style={{
              background: 'var(--surface-muted)',
              padding: '12px 20px',
              borderRadius: 'var(--radius-control)',
              display: 'inline-block',
              marginBottom: '24px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Your Ticket Reference
            </span>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-plum)' }}>
              {submittedTicketId}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => setSubmittedTicketId(null)}>
              Submit Another
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(isAdmin ? '/admin/registry' : '/complainant/my-complaints')}
            >
              <span>{isAdmin ? 'View Ticket Registry' : 'View My Complaints'}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <PageTitle
        title="Submit New IT Incident"
        subtitle="Report hardware, network, or software issues. Priority is evaluated automatically."
      />

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <Select
            label="Facility / Building Location"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            options={FACILITY_BUILDINGS}
            required
          />

          <Textarea
            label="Problem Description"
            placeholder="Describe the issue, specific room, equipment number, and operational impact..."
            rows={5}
            value={complaintText}
            onChange={(e) => setComplaintText(e.target.value)}
            required
          />

          <Select
            label="Affected Service (Optional)"
            value={affectedService}
            onChange={(e) => setAffectedService(e.target.value)}
            options={[
              { value: '', label: 'I do not know / Not sure' },
              { value: 'Enterprise WiFi / Local Network', label: 'Enterprise WiFi / Local Network' },
              { value: 'Lab Computer / Workstation', label: 'Lab Computer / Workstation' },
              { value: 'Projector / Classroom AV', label: 'Projector / Classroom AV' },
              { value: 'Printing & Scan Stations', label: 'Printing & Scan Stations' },
              { value: 'Enterprise Portal / Software', label: 'Enterprise Portal / Software' },
            ]}
          />

          <AttachmentUpload onFileSelect={setAttachment} />

          {error && (
            <div
              style={{
                background: 'var(--status-critical-bg)',
                color: 'var(--status-critical-text)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-control)',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
              Submit Complaint
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
