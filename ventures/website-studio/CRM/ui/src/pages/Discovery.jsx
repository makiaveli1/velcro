import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiDiscovery, apiDiscoveryStats, apiApproveDiscovery, apiRejectDiscovery, apiSkipDiscovery } from '../api';
import SignalIndicator from '../components/SignalIndicator';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../App';
import { relativeTime } from '../utils';

export default function Discovery() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data, loading, error, execute } = useApi(async () => {
    const [items, stats] = await Promise.all([apiDiscovery(), apiDiscoveryStats()]);
    return { items: items?.items || [], stats };
  }, [], { immediate: true });

  const [skipModal, setSkipModal] = useState(null);
  const [skipForm, setSkipForm] = useState({ patternType: 'domain', patternValue: '' });
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('all');

  const handleApprove = async (id) => {
    try {
      const result = await apiApproveDiscovery(id);
      addToast({ type: 'success', message: `Contact approved${result?.contact?.name ? `: ${result.contact.name}` : ''}` });
      execute();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to approve: ${e.message}` });
    }
  };

  const handleReject = async (id) => {
    try {
      await apiRejectDiscovery(id);
      addToast({ type: 'info', message: 'Contact rejected' });
      execute();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to reject: ${e.message}` });
    }
  };

  const handleSkip = (item) => {
    setSkipForm({ patternType: 'domain', patternValue: item.email?.split('@')[1] || '' });
    setSkipModal(item);
  };

  const confirmSkip = async () => {
    if (!skipModal) return;
    try {
      const result = await apiSkipDiscovery(skipModal.id);
      const pattern = result?.patternType === 'domain' ? `@${result.patternValue}` : result?.patternValue;
      addToast({ type: 'info', message: `Skipped${pattern ? `: blocked ${pattern}` : ''}` });
      setSkipModal(null);
      execute();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to skip: ${e.message}` });
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredItems.map(i => i.id)));
    }
  };

  const bulkApprove = async () => {
    for (const id of selected) await handleApprove(id);
    setSelected(new Set());
  };

  const filteredItems = (data?.items || []).filter(item => {
    if (filter === 'all') return true;
    if (filter === 'high') return item.signal_quality?.toLowerCase() === 'high';
    if (filter === 'medium') return item.signal_quality?.toLowerCase() === 'medium';
    return true;
  });

  if (loading) return <DiscoverySkeleton />;
  if (error) return <ErrorState error={error} />;

  const { stats = {} } = data || {};

  return (
    <div className="content-queue">
      {/* Breadcrumb */}
      <div className="subpage-breadcrumb">
        <div className="breadcrumb-item">
          <a href="/contacts">CRM</a>
        </div>
        <span className="breadcrumb-sep">›</span>
        <div className="breadcrumb-item current">Discovery</div>
      </div>

      {/* Header */}
      <div className="subpage-header">
        <div className="subpage-header-row">
          <div className="subpage-header-main">
            <h1 className="subpage-title">Discovery Queue</h1>
            <p className="subpage-subtitle">{filteredItems.length} contact{filteredItems.length !== 1 ? 's' : ''} awaiting review</p>
          </div>
        </div>
      </div>

      {/* Auto-add progress */}
      {stats.decisionsTotal > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>Decisions since last review</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{stats.decisionsTotal} / 50</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(100, (stats.decisionsTotal / 50) * 100)}%` }} />
          </div>
          {stats.suggestAutoAdd && (
            <div className="autoadd-banner" style={{ marginTop: 16 }}>
              <svg className="autoadd-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="autoadd-banner-text">
                You've made <strong>50 decisions</strong>. Ready to enable auto-add?{' '}
                <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }} onClick={() => navigate('/settings')}>
                  Enable in Settings
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters + Bulk */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div className="filter-chips">
          {['all', 'high', 'medium', 'low'].map(f => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + ' signal'}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>{selected.size} selected</span>
            <button className="btn btn-success btn-sm" onClick={bulkApprove}>Approve selected</button>
          </div>
        )}
      </div>

      {/* Cards */}
      {filteredItems.length === 0 ? (
        <div className="empty-state-shell">
          <EmptyState
            title="Queue is clear"
            description="New contacts discovered from Outlook will appear here for review."
            icon={
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)" strokeWidth="1.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
        </div>
      ) : (
        filteredItems.map(item => (
          <DiscoveryCard
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onSelect={() => toggleSelect(item.id)}
            onApprove={() => handleApprove(item.id)}
            onReject={() => handleReject(item.id)}
            onSkip={() => handleSkip(item)}
          />
        ))
      )}

      {/* Skip Pattern Modal */}
      {skipModal && (
        <SkipPatternModal
          item={skipModal}
          form={skipForm}
          setForm={setSkipForm}
          onConfirm={confirmSkip}
          onClose={() => setSkipModal(null)}
        />
      )}
    </div>
  );
}

function DiscoveryCard({ item, selected, onSelect, onApprove, onReject, onSkip }) {
  const navigate = useNavigate();

  const sourceLabel = () => {
    const s = item.source || '';
    if (s === 'email_sender') return 'Email sender';
    if (s === 'calendar_attendee') return 'Calendar meeting';
    return s.replace(/_/g, ' ');
  };

  return (
    <div className="discovery-card">
      <div className="discovery-card-header">
        <div className="discovery-signal-bar" />
        <input
          type="checkbox"
          className="discovery-card-select"
          checked={selected}
          onChange={onSelect}
        />
        <div className="discovery-card-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="discovery-card-name">{item.name || item.email}</div>
            <SignalIndicator signalCount={item.signal_count} signalQuality={item.signal_quality} />
          </div>
          {item.email && <div className="discovery-card-email">{item.email}</div>}
          <div className="discovery-card-meta">
            {[item.company, item.role, item.location].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <div className="discovery-card-source">
        <strong>Source:</strong> {sourceLabel()}
        {item.signal_count > 0 && (
          <span style={{ marginLeft: 8 }}>· {item.signal_count} signal{item.signal_count !== 1 ? 's' : ''}</span>
        )}
      </div>

      {item.signal_count > 1 && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          {item.signal_count} email thread{item.signal_count !== 1 ? 's' : ''}
        </div>
      )}

      <div className="discovery-card-actions">
        <button className="btn btn-success btn-sm" onClick={onApprove}>
          ✓ Approve
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onReject} style={{ color: 'var(--signal-rose)' }}>
          ✕ Reject
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onSkip}>
          ⏭ Skip + Block
        </button>
      </div>
    </div>
  );
}

function SkipPatternModal({ item, form, setForm, onConfirm, onClose }) {
  return (
    <Modal
      title="Skip Pattern"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={!form.patternValue}>
            Add Rule + Reject
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Add a pattern to automatically skip similar contacts in the future.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label className="form-label">
          <input
            type="radio"
            name="ptype"
            checked={form.patternType === 'domain'}
            onChange={() => setForm({ patternType: 'domain', patternValue: item.email?.split('@')[1] || '' })}
            style={{ marginRight: 6 }}
          />
          Block this domain: @{item.email?.split('@')[1]}
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="form-label">
          <input
            type="radio"
            name="ptype"
            checked={form.patternType === 'email_prefix'}
            onChange={() => setForm({ patternType: 'email_prefix', patternValue: item.email?.split('@')[0] || '' })}
            style={{ marginRight: 6 }}
          />
          Block this email prefix: {item.email?.split('@')[0]}@
        </label>
      </div>
      {form.patternType === 'domain' && (
        <div className="form-group">
          <label className="form-label">Domain to block</label>
          <input
            className="form-input"
            value={form.patternValue}
            onChange={e => setForm({ ...form, patternValue: e.target.value })}
            placeholder="@example.com"
          />
        </div>
      )}
    </Modal>
  );
}

function DiscoverySkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div className="skeleton skeleton-text lg" style={{ width: 180 }} />
        <div className="skeleton skeleton-text" style={{ width: 120, marginTop: 8 }} />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-card" style={{ marginBottom: 16, height: 140 }} />
      ))}
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">Could not load discovery queue</div>
      <div className="empty-state-desc">{error}</div>
    </div>
  );
}
