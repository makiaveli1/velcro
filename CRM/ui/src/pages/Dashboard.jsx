import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiDashboard, apiCreateFollowUp } from '../api';
import ScoreBar from '../components/ScoreBar';
import EmptyState from '../components/EmptyState';
import { relativeTime, formatFullDate } from '../utils';

// ── Stage config ─────────────────────────────────────────────────────────────
const STAGE_CHIPS = [
  { key: 'lead_found',       label: 'Lead Found' },
  { key: 'brief_created',    label: 'Brief Created' },
  { key: 'pitch_drafted',    label: 'Pitch Drafted' },
  { key: 'awaiting_content', label: 'Awaiting Content' },
  { key: 'content_approved', label: 'Content Approved' },
  { key: 'send_blocked',     label: 'Send Blocked' },
  { key: 'ready_to_send',    label: 'Ready to Send' },
  { key: 'sent',             label: 'Sent' },
  { key: 'monitor',          label: 'Monitor' },
  { key: 'parked',           label: 'Parked' },
  { key: 'suppressed',       label: 'Suppressed' },
];

const STAGE_COLORS = {
  send_blocked:     { bg: 'rgba(239,68,68,0.12)',  border: 'var(--signal-rose)',    text: 'var(--signal-rose)' },
  monitor:          { bg: 'rgba(245,158,11,0.10)', border: 'var(--signal-amber)',   text: 'var(--signal-amber)' },
  sent:             { bg: 'rgba(255,255,255,0.03)', border: 'var(--border)',         text: 'var(--text-tertiary)' },
  suppressed:       { bg: 'rgba(255,255,255,0.02)', border: 'var(--border)',         text: 'var(--text-tertiary)' },
  ready_to_send:    { bg: 'rgba(16,185,129,0.10)',  border: 'var(--signal-emerald)', text: 'var(--signal-emerald)' },
  awaiting_content: { bg: 'rgba(14,165,233,0.08)',  border: 'var(--signal-sky)',     text: 'var(--signal-sky)' },
  content_approved: { bg: 'rgba(14,165,233,0.08)',  border: 'var(--signal-sky)',     text: 'var(--signal-sky)' },
  lead_found:       { bg: 'transparent',             border: 'var(--border)',         text: 'var(--text-secondary)' },
  brief_created:    { bg: 'rgba(14,165,233,0.05)',  border: 'var(--signal-sky)',     text: 'var(--text-secondary)' },
  pitch_drafted:    { bg: 'transparent',             border: 'var(--border)',         text: 'var(--text-secondary)' },
  parked:           { bg: 'rgba(255,255,255,0.02)', border: 'var(--border)',         text: 'var(--text-tertiary)' },
};

const BLOCKER_LABELS = {
  mailbox: '✕ Mailbox',
  policy:  '✕ Policy',
};

function stageChipColor(key) {
  return STAGE_COLORS[key] || { bg: 'transparent', border: 'var(--border)', text: 'var(--text-secondary)' };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error } = useApi(apiDashboard, [], { immediate: true });

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const {
    contactsNeedingAttention = [],
    pendingFollowUps = [],
    discoveryQueueSize = 0,
    recentInteractions = [],
    weeklyStats = {},
    wsHealth = {},
    wsUrgent = [],
    wsReadiness = {},
    wsBlocked = [],
  } = data;

  const {
    totalLeads = 0,
    activeLeads = 0,
    sendBlocked = 0,
    readyToSend = 0,
    sent = 0,
    monitor = 0,
    pipeline = [],
  } = wsHealth;

  const pipelineMap = Object.fromEntries(pipeline.map(p => [p.stage, p.count]));
  const mailboxReason = wsReadiness.mailboxDetail?.reason || null;
  const policyReason = wsReadiness.policyDetail?.reason || null;
  const today = formatFullDate(new Date().toISOString());

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">{today}</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/pipeline')}>
              Pipeline
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/contacts')}>
              Contacts
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/contacts?new=1')}>
              + New
            </button>
          </div>
        </div>
      </div>

      {/* WS Health Strip */}
      {totalLeads > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          padding: '12px 16px', background: 'var(--surface-raised)',
          border: '1px solid var(--border)', borderRadius: 8, marginBottom: 20,
        }}>
          {STAGE_CHIPS.map(({ key, label }) => {
            const count = pipelineMap[key] || 0;
            const { bg, border, text } = stageChipColor(key);
            const isAlert = key === 'send_blocked' && count > 0;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6,
                background: bg, border: `1px solid ${border}`,
                fontSize: 12,
              }}>
                <span style={{ color: isAlert ? 'var(--signal-rose)' : text, fontWeight: isAlert ? 700 : 500 }}>
                  {count}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Two-column: WS Urgent + Outbound Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Left: Needs Attention Now */}
        <div className="card">
          <div className="card-body">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Needs Attention
            </div>
            {wsUrgent.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 13, color: 'var(--signal-emerald)' }}>All clear — no urgent WS items</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {wsUrgent.map(item => (
                  <WsUrgentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Outbound System Status */}
        <div className="card">
          <div className="card-body">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Outbound System
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Mailbox', ready: wsReadiness.mailboxReady },
                { label: 'Policy',  ready: wsReadiness.policyReady },
              ].map(({ label, ready }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: ready ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {ready ? '✓' : '✕'}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 11, color: ready ? 'var(--signal-emerald)' : 'var(--signal-rose)', marginLeft: 'auto' }}>
                    {ready ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              ))}
              {mailboxReason && !wsReadiness.mailboxReady && (
                <div style={{ fontSize: 11, color: 'var(--signal-rose)' }}>Mailbox: {mailboxReason}</div>
              )}
              {policyReason && !wsReadiness.policyReady && (
                <div style={{ fontSize: 11, color: 'var(--signal-rose)' }}>Policy: {policyReason}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: sendBlocked > 0 ? 'var(--signal-rose)' : 'var(--text-primary)' }}>{sendBlocked}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Approved, blocked</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: readyToSend > 0 ? 'var(--signal-emerald)' : 'var(--text-primary)' }}>{readyToSend}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Ready to send</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-tertiary)' }}>{sent}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Sent</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/outbound')} style={{ width: '100%' }}>
              Open Outbound Queue →
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Overview Bar */}
      {pipeline.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Pipeline Overview
            </div>
            {/* Horizontal stage bar */}
            <div style={{ display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden', marginBottom: 10, gap: 2 }}>
              {pipeline.map(({ stage, count }) => {
                const { bg, border } = stageChipColor(stage);
                const width = totalLeads > 0 ? (count / totalLeads * 100) : 0;
                if (width === 0) return null;
                return (
                  <div key={stage} title={`${stage}: ${count}`} style={{
                    width: `${width}%`, minWidth: count > 0 ? 24 : 0,
                    background: bg, border: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                    borderRadius: 4,
                  }}>
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
            {/* Stage legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
              {pipeline.map(({ stage, count, label }) => {
                const { border, text } = stageChipColor(stage);
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: border }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ color: text, fontWeight: 600 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CRM: Needs Attention */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Contacts Needs Attention</h2>
          <span className="section-link" onClick={() => navigate('/contacts?filter=attention')}>View all →</span>
        </div>
        {contactsNeedingAttention.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No CRM contacts urgently needing attention.
          </div>
        ) : (
          <div>
            {contactsNeedingAttention.slice(0, 5).map(c => (
              <AttentionCard key={c.id} contact={c} onOpen={() => navigate(`/contacts/${c.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* CRM: Follow-ups + Discovery */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Follow-ups Due</div>
              <span className="section-link" onClick={() => navigate('/followups')}>View all →</span>
            </div>
            {pendingFollowUps.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No follow-ups due</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pendingFollowUps.slice(0, 5).map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{f.contact_name || 'Unknown'}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{f.due_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Discovery Queue</div>
              <span className="section-link" onClick={() => navigate('/discovery')}>View all →</span>
            </div>
            {discoveryQueueSize === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Queue is empty</div>
            ) : (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--signal-amber)' }}>{discoveryQueueSize}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>pending review</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity + Score Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-body">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Recent Activity</div>
            {recentInteractions.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentInteractions.slice(0, 8).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: activityColor(item.type), flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-tertiary)', minWidth: 48 }}>{relativeTime(item.date)}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.contact_name || item.name || '—'} — {item.description || item.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <ScoreDistribution contacts={contactsNeedingAttention} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function WsUrgentCard({ item }) {

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 6, border: '1px solid var(--signal-rose)',
      background: 'rgba(239,68,68,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
        {item.type === 'blocked' && (
          <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--signal-rose)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
            BLOCKED
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{item.reason}</div>
      {/* Blocker badges */}
      {item.blockers?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          {item.blockers.map(b => (
            <span key={b} style={{ fontSize: 10, fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: 'var(--signal-rose)', padding: '2px 6px', borderRadius: 4 }}>
              {BLOCKER_LABELS[b] || `✕ ${b}`}
            </span>
          ))}
        </div>
      )}
      {/* Warning lines */}
      {item.warnings?.map((w, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--signal-amber)', marginBottom: 2 }}>⚠ {w}</div>
      ))}
      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/pipeline')} style={{ fontSize: 11, padding: '3px 8px' }}>
          Pipeline →
        </button>
        {item.crmContactId && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/contacts/${item.crmContactId}`)} style={{ fontSize: 11, padding: '3px 8px' }}>
            Dossier →
          </button>
        )}
      </div>
    </div>
  );
}

function AttentionCard({ contact, onOpen }) {
  const [loading, setLoading] = React.useState(false);

  const handleFollowUp = async () => {
    setLoading(true);
    try {
      await apiCreateFollowUp({
        contact_id: contact.id,
        reason: 'Check in — needs attention',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'high',
      });
    } catch (_) {}
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{contact.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{contact.company}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {contact.relationship_score != null && (
            <ScoreBar score={contact.relationship_score} showLabel size="sm" />
          )}
          <button className="btn btn-secondary btn-sm" onClick={onOpen}>Open</button>
          <button className="btn btn-primary btn-sm" onClick={handleFollowUp} disabled={loading}>
            {loading ? '…' : 'Follow Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreDistribution({ contacts }) {
  const segs = [
    { label: 'Cold (0–30)',  color: 'var(--signal-rose)',    range: [0, 30] },
    { label: 'Warm (31–50)', color: 'var(--signal-amber)',   range: [31, 50] },
    { label: 'Active (51–70)', color: 'var(--signal-sky)',    range: [51, 70] },
    { label: 'Strong (71–100)', color: 'var(--signal-emerald)', range: [71, 101] },
  ];

  // Build distribution from contactsNeedingAttention (score < 40 is already filtered)
  const counts = segs.map(seg => {
    if (!contacts || contacts.length === 0) return 0;
    return contacts.filter(c => {
      const s = c.relationship_score || 0;
      return s >= seg.range[0] && s < seg.range[1];
    }).length;
  });

  const total = counts.reduce((a, b) => a + b, 1);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Score Distribution</div>
      <div style={{ display: 'flex', gap: 8, height: 60, marginBottom: 10 }}>
        {segs.map((seg, i) => {
          const pct = Math.round((counts[i] / total) * 100);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%', height: `${Math.max(4, pct)}%`,
                  background: seg.color, borderRadius: 4, opacity: counts[i] > 0 ? 1 : 0.2,
                }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: counts[i] > 0 ? seg.color : 'var(--text-tertiary)' }}>{counts[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {segs.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{seg.label}: {counts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function activityColor(type) {
  const map = { email: 'var(--signal-sky)', meeting: 'var(--accent)', call: 'var(--signal-violet)', note: 'var(--text-tertiary)', draft: 'var(--signal-amber)' };
  return map[type?.toLowerCase()] || 'var(--accent)';
}

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div className="skeleton skeleton-text lg" style={{ width: 120, marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: 220 }} />
      </div>
      <div className="stat-cards">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-text" style={{ width: 80 }} />
            <div className="skeleton skeleton-text lg" style={{ width: 48, marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-rose)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <div className="empty-state-title">Could not load dashboard</div>
      <div className="empty-state-desc">{error}</div>
    </div>
  );
}
