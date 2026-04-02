import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiContact, apiScoreBreakdown, apiCreateFollowUp, apiUpdateFollowUp, apiApproveDraft, apiGenerateSummary, apiRejectDraft, apiCreateDraft, apiCreateInteraction, apiDrafts } from '../api';
import ScoreBar from '../components/ScoreBar';
import { PriorityBadge } from '../components/Badge';
import Timeline from '../components/Timeline';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../App';
import { relativeTime, formatDate, initials, scoreColor, scoreLabel, priorityVariant } from '../utils';

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

export default function ContactDossier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('summary');
  const [breakdownData, setBreakdownData] = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const fetcher = useCallback(() => Promise.all([
    apiContact(id),
    fetch(`/api/contacts/${id}/website-studio`).then(r => r.json()),
    apiDrafts({ contact_id: id }),
  ]), [id]);
  const { data, loading, error, execute } = useApi(fetcher, [id], { immediate: true });

  const loadBreakdown = useCallback(async () => {
    if (!id) return;
    try {
      const bd = await apiScoreBreakdown(id);
      setBreakdownData(bd);
    } catch (e) {
      // ignore
    }
  }, [id]);

  if (loading) return <DossierSkeleton />;
  if (error) return <ErrorState error={error} navigate={navigate} />;
  if (!data) return null;

  const [contactData = {}, websiteStudio = {}, draftsData = {}] = Array.isArray(data) ? data : [data, {}, {}];
  const { contact = {}, interactions = [], follow_ups: followUps = [], summary = {} } = contactData || {};
  const contactDrafts = draftsData?.drafts || [];

  const tabContent = {
    summary: (
      <SummaryTab contact={contact} summary={summary} onGenerateSummary={execute} />
    ),
    timeline: (
      <TimelineTab interactions={interactions} websiteStudio={websiteStudio} />
    ),
    drafts: (
      <DraftsTab contactId={id} drafts={contactDrafts} onAction={execute} addToast={addToast} />
    ),
  };

  return (
    <div>
      {/* Back */}
      <div
        className="dossier-back"
        data-automation-id="dossier-back"
        onClick={() => navigate('/contacts')}
      >
        <BackIcon /> Back to Contacts
      </div>

      {/* Dossier Header */}
      <div className="dossier-header">
        <div className="dossier-profile">
          <div className="dossier-avatar">{initials(contact.name)}</div>
          <div className="dossier-info">
            <div className="dossier-name">{contact.name}</div>
            <div className="dossier-meta">
              {contact.company && <span>{contact.company}</span>}
              {contact.role && <span>· {contact.role}</span>}
              {contact.email && <span>· <span className="font-mono">{contact.email}</span></span>}
              {contact.phone && <span>· {contact.phone}</span>}
            </div>
            <div className="dossier-score-row">
              {contact.relationship_score != null ? (
                <>
                  <ScoreBar score={contact.relationship_score} breakdown={breakdownData} onClick={loadBreakdown} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {scoreLabel(contact.relationship_score)}
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No score yet</span>
              )}
              {contact.priority && (
                <>
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>·</span>
                  <PriorityBadge priority={contact.priority} />
                </>
              )}
              {contact.last_touched_at && (
                <>
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>·</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Last touch: {relativeTime(contact.last_touched_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="dossier-actions" style={{ marginTop: 'var(--space-4)' }}>
          <button
            className="btn btn-primary btn-sm"
            data-automation-id="dossier-btn-generate-draft"
            onClick={() => setShowDraftModal(true)}
          >
            ✉️ Generate Draft
          </button>
          <button
            className="btn btn-secondary btn-sm"
            data-automation-id="dossier-btn-followup"
            onClick={() => setShowFollowUpModal(true)}
          >
            📅 Create Follow-up
          </button>
          <button
            className="btn btn-secondary btn-sm"
            data-automation-id="dossier-btn-log-interaction"
            onClick={() => setShowLogModal(true)}
          >
            📞 Log Interaction
          </button>
          {websiteStudio?.hasWebsiteStudioLead ? (
            <button
              className="btn btn-secondary btn-sm"
              data-automation-id="dossier-btn-review-canvas"
              onClick={() => navigate(`/contacts/${id}/review`)}
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              🧭 Review Canvas
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              data-automation-id="dossier-btn-start-review"
              onClick={() => navigate('/pipeline')}
              title="Add this contact to the Website Studio pipeline"
            >
              🌐 Add to Website Studio
            </button>
          )}
        </div>
      </div>

      {/* Website Studio / Review Canvas Section */}
      {websiteStudio?.hasWebsiteStudioLead === true ? (
        <>
          {/* Blocked / Ready banner */}
          {websiteStudio.outbound?.sendReady === false ? (
            <div
              data-automation-id="dossier-banner-blocked"
              style={{ background: 'var(--signal-rose)', color: '#fff', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}
            >
              ✕ Outbound BLOCKED —{' '}
              {websiteStudio.outbound?.sendBlockedReason === 'mailbox'
                ? 'Mailbox token expired — refresh to continue'
                : websiteStudio.outbound?.sendBlockedReason === 'policy'
                ? 'No outreach policy defined yet'
                : (websiteStudio.outbound?.deploymentBlockedBy || []).join(', ')}
            </div>
          ) : (
            <div
              data-automation-id="dossier-banner-ready"
              style={{ background: 'var(--signal-emerald)', color: '#fff', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}
            >
              ✓ Ready to send — both gates approved, all systems ready
            </div>
          )}

          {/* Review Canvas entry card */}
          <div
            data-automation-id="dossier-canvas-entry"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Concept Review Canvas</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 7px',
                    borderRadius: 9,
                    background: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {websiteStudio.concept?.hasConcept ? 'Concept Ready' : 'No Concept Yet'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Review the full concept package — website preview, brief, draft, QA, and approval — in one surface.
              </p>
              {websiteStudio.outbound?.outreachStage && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Pipeline stage:{' '}
                  <span style={{ color: 'var(--accent)' }}>
                    {String(websiteStudio.outbound.outreachStage || '').replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm"
              data-automation-id="dossier-btn-open-canvas"
              onClick={() => navigate(`/contacts/${id}/review`)}
            >
              Open Canvas →
            </button>
          </div>

          {/* Outbound Status Card */}
          <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outbound Status</div>
              <button
                className="btn btn-ghost btn-sm"
                data-automation-id="dossier-btn-open-outbound"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => navigate('/outbound')}
              >
                Open in Outbound Queue →
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: websiteStudio.outbound?.contentApproval === 'approved' ? 'var(--signal-emerald)' : 'var(--signal-amber)', color: websiteStudio.outbound?.contentApproval === 'approved' ? '#fff' : '#1a1a1a' }}>
                {websiteStudio.outbound?.contentApproval === 'approved' ? '✓' : '✕'} Content Approved
              </span>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: websiteStudio.outbound?.deploymentApproval === 'approved' ? 'var(--signal-emerald)' : 'var(--signal-amber)', color: websiteStudio.outbound?.deploymentApproval === 'approved' ? '#fff' : '#1a1a1a' }}>
                {websiteStudio.outbound?.deploymentApproval === 'approved' ? '✓' : '✕'} Deploy Approved
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {websiteStudio.outbound?.outreachStage ? String(websiteStudio.outbound.outreachStage).replace(/_/g, ' ') : 'unknown'}
              </span>
            </div>
            {websiteStudio.outbound?.warnings?.length > 0 && (
              <div style={{ marginTop: 6 }} data-automation-id="dossier-outbound-warnings">
                {websiteStudio.outbound.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--signal-amber)', marginBottom: 3 }}>⚠ {w}</div>
                ))}
              </div>
            )}
          </div>

          {/* Concept / Pitch Constraints */}
          {websiteStudio.concept?.constraints?.length > 0 && (
            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pitch Constraints</div>
              {websiteStudio.concept.constraints.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--signal-amber)', marginBottom: 4 }}>⚠ {c}</div>
              ))}
            </div>
          )}

          {/* Next Action */}
          {websiteStudio.nextAction && (
            <div
              data-automation-id="dossier-next-action"
              style={{ background: 'var(--signal-sky)', color: '#1a1a1a', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>NEXT ACTION</div>
              <div style={{ fontSize: 13 }}>{websiteStudio.nextAction.text}</div>
              {websiteStudio.nextAction.reason && (
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{websiteStudio.nextAction.reason}</div>
              )}
            </div>
          )}
        </>
      ) : (
        /* No Website Studio lead — show a prompt */
        <div
          data-automation-id="dossier-no-ws-prompt"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 10,
            padding: '20px',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 8 }}>🌐</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No Website Studio Package</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            This contact isn't in the Website Studio pipeline yet. Add them to start building their concept package.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            data-automation-id="dossier-btn-goto-pipeline"
            onClick={() => navigate('/pipeline')}
          >
            View Website Studio Pipeline →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" data-automation-id="dossier-tabs">
        {['summary', 'timeline', 'drafts'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            data-automation-id={`dossier-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'drafts' && contactDrafts.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 10, padding: '1px 5px', borderRadius: 9, fontWeight: 600 }}>
                {contactDrafts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>{tabContent[activeTab]}</div>

      {/* Modals */}
      {showFollowUpModal && (
        <FollowUpModal
          contactId={id}
          contactName={contact.name}
          onClose={() => setShowFollowUpModal(false)}
          onCreated={() => { setShowFollowUpModal(false); execute(); addToast({ type: 'success', message: 'Follow-up created' }); }}
          addToast={addToast}
        />
      )}
      {showDraftModal && (
        <DraftModal
          contactId={id}
          contactName={contact.name}
          onClose={() => setShowDraftModal(false)}
          onCreated={() => { setShowDraftModal(false); addToast({ type: 'info', message: 'Draft generation started' }); }}
          addToast={addToast}
        />
      )}
      {showLogModal && (
        <LogModal
          contactId={id}
          onClose={() => setShowLogModal(false)}
          onLogged={() => { setShowLogModal(false); execute(); addToast({ type: 'success', message: 'Interaction logged' }); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}
function SummaryTab({ contact, summary, onGenerateSummary }) {
  const [loading, setLoading] = useState(false);
  

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await apiGenerateSummary(contact.id);
      onGenerateSummary();
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const hasSummary = summary?.summary;

  return (
    <div className="summary-card">
      <div className="summary-header">
        <h3 className="summary-title">Relationship Summary</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {summary?.generated_at && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {relativeTime(summary.generated_at)}
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleRegenerate} disabled={loading}>
            {loading ? '↻ …' : '↻ Regenerate'}
          </button>
        </div>
      </div>

      {!hasSummary ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Not enough data yet. Interact with this contact to build their profile.
        </div>
      ) : (
        <>
          <p className="summary-text">{summary.summary}</p>

          {summary.key_topics?.length > 0 && (
            <div className="summary-tags" style={{ marginTop: 'var(--space-4)' }}>
              {summary.key_topics.map((t, i) => (
                <span key={i} className="summary-tag">{t}</span>
              ))}
            </div>
          )}

          {summary.communication_style && (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Comms style:</span>
              <span className="badge badge-accent">{summary.communication_style}</span>
            </div>
          )}

          {summary.relationship_type && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Relationship:</span>
              <span className="badge badge-default">{summary.relationship_type}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TimelineTab({ interactions, websiteStudio }) {
  const wsTimeline = websiteStudio?.timeline || [];

  if (wsTimeline.length > 0) {
    return (
      <div>
        {wsTimeline.map((entry, i) => (
          <div key={i} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{entry.action.replace(/_/g, ' ')}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatDate(entry.date)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.actor}</div>
            {entry.notes && <div style={{ fontSize: 12, marginTop: 4 }}>{entry.notes}</div>}
          </div>
        ))}
      </div>
    );
  }

  const items = (interactions || []).map(i => ({
    ...i,
    date: i.created_at || i.date,
  }));

  return (
    <Timeline
      items={items}
      emptyMessage="No interactions logged yet"
    />
  );
}

function DraftsTab({ drafts = [], contactId, onAction, addToast }) {
  const [expanded, setExpanded] = useState({});

  const handleApprove = async (draftId) => {
    try {
      await apiApproveDraft(draftId);
      addToast({ type: 'success', message: 'Draft approved — open your email client to send' });
      onAction();
    } catch (e) {
      addToast({ type: 'error', message: `Error: ${e.message}` });
    }
  };

  const handleReject = async (draftId) => {
    try {
      
      await apiRejectDraft(draftId);
      addToast({ type: 'info', message: 'Draft discarded' });
      onAction();
    } catch (e) {
      addToast({ type: 'error', message: `Error: ${e.message}` });
    }
  };

  if (!drafts.length) {
    return (
      <EmptyState
        title="No drafts for this contact"
        description="Generate a draft from the action bar above."
      />
    );
  }

  return (
    <div>
      {drafts.map((draft, i) => (
        <div key={draft.id} className="card" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">{draft.subject || 'Untitled draft'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {draft.contact_name} · {formatDate(draft.proposed_at || draft.created_at)}
                {draft.status && <span className={`badge badge-${draft.status === 'proposed' ? 'amber' : 'default'}`} style={{ marginLeft: 6 }}>{draft.status}</span>}
              </div>
            </div>
          </div>
          <div className="card-body">
            {draft.context_used && (
              <details style={{ marginBottom: 12 }}>
                <summary style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}>Context used</summary>
                <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {Array.isArray(draft.context_used) ? draft.context_used.map((c, j) => <div key={j}>• {c}</div>) : draft.context_used}
                </div>
              </details>
            )}
            {draft.body && (
              <details open={i === 0}>
                <summary style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}>Preview</summary>
                <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                  {draft.body}
                </div>
              </details>
            )}
            {draft.status === 'proposed' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 12 }}>
                <button className="btn btn-success btn-sm" onClick={() => handleApprove(draft.id)}>✓ Approve</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleReject(draft.id)} style={{ color: 'var(--signal-rose)' }}>Discard</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FollowUpModal({ contactId, contactName, onClose, onCreated, addToast }) {
  const [form, setForm] = useState({
    reason: '',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    priority: 'normal',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) return;
    setSaving(true);
    try {
      await apiCreateFollowUp({ contact_id: contactId, ...form });
      onCreated();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Follow-up for ${contactName}`} onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving || !form.reason.trim()}>{saving ? '…' : 'Create'}</button></>}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Reason *</label>
          <input className="form-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Follow up on proposal decision…" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Due date</label>
          <input className="form-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-input form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

function DraftModal({ contactId, contactName, onClose, onCreated, addToast }) {
  const [form, setForm] = useState({ tone: 'professional', follow_up_reason: '' });
  const [saving, setSaving] = useState(false);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCreateDraft({ contact_id: contactId, ...form });
      onCreated();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Generate Draft for ${contactName}`} onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>{saving ? 'Generating…' : 'Generate'}</button></>}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Tone</label>
          <select className="form-input form-select" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
            <option value="professional">Professional</option>
            <option value="warm">Warm</option>
            <option value="casual">Casual</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Follow-up reason (optional context)</label>
          <textarea className="form-input" rows={3} value={form.follow_up_reason} onChange={e => setForm(f => ({ ...f, follow_up_reason: e.target.value }))} placeholder="What do you want to follow up about?" />
        </div>
      </form>
    </Modal>
  );
}

function LogModal({ contactId, onClose, onLogged, addToast }) {
  const [form, setForm] = useState({ type: 'email', title: '', preview: '' });
  const [saving, setSaving] = useState(false);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await apiCreateInteraction(contactId, form);
      onLogged();
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to log interaction' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Log Interaction" onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? '…' : 'Log'}</button></>}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-input form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="email">Email</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Title / Subject *</label>
          <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description…" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-input" rows={3} value={form.preview} onChange={e => setForm(f => ({ ...f, preview: e.target.value }))} placeholder="Key points…" />
        </div>
      </form>
    </Modal>
  );
}

function DossierSkeleton() {
  return (
    <div>
      <div className="skeleton skeleton-text" style={{ width: 120, marginBottom: 16 }} />
      <div className="skeleton-card" style={{ height: 160, marginBottom: 24 }} />
      <div className="skeleton skeleton-text lg" style={{ width: 200, marginBottom: 16 }} />
      <div className="skeleton-card" style={{ height: 120 }} />
    </div>
  );
}

function ErrorState({ error, navigate }) {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-rose)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <div className="empty-state-title">Contact not found</div>
      <div className="empty-state-desc">{error}</div>
      <button className="btn btn-secondary" onClick={() => navigate('/contacts')}>Back to Contacts</button>
    </div>
  );
}
