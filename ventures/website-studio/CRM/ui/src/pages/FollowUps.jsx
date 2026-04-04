import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiFollowUps, apiCreateFollowUp, apiUpdateFollowUp } from '../api';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../App';
import { relativeTime, formatDate, priorityLabel } from '../utils';

export default function FollowUps() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [snoozing, setSnoozing] = useState(null);

  const fetcher = useCallback(() => apiFollowUps({ status: 'pending' }), []);
  const { data, loading, error, execute } = useApi(fetcher, [], { immediate: true });

  if (loading) return <Skeleton />;

  const followUps = data?.items || [];
  const today = new Date().toISOString().split('T')[0];

  const now = new Date();
  const overdue = followUps.filter(f => f.due_date && f.due_date < today && f.status !== 'completed');
  const todayItems = followUps.filter(f => f.due_date && f.due_date === today);
  const thisWeek = followUps.filter(f => {
    const d = new Date(f.due_date);
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  });

  const filtered = filter === 'overdue' ? overdue
    : filter === 'today' ? todayItems
    : filter === 'week' ? thisWeek
    : followUps;

  return (
    <div className="content-queue">
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Follow-ups</h1>
            <p className="page-subtitle">{followUps.length} pending</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              + New Follow-up
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-chips" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { key: 'all', label: `All (${followUps.length})` },
          { key: 'overdue', label: `Overdue (${overdue.length})`, alert: overdue.length > 0 },
          { key: 'today', label: `Today (${todayItems.length})` },
          { key: 'week', label: `This Week (${thisWeek.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            className={`filter-chip ${filter === tab.key ? 'active' : ''}`}
            style={tab.alert ? { borderColor: 'var(--signal-rose)', color: 'var(--signal-rose)' } : {}}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div style={{ color: 'var(--signal-rose)', fontSize: 13, padding: 'var(--space-4) 0' }}>{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No follow-ups"
          description={filter === 'all' ? 'All clear — no pending follow-ups.' : `No ${filter} follow-ups.`}
          icon={
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
      ) : (
        filtered.map(item => (
          <FollowUpCard
            key={item.id}
            item={item}
            today={today}
            navigate={navigate}
            onComplete={async () => {
              try {
                await apiUpdateFollowUp(item.id, { status: 'completed' });
                addToast({ type: 'success', message: 'Follow-up completed' });
                execute();
              } catch (e) {
                addToast({ type: 'error', message: e.message });
              }
            }}
            onSnooze={(until) => {
              apiUpdateFollowUp(item.id, { snoozed_until: until })
                .then(() => { addToast({ type: 'info', message: `Snoozed until ${formatDate(until)}` }); execute(); })
                .catch(e => addToast({ type: 'error', message: e.message }));
            }}
          />
        ))
      )}

      {showAddModal && (
        <AddFollowUpModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); execute(); addToast({ type: 'success', message: 'Follow-up created' }); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function FollowUpCard({ item, today, navigate, onComplete, onSnooze }) {
  const isOverdue = item.due_date && item.due_date < today;
  const isToday = item.due_date && item.due_date === today;

  return (
    <div className={`followup-item ${isOverdue ? 'overdue' : isToday ? 'today' : ''}`}>
      <div className="followup-item-header">
        <div>
          <div className="followup-contact-name">{item.contact_name}</div>
          {item.reason && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.reason}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className={`followup-due ${isOverdue ? 'overdue' : isToday ? 'today' : ''}`}>
            {isOverdue ? `Was due: ${formatDate(item.due_date)} · ${Math.abs(Math.floor((new Date(item.due_date) - new Date()) / 86400000))} days overdue` : isToday ? 'Due today' : formatDate(item.due_date)}
          </div>
          {item.priority && (
            <div style={{ marginTop: 4 }}>
              <span className={`badge ${isOverdue ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                {priorityLabel(item.priority)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="followup-actions">
        <button className="btn btn-success btn-sm" onClick={onComplete}>
          ✓ Complete
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/contacts/${item.contact_id}`)}>
          Open Contact
        </button>
        <SnoozeDropdown onSnooze={onSnooze} />
      </div>
    </div>
  );
}

function SnoozeDropdown({ onSnooze }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: 'Today evening', until: new Date(Date.now() + 8 * 3600000).toISOString() },
    { label: 'Tomorrow', until: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
    { label: 'In 3 days', until: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] },
    { label: 'In 1 week', until: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
  ];

  return (
    <div className="dropdown">
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(v => !v)}>
        ⏱ Snooze ▾
      </button>
      {open && (
        <div className="dropdown-menu">
          {options.map(opt => (
            <button key={opt.label} className="dropdown-item" onClick={() => { onSnooze(opt.until); setOpen(false); }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddFollowUpModal({ onClose, onCreated, addToast }) {
  const [form, setForm] = useState({ contact_id: '', reason: '', due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], priority: 'normal' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contact_id || !form.reason.trim()) return;
    setSaving(true);
    try {
      await apiCreateFollowUp(form);
      onCreated();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Follow-up" onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving || !form.contact_id || !form.reason.trim()}>{saving ? '…' : 'Create'}</button></>}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Contact ID or Name *</label>
          <input className="form-input" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} placeholder="Paste contact ID or name" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Reason *</label>
          <input className="form-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="What needs to be followed up?" />
        </div>
        <div className="form-group">
          <label className="form-label">Due date</label>
          <input className="form-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-input form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="skeleton skeleton-text lg" style={{ width: 160, marginBottom: 16 }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-card" style={{ height: 100, marginBottom: 12 }} />
      ))}
    </div>
  );
}
