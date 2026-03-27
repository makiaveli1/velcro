import React, { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { apiConfig, apiRunDiscovery } from '../api';
import { useToast } from '../App';

function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  );
}

export default function Settings() {
  const { addToast } = useToast();
  const fetcher = useCallback(() => apiConfig(), []);
  const { data, loading, error } = useApi(fetcher, [], { immediate: true });
  const [syncing, setSyncing] = useState(false);

  if (loading) return <Skeleton />;
  if (error) return <div style={{ color: 'var(--signal-rose)', padding: 'var(--space-6)' }}>{error}</div>;
  if (!data) return null;

  const {
    graph = {},
    discovery = {},
    emailDrafts = {},
  } = data;

  const [autoAdd, setAutoAdd] = useState(!!discovery?.autoAddMode?.thresholdReached);
  const [emailDraftsEnabled, setEmailDraftsEnabled] = useState(!!emailDrafts?.enabled);
  const [syncStatus, setSyncStatus] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await apiRunDiscovery();
      addToast({ type: 'info', message: result?.text || 'Discovery run started' });
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your CRM</p>
        </div>
      </div>

      {/* Microsoft Outlook */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">Microsoft Outlook</div>
        </div>
        <div className="settings-section-body">
          {graph?.authenticated ? (
            <>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label" style={{ color: 'var(--signal-emerald)' }}>
                    ● Connected
                  </div>
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
              <button className="btn btn-primary">Connect Outlook</button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Discovery */}
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

      {/* Relationship Intelligence */}
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

      {/* Email Drafts */}
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

      {/* Data */}
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
              <button className="btn btn-secondary btn-sm">Export CSV</button>
              <button className="btn btn-secondary btn-sm">Export JSON</button>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label" style={{ color: 'var(--signal-rose)' }}>Danger zone</div>
              <div className="settings-row-desc">Permanently delete all data. This cannot be undone.</div>
            </div>
            <button className="btn btn-danger btn-sm">Delete all data</button>
          </div>
        </div>
      </div>
    </div>
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
