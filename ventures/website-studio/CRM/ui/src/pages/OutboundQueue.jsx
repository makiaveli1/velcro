import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { apiOutboundQueue, apiOutboundTransition, apiHumanApprove, apiHumanDeny } from '../api';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../App';

const STAGE_LABELS = {
  draft_ready: 'Draft Ready',
  awaiting_content_approval: 'Awaiting Content',
  awaiting_human_review: 'Awaiting Human Review',
  content_approved: 'Content Approved',
  awaiting_send: 'Ready to Send',
  sending: 'Sending…',
  send_blocked: 'Send Blocked',
  sent: 'Sent',
  send_failed: 'Send Failed',
  failed: 'Failed',
  suppressed: 'Suppressed',
  rejected: 'Rejected',
};

function ContentBadge({ approval, approvedBy, approvedAt }) {
  if (!approval) return <span className="badge badge-default">Content: Pending</span>;
  if (approval === 'approved') {
    return (
      <span className="badge badge-sky">
        ✓ Content Approved{approvedBy ? ` by ${approvedBy}` : ''}
      </span>
    );
  }
  return <span className="badge badge-rose">✕ Content Revoked</span>;
}

function DeployBadge({ approval, approvedBy, approvedAt }) {
  if (!approval) return <span className="badge badge-default">Deploy: Pending</span>;
  if (approval === 'approved') {
    return (
      <span className="badge badge-emerald">
        ✓ Deploy Approved{approvedBy ? ` by ${approvedBy}` : ''}
      </span>
    );
  }
  if (approval === 'revoked') {
    return <span className="badge badge-rose">✕ Deploy Revoked</span>;
  }
  return <span className="badge badge-default">Deploy: Pending</span>;
}

function HumanApprovalBadge({ approval }) {
  if (!approval || approval === 'needs_review') return <span className="badge badge-default">⏳ Awaiting Review</span>;
  if (approval === 'ready_for_approval') return <span className="badge badge-amber">📋 Pending Review</span>;
  if (approval === 'human_approved') return <span className="badge badge-emerald">✓ Human Approved</span>;
  if (approval === 'human_denied') return <span className="badge badge-rose">✕ Human Denied</span>;
  return null;
}

function MailboxChip({ ready }) {
  return ready
    ? <span className="badge badge-emerald">✓ Mailbox Ready</span>
    : <span className="badge badge-rose">✕ Mailbox Blocked</span>;
}

function getMailboxBannerCopy(mailboxDetail = {}) {
  switch (mailboxDetail?.blockerCode) {
    case 'not_configured':
      return 'Mailbox not configured — Graph setup required';
    case 'not_authenticated':
      return 'Graph not authenticated — run `graph setup`';
    case 'token_expired':
      return 'Graph token expired — run `graph setup` to refresh';
    case 'ready':
      return 'Mailbox ready';
    default:
      return mailboxDetail?.reason || 'Mailbox not ready';
  }
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
      {/* Warnings banner */}
      {item.warnings?.length > 0 && (
        <div style={{ background: 'var(--signal-amber)', color: '#1a1a1a', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', fontSize: 13 }}>
          ⚠️ {item.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{item.name}</h3>
            {item.sendBlockedReason && (
              <span className="badge badge-rose" style={{ fontSize: 11 }}>
                ✕ {item.sendBlockedReason === 'mailbox' ? 'Graph not ready' : item.sendBlockedReason}
              </span>
            )}
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

      {/* Approval chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <ContentBadge approval={item.contentApproval} approvedBy={item.contentApprovedBy} approvedAt={item.contentApprovedAt} />
        <DeployBadge approval={item.deploymentApproval} approvedBy={item.deploymentApprovedBy} approvedAt={item.deploymentApprovedAt} />
        <HumanApprovalBadge approval={item.humanApproval} />
        {item.sendReady && (
          <span className="badge badge-emerald">✓ Ready to Send</span>
        )}
        {/* Human-approved but infrastructure blocks — explain why */}
        {item.humanApproval === 'human_approved' && item.outreachStage === 'send_blocked' && item.sendBlockedReason && (
          <span className="badge badge-amber" style={{ background: 'var(--signal-amber)', color: '#1a1a1a', border: 'none' }}>
            ⚠ {item.sendBlockedReason === 'mailbox' ? 'Graph not ready' : item.sendBlockedReason}
          </span>
        )}
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
        {/* awaiting_content_approval */}
        {item.outreachStage === 'awaiting_content_approval' && (
          <>
            <button className="btn btn-success btn-sm" onClick={() => handleAction('content_approve')} disabled={isLoading('content_approve')}>
              {isLoading('content_approve') ? 'Approving…' : '✓ Approve Content'}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('suppress')} disabled={isLoading('suppress')}>
              {isLoading('suppress') ? '…' : '🚫 Suppress'}
            </button>
          </>
        )}

        {/* awaiting_human_review / needs_review — human approval buttons */}
        {(item.outreachStage === 'awaiting_human_review' || item.humanApproval === 'needs_review' || item.humanApproval === 'ready_for_approval') && item.humanApproval !== 'human_approved' && item.humanApproval !== 'human_denied' && (
          <>
            <button className="btn btn-emerald btn-sm" onClick={() => handleAction('human_approve')} disabled={isLoading('human_approve')}>
              {isLoading('human_approve') ? '…' : '✓ Approve Send'}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('human_deny')} disabled={isLoading('human_deny')}>
              {isLoading('human_deny') ? '…' : '✕ Deny'}
            </button>
          </>
        )}

        {/* content_approved (no deploy approval) */}
        {item.outreachStage === 'content_approved' && item.humanApproval !== 'needs_review' && item.humanApproval !== 'human_denied' && (
          <>
            <button className="btn btn-emerald btn-sm" onClick={() => handleAction('deploy_approve')} disabled={isLoading('deploy_approve')}>
              {isLoading('deploy_approve') ? 'Approving…' : '✓ Approve Deploy'}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('content_revoke')} disabled={isLoading('content_revoke')}>
              {isLoading('content_revoke') ? '…' : '↩ Revoke Content'}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('suppress')} disabled={isLoading('suppress')}>
              {isLoading('suppress') ? '…' : '🚫 Suppress'}
            </button>
          </>
        )}

        {/* send_blocked — show human approval gate if not yet approved */}
        {item.outreachStage === 'send_blocked' && (
          <>
            {item.humanApproval !== 'human_approved' && item.humanApproval !== 'human_denied' && (
              <>
                <button className="btn btn-emerald btn-sm" onClick={() => handleAction('human_approve')} disabled={isLoading('human_approve')}>
                  {isLoading('human_approve') ? '…' : '✓ Approve Send'}
                </button>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('human_deny')} disabled={isLoading('human_deny')}>
                  {isLoading('human_deny') ? '…' : '✕ Deny'}
                </button>
              </>
            )}
            {item.deploymentApproval !== 'approved' && (
              <button className="btn btn-outline btn-sm" onClick={() => handleAction('deploy_approve')} disabled={isLoading('deploy_approve')}>
                {isLoading('deploy_approve') ? 'Approving…' : '✓ Approve Deploy'}
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => handleAction('refresh')} disabled={isLoading('refresh')}>
              {isLoading('refresh') ? '…' : '↻ Re-check'}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('suppress')} disabled={isLoading('suppress')}>
              {isLoading('suppress') ? '…' : '🚫 Suppress'}
            </button>
          </>
        )}

        {/* awaiting_send — requires human_approved */}
        {item.outreachStage === 'awaiting_send' && item.humanApproval === 'human_approved' && (
          <>
            <button className="btn btn-primary btn-sm" style={{ boxShadow: '0 0 12px rgba(16,185,129,0.4)' }} onClick={() => handleAction('send')} disabled={isLoading('send')}>
              {isLoading('send') ? 'Sending…' : '✉ Send'}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('deploy_revoke')} disabled={isLoading('deploy_revoke')}>
              {isLoading('deploy_revoke') ? '…' : '↩ Revoke Deploy'}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('suppress')} disabled={isLoading('suppress')}>
              {isLoading('suppress') ? '…' : '🚫 Suppress'}
            </button>
          </>
        )}

        {/* sending */}
        {item.outreachStage === 'sending' && (
          <button className="btn btn-primary btn-sm" disabled>
            Sending…
          </button>
        )}

        {/* sent */}
        {item.outreachStage === 'sent' && (
          <span style={{ fontSize: 13, color: 'var(--signal-emerald)', fontWeight: 600 }}>
            ✓ Sent{item.sentAt ? ` ${new Date(item.sentAt).toLocaleDateString()}` : ''}
          </span>
        )}

        {/* send_failed */}
        {item.outreachStage === 'send_failed' && (
          <>
            {item.humanApproval === 'human_approved' && (
              <button className="btn btn-outline btn-sm" onClick={() => handleAction('send')} disabled={isLoading('send')}>
                {isLoading('send') ? 'Retrying…' : '↻ Retry'}
              </button>
            )}
            <span style={{ fontSize: 13, color: 'var(--signal-rose)', fontWeight: 500 }}>
              ⚠ Send failed{item.lastError ? `: ${item.lastError}` : ''}
            </span>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={() => handleAction('suppress')} disabled={isLoading('suppress')}>
              {isLoading('suppress') ? '…' : '🚫 Suppress'}
            </button>
          </>
        )}

        {/* human_denied */}
        {item.humanApproval === 'human_denied' && (
          <span style={{ fontSize: 13, color: 'var(--signal-rose)', fontWeight: 500 }}>
            ✕ Human Denied
          </span>
        )}

        {/* rejected */}
        {item.outreachStage === 'rejected' && (
          <>
            <span style={{ fontSize: 13, color: 'var(--signal-rose)', fontWeight: 600 }}>✕ Rejected</span>
            <button className="btn btn-outline btn-sm" onClick={() => handleAction('reactivate')} disabled={isLoading('reactivate')}>
              {isLoading('reactivate') ? '…' : '↺ Reactivate'}
            </button>
          </>
        )}

        {/* suppressed */}
        {item.outreachStage === 'suppressed' && (
          <>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>🚫 Suppressed</span>
            <button className="btn btn-outline btn-sm" onClick={() => handleAction('reactivate')} disabled={isLoading('reactivate')}>
              {isLoading('reactivate') ? '…' : '↺ Reactivate'}
            </button>
          </>
        )}

        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => onPreview(item)}>
          Preview
        </button>
      </div>
    </div>
  );
}

const TAB_FILTERS = {
  actionable: ['draft_ready', 'awaiting_content_approval', 'content_approved', 'send_blocked'],
  blocked: null, // items with sendBlockedReason !== null — computed
  approved: ['awaiting_send'],
  history: ['sent', 'failed', 'suppressed', 'rejected'],
};

export default function OutboundQueue() {
  const { addToast } = useToast();
  const { data, loading, error, execute } = useApi(
    () => apiOutboundQueue(),
    [],
    { immediate: true }
  );

  const [activeTab, setActiveTab] = useState('actionable');
  const [previewItem, setPreviewItem] = useState(null);
  const [sendingFromModal, setSendingFromModal] = useState(false);

  const ACTIONABLE_TABS = ['actionable', 'blocked', 'approved', 'history'];
  const TAB_LABELS = { actionable: 'Actionable', blocked: 'Blocked', approved: 'Approved', history: 'History' };

  const handleAction = async (id, action) => {
    try {
      // Use dedicated APIs for human approval actions
      if (action === 'human_approve') {
        await apiHumanApprove(id);
        addToast({ type: 'success', message: 'Human approval granted.' });
      } else if (action === 'human_deny') {
        await apiHumanDeny(id);
        addToast({ type: 'success', message: 'Human denial recorded.' });
      } else {
        await apiOutboundTransition(id, action);
        const messages = {
          content_approve: 'Content approved.',
          content_revoke: 'Content revoked.',
          deploy_approve: 'Deployment approved.',
          deploy_revoke: 'Deployment revoked.',
          send: 'Email sent!',
          suppress: 'Lead suppressed.',
          unsuppress: 'Suppression removed.',
          reactivate: 'Lead reactivated.',
        };
        addToast({ type: 'success', message: messages[action] || `Action '${action}' complete.` });
      }
      execute();
    } catch (e) {
      if (e.message.includes('deployment blocked') || e.message.includes('blocked')) {
        addToast({ type: 'error', message: `Cannot send: ${e.message}` });
      } else if (e.message.includes('Human approval required')) {
        addToast({ type: 'error', message: `Human approval required before send.` });
      } else if (e.message.includes('pitch_revised')) {
        addToast({ type: 'error', message: `Pitch was revised — human re-approval required.` });
        execute();
      } else {
        addToast({ type: 'error', message: `Action failed: ${e.message}` });
      }
    }
  };

  const filteredItems = () => {
    if (!data?.items) return [];
    const items = data.items;
    if (activeTab === 'actionable') {
      return items.filter(i => TAB_FILTERS.actionable.includes(i.outreachStage));
    }
    if (activeTab === 'blocked') {
      return items.filter(i => i.sendBlockedReason !== null);
    }
    if (activeTab === 'approved') {
      return items.filter(i => TAB_FILTERS.approved.includes(i.outreachStage));
    }
    if (activeTab === 'history') {
      return items.filter(i => TAB_FILTERS.history.includes(i.outreachStage));
    }
    return items;
  };

  const counts = {
    actionable: (data?.items || []).filter(i => TAB_FILTERS.actionable.includes(i.outreachStage)).length,
    blocked: (data?.items || []).filter(i => i.sendBlockedReason !== null).length,
    approved: (data?.items || []).filter(i => TAB_FILTERS.approved.includes(i.outreachStage)).length,
    history: (data?.items || []).filter(i => TAB_FILTERS.history.includes(i.outreachStage)).length,
  };

  const items = filteredItems();
  const mailboxBannerCopy = getMailboxBannerCopy(data?.mailboxDetail);
  const mailboxReason = data?.mailboxDetail?.reason;

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Outbound Queue</h1>
          <p className="page-subtitle">Loading…</p>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>Loading outbound queue…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Outbound Queue</h1></div>
        <EmptyState
          title="Failed to load queue"
          description={error}
          icon={<svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-rose)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
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
              {(data?.items || []).length} lead{(data?.items || []).length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
      </div>

      {/* Mailbox readiness banner */}
      {!data?.mailboxReady && (
        <div style={{ background: 'var(--signal-rose)', color: '#fff', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: mailboxReason ? 4 : 0 }}>✕ {mailboxBannerCopy}</div>
          {mailboxReason && mailboxReason !== mailboxBannerCopy && (
            <div style={{ opacity: 0.92 }}>{mailboxReason}</div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {ACTIONABLE_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--signal-emerald)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {TAB_LABELS[tab]}
            {counts[tab] > 0 && (
              <span style={{ marginLeft: 6, background: activeTab === tab ? 'var(--signal-emerald)' : 'var(--bg-overlay)', color: activeTab === tab ? '#fff' : 'var(--text-secondary)', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'actionable' && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)', marginTop: -4 }}>
          Includes leads blocked by setup — resolve blockers to enable send.
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title={`No ${TAB_LABELS[activeTab].toLowerCase()} leads`}
          description={activeTab === 'actionable' ? 'Leads awaiting action will appear here.' : 'No leads in this category.'}
          icon={<svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)" strokeWidth="1.5"><polyline points="20 6 9 17 4 12" /></svg>}
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
              <button className="btn btn-outline" onClick={() => setPreviewItem(null)}>Close</button>

              {previewItem.outreachStage === 'awaiting_content_approval' && (
                <button className="btn btn-success" onClick={async () => { await handleAction(previewItem.id, 'content_approve'); setPreviewItem(null); }}>✓ Approve Content</button>
              )}

              {(previewItem.outreachStage === 'awaiting_human_review' || previewItem.humanApproval === 'needs_review' || previewItem.humanApproval === 'ready_for_approval') && previewItem.humanApproval !== 'human_approved' && previewItem.humanApproval !== 'human_denied' && (
                <>
                  <button className="btn btn-emerald" onClick={async () => { await handleAction(previewItem.id, 'human_approve'); setPreviewItem(null); }}>✓ Approve Send</button>
                  <button className="btn btn-outline" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={async () => { await handleAction(previewItem.id, 'human_deny'); setPreviewItem(null); }}>✕ Deny</button>
                </>
              )}

              {previewItem.outreachStage === 'content_approved' && previewItem.humanApproval !== 'needs_review' && previewItem.humanApproval !== 'human_denied' && (
                <>
                  <button className="btn btn-emerald" onClick={async () => { await handleAction(previewItem.id, 'deploy_approve'); setPreviewItem(null); }}>✓ Approve Deploy</button>
                  <button className="btn btn-outline" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={async () => { await handleAction(previewItem.id, 'content_revoke'); setPreviewItem(null); }}>↩ Revoke Content</button>
                </>
              )}

              {previewItem.outreachStage === 'send_blocked' && (
                <>
                  {previewItem.humanApproval !== 'human_approved' && previewItem.humanApproval !== 'human_denied' && (
                    <>
                      <button className="btn btn-emerald" onClick={async () => { await handleAction(previewItem.id, 'human_approve'); setPreviewItem(null); }}>✓ Approve Send</button>
                      <button className="btn btn-outline" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={async () => { await handleAction(previewItem.id, 'human_deny'); setPreviewItem(null); }}>✕ Deny</button>
                    </>
                  )}
                  {previewItem.deploymentApproval !== 'approved' && (
                    <button className="btn btn-outline" onClick={async () => { await handleAction(previewItem.id, 'deploy_approve'); setPreviewItem(null); }}>✓ Approve Deploy</button>
                  )}
                  <button className="btn btn-outline" onClick={async () => { await handleAction(previewItem.id, 'refresh'); setPreviewItem(null); execute(); }}>↻ Re-check</button>
                </>
              )}

              {previewItem.outreachStage === 'awaiting_send' && previewItem.humanApproval === 'human_approved' && (
                <>
                  <button className="btn btn-primary" onClick={async () => { setSendingFromModal(true); await handleAction(previewItem.id, 'send'); setSendingFromModal(false); setPreviewItem(null); }} disabled={sendingFromModal}>
                    {sendingFromModal ? 'Sending…' : '✉ Send'}
                  </button>
                  <button className="btn btn-outline" style={{ color: 'var(--signal-rose)', borderColor: 'var(--signal-rose)' }} onClick={async () => { await handleAction(previewItem.id, 'deploy_revoke'); setPreviewItem(null); }}>↩ Revoke Deploy</button>
                </>
              )}

              {previewItem.outreachStage === 'send_failed' && previewItem.humanApproval === 'human_approved' && (
                <button className="btn btn-outline" onClick={async () => { await handleAction(previewItem.id, 'send'); setPreviewItem(null); }}>↻ Retry Send</button>
              )}

              {(previewItem.outreachStage === 'rejected' || previewItem.outreachStage === 'suppressed') && (
                <button className="btn btn-outline" onClick={async () => { await handleAction(previewItem.id, 'reactivate'); setPreviewItem(null); }}>↺ Reactivate</button>
              )}
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Warnings */}
            {previewItem.warnings?.length > 0 && (
              <div style={{ background: 'var(--signal-amber)', color: '#1a1a1a', padding: 12, borderRadius: 8, fontSize: 13 }}>
                ⚠️ {previewItem.warnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            )}

            {/* Readiness chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              <MailboxChip ready={previewItem.mailboxReady} />
              <ContentBadge approval={previewItem.contentApproval} approvedBy={previewItem.contentApprovedBy} approvedAt={previewItem.contentApprovedAt} />
              <DeployBadge approval={previewItem.deploymentApproval} approvedBy={previewItem.deploymentApprovedBy} approvedAt={previewItem.deploymentApprovedAt} />
              {previewItem.sendReady && <span className="badge badge-emerald">✓ Ready to Send</span>}
            </div>

            {/* Send blocked reason */}
            {previewItem.sendBlockedReason && (
              <div style={{ background: 'var(--signal-rose)', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>
                ✕ Send blocked: <strong>{previewItem.sendBlockedReason}</strong>
              </div>
            )}

            {/* Metadata */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span className="badge badge-default">{previewItem.name}</span>
              {previewItem.score != null && (
                <span className="badge badge-default" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{previewItem.score}/100</span>
              )}
              {previewItem.sentAt && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Sent {new Date(previewItem.sentAt).toLocaleDateString()}</span>
              )}
            </div>

            {/* Email details */}
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 2px 0' }}><strong>To:</strong> {previewItem.email || '—'}</p>
              {previewItem.pitch?.hookType && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}><strong>Hook:</strong> {previewItem.pitch.hookType}</p>
              )}
              {previewItem.pitch?.wordCount > 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}><strong>Words:</strong> {previewItem.pitch.wordCount}</p>
              )}
            </div>

            {/* Email body */}
            <div style={{
              background: 'var(--bg-overlay)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)',
            }}>
              {previewItem.pitch?.body || previewItem.pitch?.preview || 'No email body available.'}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
