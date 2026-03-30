import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiPipeline, apiOutboundTransition, apiOutboundReadiness } from '../api';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../App';

// ── Stage config ─────────────────────────────────────────
const STAGE_COLUMNS = [
  { key: 'lead_found',        label: 'Lead Found',       color: 'neutral' },
  { key: 'brief_created',    label: 'Brief Created',    color: 'neutral-blue' },
  { key: 'pitch_drafted',    label: 'Pitch Drafted',    color: 'neutral' },
  { key: 'awaiting_content', label: 'Awaiting Content', color: 'sky' },
  { key: 'content_approved', label: 'Content Approved',color: 'sky' },
  { key: 'send_blocked',     label: 'Send Blocked',     color: 'rose' },
  { key: 'ready_to_send',    label: 'Ready to Send',    color: 'emerald' },
  { key: 'sent',             label: 'Sent',              color: 'muted' },
  { key: 'monitor',          label: 'Monitor',           color: 'amber' },
  { key: 'parked',           label: 'Parked',            color: 'neutral' },
  { key: 'suppressed',       label: 'Suppressed',        color: 'muted' },
];

const STAGE_COLOR_MAP = {
  lead_found:       { border: 'var(--border)',      bg: 'transparent' },
  brief_created:    { border: 'var(--signal-sky)',  bg: 'transparent' },
  pitch_drafted:    { border: 'var(--border)',      bg: 'transparent' },
  awaiting_content: { border: 'var(--signal-sky)',  bg: 'transparent' },
  content_approved: { border: 'var(--signal-sky)',  bg: 'transparent' },
  send_blocked:     { border: 'var(--signal-rose)', bg: 'transparent' },
  ready_to_send:    { border: 'var(--signal-emerald)', bg: 'transparent' },
  sent:             { border: 'var(--border)',      bg: 'transparent' },
  monitor:          { border: 'var(--signal-amber)', bg: 'rgba(245,158,11,0.06)' },
  parked:           { border: 'var(--border)',      bg: 'transparent' },
  suppressed:       { border: 'var(--border)',      bg: 'rgba(255,255,255,0.02)' },
};

const FILTER_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'active',      label: 'Active' },
  { key: 'send_ready',  label: 'Send Ready' },
  { key: 'blocked',     label: 'Blocked' },
  { key: 'monitor',     label: 'Monitor' },
  { key: 'parked',      label: 'Parked' },
  { key: 'suppressed',  label: 'Suppressed' },
];

const ACTIVE_STAGES = new Set([
  'lead_found', 'brief_created', 'pitch_drafted',
  'awaiting_content', 'content_approved', 'send_blocked', 'ready_to_send',
]);

// ── Helpers ─────────────────────────────────────────────
function relativeTime(isoStr) {
  if (!isoStr) return null;
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoStr).toLocaleDateString();
  } catch {
    return null;
  }
}

function ContactBadge({ method, value }) {
  if (method === 'email') return <span title={value}>📧 email</span>;
  if (method === 'phone') return <span title={value}>📞 phone</span>;
  return <span>⚠ none</span>;
}

function StageBadge({ stage }) {
  const labels = {
    lead_found: 'Lead Found',
    brief_created: 'Brief Created',
    pitch_drafted: 'Pitch Drafted',
    awaiting_content: 'Awaiting Content',
    content_approved: 'Content Approved',
    send_blocked: 'Send Blocked',
    ready_to_send: 'Ready to Send',
    sent: 'Sent',
    monitor: 'Monitor',
    parked: 'Parked',
    suppressed: 'Suppressed',
  };
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-tertiary)',
      background: 'var(--bg-overlay)',
      padding: '2px 6px',
      borderRadius: 4,
    }}>
      {labels[stage] || stage}
    </span>
  );
}

function BlockerBadge({ blockers }) {
  if (!blockers || blockers.length === 0) return null;
  return blockers.map((b, i) => (
    <span key={i} style={{
      fontSize: 10,
      fontWeight: 700,
      color: '#fff',
      background: 'var(--signal-rose)',
      padding: '2px 5px',
      borderRadius: 3,
      letterSpacing: '0.04em',
    }}>
      ✕ {b}
    </span>
  ));
}

function WarningChip() {
  return <span title="Has warnings" style={{ fontSize: 12 }}>⚠️</span>;
}

// ── Card context menu ────────────────────────────────────
function CardMenu({ item, onClose, onAction, onViewDetails, onViewOutbound }) {
  const ref = useRef(null);
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  const handle = (action) => { onAction(action); onClose(); };

  return (
    <div ref={ref} style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      zIndex: 50,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '4px 0',
      minWidth: 180,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {item.crm_contact_id && (
        <MenuItem onClick={() => onViewDetails(item)} label="View Details" />
      )}
      <MenuItem onClick={() => onViewOutbound(item)} label="View Outbound" />
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      {!item.is_monitor && ACTIVE_STAGES.has(item.board_stage) && (
        <MenuItem onClick={() => handle('monitor')} label="Move to Monitor" />
      )}
      {!item.is_parked && ACTIVE_STAGES.has(item.board_stage) && (
        <MenuItem onClick={() => handle('park')} label="Park Lead" />
      )}
      {!item.is_suppressed && !item.is_terminal && (
        <MenuItem onClick={() => handle('suppress')} label="Suppress" danger />
      )}
      {(item.is_terminal || item.is_suppressed) && (
        <MenuItem onClick={() => handle('reactivate')} label="Reactivate" />
      )}
      <MenuItem onClick={() => handle('refresh_readiness')} label="Refresh Readiness" />
    </div>
  );
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '7px 12px',
        fontSize: 13,
        background: 'none',
        border: 'none',
        color: danger ? 'var(--signal-rose)' : 'var(--text-primary)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {label}
    </button>
  );
}

// ── Stage action buttons (gated) ─────────────────────────
function StageActions({ item, onAction, loading }) {
  if (item.board_stage === 'pitch_drafted' && item.can_enter_approval) {
    return (
      <button
        className="btn btn-primary btn-sm"
        style={{ marginTop: 8, width: '100%' }}
        onClick={() => onAction('content_approve')}
        disabled={loading}
      >
        {loading ? '…' : '✓ Submit for Review'}
      </button>
    );
  }
  if (item.board_stage === 'awaiting_content') {
    return (
      <button
        className="btn btn-primary btn-sm"
        style={{ marginTop: 8, width: '100%' }}
        onClick={() => onAction('content_approve')}
        disabled={loading}
      >
        {loading ? '…' : '✓ Approve Content'}
      </button>
    );
  }
  if (item.board_stage === 'content_approved') {
    return (
      <button
        className="btn btn-emerald btn-sm"
        style={{ marginTop: 8, width: '100%' }}
        onClick={() => onAction('deploy_approve')}
        disabled={loading}
      >
        {loading ? '…' : '✓ Approve Deployment'}
      </button>
    );
  }
  if (item.board_stage === 'ready_to_send' && item.can_send) {
    return (
      <button
        className="btn btn-primary btn-sm"
        style={{ marginTop: 8, width: '100%', background: 'var(--signal-emerald)', borderColor: 'var(--signal-emerald)' }}
        onClick={() => onAction('send')}
        disabled={loading}
      >
        {loading ? '…' : '✉ Send'}
      </button>
    );
  }
  return null;
}

// ── Send confirmation modal ─────────────────────────────
function SendConfirmModal({ item, onConfirm, onClose }) {
  const [sending, setSending] = useState(false);
  const handleConfirm = async () => {
    setSending(true);
    await onConfirm();
    setSending(false);
    onClose();
  };
  return (
    <Modal
      title="Confirm Send"
      size="small"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'var(--signal-emerald)', borderColor: 'var(--signal-emerald)' }} onClick={handleConfirm} disabled={sending}>
            {sending ? 'Sending…' : '✉ Confirm Send'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13 }}>
          <strong>To:</strong> {item.contact_value}
        </div>
        {item.warnings && item.warnings.length > 0 && (
          <div style={{ background: 'var(--signal-amber)', color: '#1a1a1a', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>
            ⚠️ {item.warnings.map((w, i) => <div key={i}>{w}</div>)}
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          This will send the approved pitch to <strong>{item.contact_value}</strong>.
        </p>
      </div>
    </Modal>
  );
}

// ── Pipeline card ────────────────────────────────────────
function PipelineCard({ item, onAction, onViewDetails, onViewOutbound, onSendConfirm }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  const stageColors = STAGE_COLOR_MAP[item.board_stage] || STAGE_COLOR_MAP.lead_found;
  const isMonitor = item.board_stage === 'monitor';
  const isSuppressed = item.board_stage === 'suppressed';
  const isSent = item.board_stage === 'sent';

  const handleAction = async (action) => {
    if (action === 'send') { onSendConfirm(item); return; }
    if (action === 'view_details') { navigate(`/contacts/${item.crm_contact_id}`); return; }
    if (action === 'view_outbound') { navigate('/outbound'); return; }
    setLoading(action);
    await onAction(item.id, action);
    setLoading(null);
  };

  return (
    <div style={{
      background: isMonitor ? stageColors.bg : 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${stageColors.border}`,
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
      opacity: isSuppressed ? 0.65 : 1,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            fontStyle: isSuppressed ? 'italic' : 'normal',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.name}
          </div>
          {item.segment && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.segment}
            </div>
          )}
        </div>

        {/* Context menu button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ⋯
          </button>
          {menuOpen && (
            <CardMenu
              item={item}
              onClose={() => setMenuOpen(false)}
              onAction={handleAction}
              onViewDetails={() => handleAction('view_details')}
              onViewOutbound={() => handleAction('view_outbound')}
            />
          )}
        </div>
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          <ContactBadge method={item.contact_method} value={item.contact_value} />
        </span>
        <StageBadge stage={item.board_stage} />
        <BlockerBadge blockers={item.blockers} />
        {item.warnings && item.warnings.length > 0 && <WarningChip />}
        {item.score != null && (
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-tertiary)' }}>
            {item.score}
          </span>
        )}
      </div>

      {/* Monitor reason */}
      {isMonitor && item.monitor_reason && (
        <div style={{
          fontSize: 11,
          color: 'var(--signal-amber)',
          background: 'rgba(245,158,11,0.1)',
          borderRadius: 4,
          padding: '4px 6px',
          marginBottom: 6,
          lineHeight: 1.4,
        }}>
          {item.monitor_reason}
        </div>
      )}

      {/* Brian-specific blockers */}
      {item.board_stage === 'send_blocked' && item.blockers.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {item.blockers.map((b, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--signal-rose)', fontWeight: 600 }}>
              ✕ {b}
            </div>
          ))}
        </div>
      )}

      {/* Last activity */}
      {item.last_activity && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: item.last_action ? 0 : 0 }}>
          {relativeTime(item.last_activity)}
          {item.last_action && ` · ${item.last_action.replace(/_/g, ' ')}`}
        </div>
      )}

      {/* Stage-gated actions */}
      <StageActions item={item} onAction={handleAction} loading={loading} />

      {/* Send-ready bottom accent */}
      {item.board_stage === 'ready_to_send' && item.can_send && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'var(--signal-emerald)',
          borderRadius: '0 0 8px 8px',
        }} />
      )}
    </div>
  );
}

// ── Column ───────────────────────────────────────────────
function BoardColumn({ column, items, onAction, onViewDetails, onViewOutbound, onSendConfirm }) {
  return (
    <div style={{
      minWidth: 240,
      maxWidth: 280,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: `2px solid ${STAGE_COLOR_MAP[column.key]?.border || 'var(--border)'}`,
        marginBottom: 8,
        position: 'sticky',
        top: 0,
        background: 'var(--bg-base)',
        zIndex: 10,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)' }}>
          {column.label}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          background: 'var(--bg-overlay)',
          color: 'var(--text-tertiary)',
          borderRadius: 10,
          padding: '1px 7px',
        }}>
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 8px', fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            No leads in this stage
          </div>
        ) : (
          items.map(item => (
            <PipelineCard
              key={item.id}
              item={item}
              onAction={onAction}
              onViewDetails={onViewDetails}
              onViewOutbound={onViewOutbound}
              onSendConfirm={onSendConfirm}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Board skeleton ───────────────────────────────────────
function BoardSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
      {STAGE_COLUMNS.map(col => (
        <div key={col.key} style={{ minWidth: 240, maxWidth: 280, flexShrink: 0 }}>
          <div style={{ height: 32, background: 'var(--bg-overlay)', borderRadius: 4, marginBottom: 8 }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 90, background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 8, opacity: 1 - i * 0.2 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Readiness banner ─────────────────────────────────────
function ReadinessBanner({ readiness }) {
  if (!readiness) return null;
  const { mailboxReady, policyReady, systemBlockers = [] } = readiness;
  if (mailboxReady && policyReady) return null;
  return (
    <div style={{
      background: 'var(--signal-rose)',
      color: '#fff',
      padding: '10px 16px',
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 13,
    }}>
      ✕ System blocked: {systemBlockers.join(', ')}. Outreach is halted until resolved.
    </div>
  );
}

// ── Main Pipeline component ───────────────────────────────
export default function Pipeline() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const { data, loading, error, execute } = useApi(
    () => apiPipeline(),
    [],
    { immediate: true }
  );

  const [activeTab, setActiveTab] = useState('all');
  const [sendConfirmItem, setSendConfirmItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filtered items ─────────────────────────────────────
  const filteredItems = () => {
    if (!data?.items) return [];
    const items = data.items;
    if (activeTab === 'all') return items;
    if (activeTab === 'active') return items.filter(i => ACTIVE_STAGES.has(i.board_stage));
    if (activeTab === 'send_ready') return items.filter(i => i.board_stage === 'ready_to_send' && i.can_send);
    if (activeTab === 'blocked') return items.filter(i => i.board_stage === 'send_blocked');
    if (activeTab === 'monitor') return items.filter(i => i.board_stage === 'monitor');
    if (activeTab === 'parked') return items.filter(i => i.board_stage === 'parked');
    if (activeTab === 'suppressed') return items.filter(i => i.board_stage === 'suppressed');
    return items;
  };

  // ── Items by stage ────────────────────────────────────
  const itemsByStage = () => {
    const result = {};
    for (const col of STAGE_COLUMNS) result[col.key] = [];
    for (const item of filteredItems()) {
      if (result[item.board_stage]) result[item.board_stage].push(item);
    }
    return result;
  };

  // ── Tab counts ────────────────────────────────────────
  const tabCounts = () => {
    if (!data?.items) return {};
    const items = data.items;
    return {
      all: items.length,
      active: items.filter(i => ACTIVE_STAGES.has(i.board_stage)).length,
      send_ready: items.filter(i => i.board_stage === 'ready_to_send' && i.can_send).length,
      blocked: items.filter(i => i.board_stage === 'send_blocked').length,
      monitor: items.filter(i => i.board_stage === 'monitor').length,
      parked: items.filter(i => i.board_stage === 'parked').length,
      suppressed: items.filter(i => i.board_stage === 'suppressed').length,
    };
  };

  // ── Action handler ────────────────────────────────────
  const handleAction = async (id, action) => {
    if (action === 'view_details') { navigate(`/contacts/${id}`); return; }
    if (action === 'view_outbound') { navigate('/outbound'); return; }
    if (action === 'refresh_readiness') {
      setRefreshing(true);
      await execute();
      setRefreshing(false);
      addToast({ type: 'success', message: 'Readiness refreshed.' });
      return;
    }
    try {
      await apiOutboundTransition(id, action);
      const messages = {
        content_approve: 'Content approved.',
        deploy_approve: 'Deployment approved.',
        send: 'Email sent!',
        suppress: 'Lead suppressed.',
        reactivate: 'Lead reactivated.',
        monitor: 'Lead moved to monitor.',
        park: 'Lead parked.',
      };
      addToast({ type: 'success', message: messages[action] || `Action '${action}' complete.` });
      execute();
    } catch (e) {
      addToast({ type: 'error', message: e.message || `Action failed: ${e.message}` });
    }
  };

  const handleSendConfirm = async () => {
    if (!sendConfirmItem) return;
    try {
      await apiOutboundTransition(sendConfirmItem.id, 'send');
      addToast({ type: 'success', message: 'Email sent!' });
      execute();
    } catch (e) {
      addToast({ type: 'error', message: e.message || 'Send failed.' });
    }
  };

  const counts = tabCounts();
  const byStage = itemsByStage();

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">Loading…</p>
        </div>
        <BoardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Pipeline</h1></div>
        <EmptyState
          title="Failed to load pipeline"
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
            <h1 className="page-title">Pipeline</h1>
            <p className="page-subtitle">
              {data?.items?.length || 0} lead{data?.items?.length !== 1 ? 's' : ''} total
              {refreshing && ' · refreshing…'}
            </p>
          </div>
        </div>
      </div>

      <ReadinessBanner readiness={data?.readiness} />

      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 20,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 0,
        overflowX: 'auto',
      }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--signal-emerald)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span style={{
                marginLeft: 6,
                background: activeTab === tab.key ? 'var(--signal-emerald)' : 'var(--bg-overlay)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: 11,
              }}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div style={{
        display: 'flex',
        gap: 16,
        overflowX: 'auto',
        paddingBottom: 24,
        alignItems: 'flex-start',
      }}>
        {STAGE_COLUMNS.map(col => (
          <BoardColumn
            key={col.key}
            column={col}
            items={byStage[col.key] || []}
            onAction={handleAction}
            onViewDetails={(item) => navigate(`/contacts/${item.crm_contact_id}`)}
            onViewOutbound={() => navigate('/outbound')}
            onSendConfirm={setSendConfirmItem}
          />
        ))}
      </div>

      {/* Send confirmation modal */}
      {sendConfirmItem && (
        <SendConfirmModal
          item={sendConfirmItem}
          onConfirm={handleSendConfirm}
          onClose={() => setSendConfirmItem(null)}
        />
      )}
    </div>
  );
}
