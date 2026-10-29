import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function NewTicketModal({ isOpen, onClose, onAddTicket }) {
  const { currentUser, showToast } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Network & Wireless');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Real-time AI triage simulation based on keywords
  const getAiPrediction = () => {
    const text = (title + ' ' + description).toLowerCase();
    if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet') || text.includes('network') || text.includes('eduroam')) {
      return {
        cat: 'Network & Wireless',
        confidence: 97.4,
        urgency: text.includes('down') || text.includes('exam') ? 'High' : 'Medium',
        fix: 'Check 802.1X certificate validity or reset campus Wi-Fi profile.'
      };
    }
    if (text.includes('canvas') || text.includes('grade') || text.includes('software') || text.includes('lms')) {
      return {
        cat: 'Academic Software',
        confidence: 94.8,
        urgency: text.includes('exam') ? 'Critical' : 'High',
        fix: 'Verify SIS gateway latency or clear browser cache for Canvas session.'
      };
    }
    if (text.includes('laptop') || text.includes('screen') || text.includes('crash') || text.includes('hardware') || text.includes('gpu')) {
      return {
        cat: 'Hardware & Lab',
        confidence: 95.1,
        urgency: 'High',
        fix: 'Schedule hardware diagnostic check and update graphic drivers.'
      };
    }
    return {
      cat: category,
      confidence: 91.2,
      urgency: priority,
      fix: 'Standard triage rule: Route to Tier-1 queue for preliminary verification.'
    };
  };

  const aiGuess = getAiPrediction();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please provide a ticket title and description', 'warning');
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));

    const newTicket = {
      id: `TICK-${Math.floor(1050 + Math.random() * 900)}`,
      title: title.trim(),
      description: description.trim(),
      category: aiGuess.cat,
      priority: aiGuess.urgency,
      status: 'Open',
      creatorName: currentUser?.name || 'Demo User',
      creatorEmail: currentUser?.email || 'demo@campus.edu',
      creatorRole: currentUser?.role || 'student',
      assignedTo: 'Marcus Chen',
      createdAt: new Date().toISOString(),
      aiTriage: {
        predictedCategory: aiGuess.cat,
        confidence: aiGuess.confidence,
        sentiment: 'Neutral',
        recommendedUrgency: aiGuess.urgency,
        rootCause: 'User reported issue via portal intake form.',
        suggestedFix: aiGuess.fix,
        autoRoutedTo: 'Marcus Chen (Helpdesk Tier-2)'
      }
    };

    onAddTicket(newTicket);
    setIsSubmitting(false);
    showToast(`Ticket ${newTicket.id} created & auto-triaged by AI!`, 'success');
    onClose();
  };

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal-card new-ticket-card" onClick={e => e.stopPropagation()}>
        <div className="info-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F1F1F' }}>Submit Support Request</span>
            <span className="role-tag-badge">AI Assisted</span>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="new-ticket-form">
          <div className="form-field">
            <label className="field-label">Subject / Issue Summary *</label>
            <input
              type="text"
              className="ticket-form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Cannot connect to eduroam in Science Hall"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-field">
              <label className="field-label">Category</label>
              <select
                className="ticket-form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Network & Wireless">Network & Wireless</option>
                <option value="Academic Software">Academic Software</option>
                <option value="Hardware & Lab">Hardware & Lab</option>
                <option value="Hardware Procurement">Hardware Procurement</option>
                <option value="Security & Identity">Security & Identity</option>
              </select>
            </div>

            <div className="form-field">
              <label className="field-label">Initial Urgency</label>
              <select
                className="ticket-form-select"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="Low">Low — Minor inconvenience</option>
                <option value="Medium">Medium — Standard request</option>
                <option value="High">High — Impeding work/study</option>
                <option value="Critical">Critical — System outage</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Detailed Description *</label>
            <textarea
              className="ticket-form-textarea"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Please provide steps to reproduce, device model, or room number..."
              required
            />
          </div>

          {/* Real-time AI Triage Preview */}
          <div className="ai-triage-preview-card">
            <div className="ai-preview-header">
              <span className="ai-sparkle-icon">✨</span>
              <strong style={{ fontSize: '0.825rem', color: '#8E1EA2' }}>AI Auto-Triage Live Preview:</strong>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#444', lineHeight: 1.4 }}>
              Predicted: <strong>{aiGuess.cat}</strong> ({aiGuess.confidence}% confidence) • Urgency: <strong>{aiGuess.urgency}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
              Suggested remediation: <em>{aiGuess.fix}</em>
            </div>
          </div>

          <div className="info-modal-footer">
            <button type="button" className="btn-cancel-google" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-purple-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Triaging with AI...' : 'Submit Support Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
