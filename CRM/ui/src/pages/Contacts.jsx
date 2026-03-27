import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiContacts, apiCreateContact } from '../api';
import ScoreBar from '../components/ScoreBar';
import { PriorityBadge } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../App';
import { relativeTime, scoreColor, debounce } from '../utils';

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const limit = 20;

  const fetcher = useCallback(() => {
    const params = { limit, offset: page * limit };
    if (search.trim()) params.search = search.trim();
    if (priorityFilter !== 'all') params.priority = priorityFilter;
    return apiContacts(params);
  }, [search, priorityFilter, scoreFilter, page]);

  const { data, loading, error, execute } = useApi(fetcher, [search, priorityFilter, scoreFilter, page]);

  const debouncedSearch = useCallback(debounce((q) => { setSearch(q); setPage(0); }, 300), []);

  const total = data?.total || 0;
  const contacts = data?.items || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Contacts</h1>
            <p className="page-subtitle">
              {loading ? '…' : `${total} total`}
              {!loading && search && ` matching "${search}"`}
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              + Add Contact
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="search-input"
            placeholder="Search contacts…"
            defaultValue={search}
            onChange={e => debouncedSearch(e.target.value)}
            autoFocus={!!initialSearch}
          />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Priority:</span>
        {['all', 'critical', 'high', 'normal', 'low'].map(p => (
          <button
            key={p}
            className={`filter-chip ${priorityFilter === p ? 'active' : ''}`}
            onClick={() => { setPriorityFilter(p); setPage(0); }}
          >
            {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        {(search || priorityFilter !== 'all') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setPriorityFilter('all'); setPage(0); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table Header */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="contact-table-header">
          <span>Name / Company</span>
          <span>Score</span>
          <span>Priority</span>
          <span>Last Touch</span>
          <span style={{ textAlign: 'center' }}>Follow-up</span>
        </div>

        {loading && contacts.length === 0 ? (
          <ContactSkeleton />
        ) : error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--signal-rose)', fontSize: 13 }}>
            {error}
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            title={search ? 'No contacts match your search' : 'No contacts yet'}
            description={search ? 'Try a different search or clear filters.' : 'Add your first contact or connect Outlook to discover relationships.'}
            action={!search}
            actionLabel="Add Contact"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          contacts.map(contact => (
            <ContactRow
              key={contact.id}
              contact={contact}
              onClick={() => navigate(`/contacts/${contact.id}`)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </span>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← Prev
            </button>
            <button className="btn btn-secondary btn-sm" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>
              Next →
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onCreated={(contact) => {
            setShowAddModal(false);
            navigate(`/contacts/${contact.id}`);
          }}
        />
      )}
    </div>
  );
}

function ContactRow({ contact, onClick }) {
  return (
    <div className="contact-row" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div>
        <div className="contact-row-name">{contact.name}</div>
        <div className="contact-row-company">{contact.company || '—'}</div>
      </div>
      <div>
        {contact.relationship_score != null ? (
          <ScoreBar score={contact.relationship_score} showLabel size="sm" />
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
        )}
      </div>
      <div>
        {contact.priority ? (
          <PriorityBadge priority={contact.priority} />
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>
        )}
      </div>
      <div className="contact-row-date">{relativeTime(contact.last_touched_at)}</div>
      <div className="contact-row-followup">
        {contact.has_followup ? (
          <span title="Has pending follow-up" style={{ color: 'var(--signal-amber)', fontSize: 14 }}>⚠️</span>
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
        )}
      </div>
    </div>
  );
}

function ContactSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="contact-row" style={{ cursor: 'default', pointerEvents: 'none' }}>
          <div>
            <div className="skeleton skeleton-text" style={{ width: 140 }} />
            <div className="skeleton skeleton-text" style={{ width: 90, marginTop: 4 }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: 80 }} />
          <div className="skeleton skeleton-text" style={{ width: 60 }} />
          <div className="skeleton skeleton-text" style={{ width: 60 }} />
          <div />
        </div>
      ))}
    </>
  );
}

function AddContactModal({ onClose, onCreated }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    name: '', email: '', company: '', role: '', phone: '', priority: 'normal',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = await apiCreateContact(form);
      addToast({ type: 'success', message: 'Contact created' });
      onCreated(result.contact || result);
    } catch (err) {
      addToast({ type: 'error', message: `Error: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      title="Add Contact"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Creating…' : 'Create Contact'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={form.name} onChange={set('name')} placeholder="Full name" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Company</label>
          <input className="form-input" value={form.company} onChange={set('company')} placeholder="Company name" />
        </div>
        <div className="form-group">
          <label className="form-label">Role / Title</label>
          <input className="form-input" value={form.role} onChange={set('role')} placeholder="CEO, Engineer…" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+353…" />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-input form-select" value={form.priority} onChange={set('priority')}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
