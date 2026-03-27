import React, { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { apiDrafts, apiApproveDraft, apiRejectDraft } from '../api';
import EmptyState from '../components/EmptyState';
import { useToast } from '../App';
import { relativeTime, formatDate } from '../utils';

export default function Drafts() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('proposed');
  const [expanded, setExpanded] = useState({});

  const fetcher = useCallback(() => apiDrafts({ status: tab === 'proposed' ? 'proposed' : 'approved' }), [tab]);
  const { data, loading, error, execute } = useApi(fetcher, [tab], { immediate: true });

  const drafts = data?.drafts || [];
  const pendingApproval = data?.pendingApproval || 0;

  const handleApprove = async (id) => {
    try {
      await apiApproveDraft(id);
      addToast({ type: 'success', message: 'Draft approved — open your email client to send' });
      execute();
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    }
  };

  const handleReject = async (id) => {
    try {
      await apiRejectDraft(id);
      addToast({ type: 'info', message: 'Draft discarded' });
      execute();
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Email Drafts</h1>
            <p className="page-subtitle">
              {tab === 'proposed' ? `${drafts.length} pending approval` : tab === 'approved' ? 'Ready to send' : 'History'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-chips" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { key: 'proposed', label: `Proposed (${pendingApproval > 0 ? drafts.length : 0})` },
          { key: 'approved', label: 'Approved' },
          { key: 'history', label: 'History' },
        ].map(t => (
          <button key={t.key} className={`filter-chip ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div style={{ color: 'var(--signal-rose)', fontSize: 13 }}>{error}</div>
      ) : tab === 'approved' ? (
        <ApprovedView />
      ) : drafts.length === 0 ? (
        <EmptyState
          title={tab === 'proposed' ? 'No drafts pending approval' : 'No history yet'}
          description={tab === 'proposed' ? 'AI-generated drafts will appear here for your review.' : ''}
        />
      ) : (
        drafts.map(draft => (
          <DraftCard
            key={draft.id}
            draft={draft}
            expanded={!!expanded[draft.id]}
            onToggle={() => setExpanded(prev => ({ ...prev, [draft.id]: !prev[draft.id] }))}
            onApprove={() => handleApprove(draft.id)}
            onReject={() => handleReject(draft.id)}
          />
        ))
      )}
    </div>
  );
}

function DraftCard({ draft, expanded, onToggle, onApprove, onReject }) {
  const isProposed = draft.status === 'proposed';

  return (
    <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
      <div className="card-header" style={{ cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <div className="card-title">{draft.subject || 'Untitled'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            To: <span className="font-mono">{draft.email || '—'}</span>
            {draft.contact_name && <span> · {draft.contact_name}</span>}
            · {relativeTime(draft.proposed_at || draft.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isProposed && (
            <span className="badge badge-amber">Proposed</span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '150ms' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="card-body" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {draft.context_used && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}>Context used</summary>
              <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {Array.isArray(draft.context_used) ? draft.context_used.map((c, j) => <div key={j}>• {c}</div>) : draft.context_used}
              </div>
            </details>
          )}

          {draft.body && (
            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', lineHeight: 1.6 }}>
              {draft.body}
            </div>
          )}

          {!draft.body && (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No preview available.</div>
          )}

          {isProposed && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button className="btn btn-success btn-sm" onClick={onApprove}>✓ Approve & Send</button>
              <button className="btn btn-ghost btn-sm" onClick={onReject} style={{ color: 'var(--signal-rose)' }}>Discard</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ApprovedView() {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)" strokeWidth="1.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <div className="empty-state-title">Draft approved</div>
      <div className="empty-state-desc">
        This draft is ready to send. Open your email client to send it, or copy the content.
      </div>
      <div style={{ marginTop: 16, padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center' }}>
        Drafts are sent directly from your email client — Verdantia CRM opens your mail app with the content ready to review and send.
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-card" style={{ height: 90, marginBottom: 12 }} />
      ))}
    </div>
  );
}
