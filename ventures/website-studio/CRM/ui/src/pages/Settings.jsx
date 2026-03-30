import React, { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { apiConfig, apiRunDiscovery, apiContacts, apiSystemStatus } from '../api';
import { useToast } from '../App';

// ── Status badge helpers ─────────────────────────────────────────────────────
function StatusBadge({ ok, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      color: ok ? 'var(--signal-emerald)' : 'var(--signal-rose)',
      border: `1px solid ${ok ? 'var(--signal-emerald)' : 'var(--signal-rose)'}`,
    }}>
      <span style={{ fontSize: 10 }}>{ok ? '●' : '✕'}</span>
      {label}
    </span>
  );
}

function PriorityTag({ priority }) {
  const color = priority === 'critical' ? 'var(--signal-rose)' : priority === 'warning' ? 'var(--signal-amber)' : 'var(--text-secondary)';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color, background: `${color}18`, padding: '2px 6px', borderRadius: 4,
    }}>
      {priority}
    </span>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface-raised)',
    }}>
      {icon}
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{title}</span>
    </div>
  );
}

// ── Main Settings component ──────────────────────────────────────────────────
export default function Settings() {
  const { addToast } = useToast();
  const [autoAdd, setAutoAdd] = useState(false);
  const [emailDraftsEnabled, setEmailDraftsEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: configData, loading: configLoading } = useApi(apiConfig, [], { immediate: true });
  const { data: systemData, loading: systemLoading } = useApi(apiSystemStatus, [], { immediate: true });

  React.useEffect(() => {
    if (configData?.discovery?.autoAddMode != null) {
      setAutoAdd(!!configData.discovery.autoAddMode.thresholdReached);
    }
    if (configData?.emailDrafts?.enabled != null) {
      setEmailDraftsEnabled(!!configData.emailDrafts.enabled);
    }
  }, [configData]);

  if (configLoading) return <Skeleton />;
  if (systemLoading) return <Skeleton />;

  const graph = configData?.graph || {};
  const discovery = configData?.discovery || {};

  const {
    overall = {},
    graph: graphDiag = {},
    mailbox = {},
    mailboxDetail = {},
    policy = {},
    tokenInfo = {},
    systemBlockers = [],
    systemWarnings = [],
    wsStats = {},
    nextFixes = [],
    sendingIdentity,
  } = systemData || {};

  const sendReady = overall.sendReady;
  const policyDetail = policy.detail || {};
  const tokenAgeLabel = tokenInfo.tokenAgeMinutes == null
    ? '—'
    : tokenInfo.tokenAgeMinutes >= 0
      ? `${tokenInfo.tokenAgeMinutes} min past expiry`
      : `expires in ${Math.abs(tokenInfo.tokenAgeMinutes)} min`;
  const mailboxBlockerLabel = {
    not_configured: 'Not configured',
    not_authenticated: 'Not authenticated',
    token_expired: 'Token expired',
    ready: 'Ready',
  }[mailboxDetail.blockerCode] || mailboxDetail.blockerCode || 'Unknown';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">System configuration and diagnostics</p>
        </div>
      </div>

      {/* ─── OUTBOUND SYSTEM DIAGNOSTICS ─── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Outbound System"
          icon={<OutboundIcon />}
        />
        <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>

          {/* Overall status banner */}
          <div style={{
            padding: '14px 16px',
            background: sendReady
              ? 'rgba(16,185,129,0.08)'
              : 'rgba(239,68,68,0.08)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sendReady ? 0 : 10 }}>
              <span style={{ fontSize: 18 }}>{sendReady ? '✓' : '✕'}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: sendReady ? 'var(--signal-emerald)' : 'var(--signal-rose)' }}>
                  {sendReady ? 'Outbound Ready' : 'Outbound Blocked'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {overall.sendReadyBecause || 'Checking system state…'}
                </div>
              </div>
            </div>
            {/* Quick status chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge ok={mailbox.ready} label={`Mailbox ${mailbox.ready ? 'Ready' : 'Blocked'}`} />
              <StatusBadge ok={policy.ready} label={`Policy ${policy.ready ? 'Defined' : 'Missing'}`} />
              <StatusBadge ok={graphDiag.authenticated} label={`Graph ${graphDiag.authenticated ? 'Connected' : 'Disconnected'}`} />
              {wsStats.approvedNotSent > 0 && (
                <StatusBadge ok={false} label={`${wsStats.approvedNotSent} approved, blocked`} />
              )}
              {wsStats.readyToSend > 0 && (
                <StatusBadge ok={true} label={`${wsStats.readyToSend} ready to send`} />
              )}
            </div>
          </div>

          {/* Detail grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

            {/* Mailbox detail */}
            <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Mailbox</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Graph config</span>
                  <span style={{ color: mailboxDetail.configured ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {mailboxDetail.configured ? 'Present' : 'Missing'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Live auth</span>
                  <span style={{ color: mailboxDetail.authenticated ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {mailboxDetail.authenticated ? 'Authenticated' : 'Not authenticated'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Token health</span>
                  <span style={{ color: mailboxDetail.tokenHealthy ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {mailboxDetail.tokenHealthy ? 'Healthy' : (graphDiag.tokenExpired ? 'Expired' : tokenInfo.tokenLoaded ? 'Unhealthy' : 'Missing')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Blocker code</span>
                  <span style={{ color: mailboxDetail.blockerCode === 'ready' ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {mailboxBlockerLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Reason</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right' }}>
                    {mailboxDetail.reason || mailbox.reason || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Next fix</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right' }}>
                    {mailboxDetail.nextFix || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Shared mailbox</span>
                  <span style={{ color: mailboxDetail.sharedMailboxConfigured ? 'var(--signal-emerald)' : 'var(--signal-amber)', fontWeight: 600 }}>
                    {mailboxDetail.sharedMailboxConfigured ? 'Configured' : 'Not configured yet'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Send-as verified</span>
                  <span style={{ color: mailboxDetail.sendAsVerified ? 'var(--signal-emerald)' : 'var(--signal-amber)', fontWeight: 600 }}>
                    {mailboxDetail.sendAsVerified ? 'Verified' : 'Not verified yet'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Token loaded</span>
                  <span style={{ color: tokenInfo.tokenLoaded ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {tokenInfo.tokenLoaded ? 'Yes' : 'No'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Token expires</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Token age</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tokenAgeLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sending identity</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>{sendingIdentity || '—'}</span>
                </div>
              </div>
            </div>

            {/* Policy detail */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Outreach Policy</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Policy file</span>
                  <span style={{ color: policy.fileExists ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {policy.fileExists ? 'Found' : 'Not found'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>File missing</span>
                  <span style={{ color: policy.fileMissing ? 'var(--signal-rose)' : 'var(--signal-emerald)', fontWeight: 600 }}>
                    {policy.fileMissing ? 'Yes' : 'No'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Policy status</span>
                  <span style={{ color: policy.ready ? 'var(--signal-emerald)' : 'var(--signal-rose)', fontWeight: 600 }}>
                    {policy.ready ? 'Defined' : 'Not defined'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Policy reason</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right' }}>{policy.reason || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Policy path</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>
                    {policyDetail.filePath || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Approval model</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Two-gate (content + deploy)</span>
                </div>
              </div>
            </div>
          </div>

          {/* System blockers */}
          {systemBlockers.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'rgba(239,68,68,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--signal-rose)', marginBottom: 6 }}>
                System Blockers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {systemBlockers.map(b => (
                  <div key={b} style={{ fontSize: 12, color: 'var(--signal-rose)' }}>
                    ✕ {b === 'mailbox'
                      ? (mailboxDetail.reason || 'Mailbox blocked')
                      : b === 'policy'
                        ? (policy.reason || 'Outreach policy not defined')
                        : b}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System warnings */}
          {systemWarnings.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'rgba(245,158,11,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--signal-amber)', marginBottom: 6 }}>
                Warnings
              </div>
              {systemWarnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--signal-amber)' }}>⚠ {w}</div>
              ))}
            </div>
          )}

          {/* Next fixes */}
          {nextFixes.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                Next Fixes Required
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nextFixes.map((fix, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <PriorityTag priority={fix.priority} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fix.action}</div>
                      {fix.reason && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{fix.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All clear state */}
          {sendReady && nextFixes.length === 0 && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--signal-emerald)', fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, color: 'var(--signal-emerald)', fontWeight: 600 }}>Outbound is fully operational.</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── MICROSOFT OUTLOOK ─── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">Microsoft Outlook</div>
        </div>
        <div className="settings-section-body">
          {graph?.authenticated ? (
            <>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label" style={{ color: 'var(--signal-emerald)' }}>● Connected</div>
                  <div className="settings-row-desc">Graph API — contacts, calendar, email</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
                  {syncing ? '↻ Syncing…' : '↻ Sync Now'}
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-label">Permissions</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Contacts', 'Calendar', 'Email'].map(p => (
                    <span key={p} className="badge badge-emerald">{p}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Connect Microsoft Outlook to sync contacts, calendar, and email.
              </div>
              <button className="btn btn-primary" onClick={handleSync}>Connect Outlook</button>
            </div>
          )}
        </div>
      </div>

      {/* ─── CONTACT DISCOVERY ─── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">Contact Discovery</div>
        </div>
        <div className="settings-section-body">
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Auto-add mode</div>
              <div className="settings-row-desc">
                {autoAdd ? 'Enabled — contacts are automatically added after approval threshold' : 'Manual — you approve each contact'}
              </div>
            </div>
            <Toggle
              id="autoadd-toggle"
              checked={autoAdd}
              onChange={setAutoAdd}
            />
          </div>

          {discovery?.autoAddMode && (
            <div className="settings-row">
              <div className="settings-row-label">Decisions made</div>
              <span className="font-mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {discovery.autoAddMode.decisions || 0} / 50
              </span>
            </div>
          )}

          <div className="settings-row">
            <div className="settings-row-label">Run discovery</div>
            <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Running…' : '↻ Run Now'}
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-label">Discovery sources</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge-emerald">Outlook Email</span>
              <span className="badge badge-emerald">Calendar</span>
              <span className="badge badge-default">LinkedIn (coming soon)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RELATIONSHIP INTELLIGENCE ─── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">Relationship Intelligence</div>
        </div>
        <div className="settings-section-body">
          <div className="settings-row">
            <div>
              <div className="settings-row-label">LLM Provider</div>
              <div className="settings-row-desc">Used for summaries and relationship analysis</div>
            </div>
            <span className="badge badge-accent">{graph?.llmProvider || 'OpenAI'}</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Embeddings</div>
              <div className="settings-row-desc">Used for semantic contact search</div>
            </div>
            <span className="badge badge-default">{graph?.embeddingsProvider || 'Local (Ollama)'}</span>
          </div>
        </div>
      </div>

      {/* ─── EMAIL DRAFTS ─── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">Email Drafts</div>
        </div>
        <div className="settings-section-body">
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Enable email drafts</div>
              <div className="settings-row-desc">
                AI generates draft emails for your review before sending.
                All drafts require explicit approval.
              </div>
            </div>
            <Toggle
              id="drafts-toggle"
              checked={emailDraftsEnabled}
              onChange={setEmailDraftsEnabled}
            />
          </div>
          <div className="settings-row">
            <div className="settings-row-label">Draft tone</div>
            <select className="form-input form-select" style={{ width: 'auto' }}>
              <option>Professional</option>
              <option>Warm</option>
              <option>Casual</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── DATA ─── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">Data</div>
        </div>
        <div className="settings-section-body">
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Export contacts</div>
              <div className="settings-row-desc">Download all your contacts as CSV or JSON</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>Export CSV</button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportJSON}>Export JSON</button>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label" style={{ color: 'var(--signal-rose)' }}>Danger zone</div>
              <div className="settings-row-desc">Permanently delete all data. This cannot be undone.</div>
            </div>
            <button className="btn btn-danger btn-sm" disabled title="Awaiting DELETE /api/wipe endpoint">Delete all data</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Inline handlers ───────────────────────────────────────────────────────
  async function handleSync() {
    setSyncing(true);
    try {
      const result = await apiRunDiscovery();
      addToast({ type: 'info', message: result?.text || 'Discovery run started' });
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleExportCSV() {
    try {
      const data = await apiContacts({ limit: 10000 });
      const contacts = data?.items || [];
      if (contacts.length === 0) { addToast({ type: 'info', message: 'No contacts to export' }); return; }
      const headers = ['name', 'email', 'company', 'role', 'phone', 'priority', 'relationship_score'];
      const rows = contacts.map(c => [c.name, c.email, c.company, c.role, c.phone, c.priority, c.relationship_score]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: `Exported ${contacts.length} contacts` });
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    }
  }

  async function handleExportJSON() {
    try {
      const data = await apiContacts({ limit: 10000 });
      const contacts = data?.items || [];
      if (contacts.length === 0) { addToast({ type: 'info', message: 'No contacts to export' }); return; }
      const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'contacts.json'; a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: `Exported ${contacts.length} contacts` });
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    }
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  );
}

function OutboundIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
      <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function Skeleton() {
  return (
    <div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="settings-section" style={{ marginBottom: 16 }}>
          <div className="skeleton skeleton-text md" style={{ width: 140, padding: '12px 20px' }} />
          <div style={{ padding: 20 }}>
            {[1, 2, 3].map(j => (
              <div key={j} className="skeleton skeleton-text" style={{ width: '100%', height: 40, marginBottom: 8 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
