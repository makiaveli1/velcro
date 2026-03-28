import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { apiOutboundQueue, apiOutboundTransition } from '../api';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../App';

const STAGE_BADGES = {
  approval_queued: 'badge-amber',
  approved: 'badge-sky',
  sent: 'badge-emerald',
  rejected: 'badge-rose',
};

function StageBadge({ stage }) {
  const cls = STAGE_BADGES[stage] || 'badge-default';
  const label = stage ? stage.replace(/_/g, ' ') : 'unknown';
  return <span className={`badge ${cls}`}>{label}</span>;
}

function OutboundCard({ item, onAction, onPreview }) {
  const [loading, setLoading] = useState(null);

  const handleAction = async (action) => {
    setLoading(action);
    await onAction(item.id, action);
    setLoading(null);
  };

  const isLoading = (action) => loading === action;

  return (
    <div className="discovery-card" style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{item.name}</h3>
            <StageBadge stage={item.outreachStage} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {item.email || 'No email'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {item.score != null && (
            <span className="badge badge-default" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {item.score}/100
            </span>
          )}
          {item.lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.lastUpdated}</span>
          )}
        </div>
      </div>

      {/* Pitch summary */}
      <div style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
            Subject
          </span>
          {item.pitch?.hookType && (
            <span className="badge badge-default">{item.pitch.hookType}</span>
          )}
        </div>
        <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 4px 0' }}>{item.pitch?.subject || '—'}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {item.pitch?.preview || '—'}
        </p>
        {item.pitch?.wordCount > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
            {item.pitch.wordCount} words
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {item.outreachStage === 'approval_queued' && (
          <>
            <button
              className="btn btn-success btn-sm"
              onClick={() => handleAction('approve')}
              disabled={isLoading('approve')}
            >
              {isLoading('approve') ? 'Approving…' : '✓ Approve'}
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }}
              onClick={() => handleAction('reject')}
              disabled={isLoading('reject')}
            >
              {isLoading('reject') ? 'Rejecting…' : '✕ Reject'}
            </button>
          </>
        )}
        {item.outreachStage === 'approved' && (
          <>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleAction('send')}
              disabled={isLoading('send')}
            >
              {isLoading('send') ? 'Sending…' : '✉ Send Now'}
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }}
              onClick={() => handleAction('reject')}
              disabled={isLoading('reject')}
            >
              {isLoading('reject') ? 'Rejecting…' : '✕ Reject'}
            </button>
          </>
        )}
        {item.outreachStage === 'sent' && (
          <span style={{ fontSize: 13, color: 'var(--signal-emerald)', fontWeight: 600 }}>
            ✓ Sent{item.sentAt ? ` ${new Date(item.sentAt).toLocaleDateString()}` : ''}
          </span>
        )}
        {item.outreachStage === 'rejected' && (
          <span style={{ fontSize: 13, color: 'var(--signal-rose)', fontWeight: 600 }}>
            ✕ Rejected
          </span>
        )}
        <button
          className="btn btn-outline btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => onPreview(item)}
        >
          Preview
        </button>
      </div>
    </div>
  );
}

export default function OutboundQueue() {
  const { addToast } = useToast();
  const { data, loading, error, execute } = useApi(
    () => apiOutboundQueue(),
    [],
    { immediate: true }
  );

  const [previewItem, setPreviewItem] = useState(null);
  const [sendingFromModal, setSendingFromModal] = useState(false);

  const handleAction = async (id, action) => {
    try {
      await apiOutboundTransition(id, action);
      const messages = {
        approve: 'Lead approved and queued for sending.',
        reject: 'Lead rejected.',
        send: 'Email sent!',
      };
      addToast({ type: action === 'reject' ? 'info' : 'success', message: messages[action] || `Action ${action} complete.` });
      execute();
    } catch (e) {
      addToast({ type: 'error', message: `Action failed: ${e.message}` });
    }
  };

  const handleModalSend = async () => {
    if (!previewItem) return;
    setSendingFromModal(true);
    await handleAction(previewItem.id, 'send');
    setSendingFromModal(false);
    setPreviewItem(null);
  };

  const handleModalApprove = async () => {
    if (!previewItem) return;
    await handleAction(previewItem.id, 'approve');
    setPreviewItem(null);
  };

  const items = data?.items || [];

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Outbound Queue</h1>
          <p className="page-subtitle">Loading…</p>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>
          Loading outbound queue…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Outbound Queue</h1>
        </div>
        <EmptyState
          title="Failed to load queue"
          description={error}
          icon={
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-rose)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Outbound Queue</h1>
            <p className="page-subtitle">
              {items.length} lead{items.length !== 1 ? 's' : ''} in outreach pipeline
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Queue is empty"
          description="Leads with approved pitches will appear here for sending."
          icon={
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
      ) : (
        items.map(item => (
          <OutboundCard
            key={item.id}
            item={item}
            onAction={handleAction}
            onPreview={setPreviewItem}
          />
        ))
      )}

      {/* Preview Modal */}
      {previewItem && (
        <Modal
          title={previewItem.pitch?.subject || 'Pitch Preview'}
          size="large"
          onClose={() => setPreviewItem(null)}
          footer={
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setPreviewItem(null)}>
                Close
              </button>
              {previewItem.outreachStage === 'approval_queued' && (
                <button className="btn btn-success" onClick={handleModalApprove}>
                  ✓ Approve
                </button>
              )}
              {previewItem.outreachStage === 'approved' && (
                <button
                  className="btn btn-primary"
                  onClick={handleModalSend}
                  disabled={sendingFromModal}
                >
                  {sendingFromModal ? 'Sending…' : '✉ Send Now'}
                </button>
              )}
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Metadata */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              <StageBadge stage={previewItem.outreachStage} />
              <span className="badge badge-default">{previewItem.name}</span>
              {previewItem.score != null && (
                <span className="badge badge-default" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {previewItem.score}/100
                </span>
              )}
              {previewItem.sentAt && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Sent {new Date(previewItem.sentAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Email details */}
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>
                <strong>To:</strong> {previewItem.email || '—'}
              </p>
              {previewItem.pitch?.hookType && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>Hook:</strong> {previewItem.pitch.hookType}
                </p>
              )}
            </div>

            {/* Email body */}
            <div
              style={{
                background: 'var(--bg-overlay)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                color: 'var(--text-primary)',
              }}
            >
              {/* Extract email body from the stored preview — use the full body from PITCH */}
              {previewItem.pitch?.body || previewItem.pitch?.preview || 'No email body available.'}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
