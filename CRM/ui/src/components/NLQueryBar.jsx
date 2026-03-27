import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNLQuery } from '../hooks/useNLQuery';
import { relativeTime, scoreColor } from '../utils';

const SearchIcon = () => (
  <svg className="nl-query-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

export default function NLQueryBar() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading, error, query, clear } = useNLQuery();
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        clear();
        setValue('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clear]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!value.trim()) return;
    setOpen(true);
    query(value);
  }, [value, query]);

  const handleResultClick = useCallback((item) => {
    setOpen(false);
    clear();
    setValue('');
    if (item.type === 'contact' && item.id) {
      navigate(`/contacts/${item.id}`);
    } else if (item.type === 'followup' && item.contact_id) {
      navigate(`/contacts/${item.contact_id}`);
    } else if (item.action === 'search') {
      navigate(`/contacts?search=${encodeURIComponent(value)}`);
    }
  }, [navigate, clear, value]);

  return (
    <div className="nl-query-bar" ref={wrapRef}>
      <form onSubmit={handleSubmit} className="nl-query-input-wrap">
        <SearchIcon />
        <input
          ref={inputRef}
          className="nl-query-input"
          placeholder="Tell me about a contact, who needs attention…"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => value.trim() && setOpen(true)}
        />
        <span className="nl-query-kbd">⌘K</span>
      </form>

      {open && (
        <div className="nl-query-results">
          <div className="nl-query-results-header">
            {loading ? 'Searching…' : error ? `Error: ${error}` : value ? `"${value}"` : 'Type a query…'}
          </div>
          <div className="nl-query-results-body">
            {!loading && !error && results && (
              results.results?.length > 0 ? (
                results.results.map((item, i) => (
                  <ResultItem key={item.id || i} item={item} onClick={() => handleResultClick(item)} />
                ))
              ) : (
                <div className="nl-query-empty">
                  {results.response || 'No results found.'}
                  {value && (
                    <div className="mt-3">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleResultClick({ action: 'search' })}>
                        Search contacts
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
            {!loading && !results && !error && (
              <div className="nl-query-empty">
                Try: "Tell me about Brian", "Who needs attention?", "Stats"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultItem({ item, onClick }) {
  const icon = {
    contact: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
    followup: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    stat: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  }[item.type] || (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );

  return (
    <div className="nl-query-result-item" onClick={onClick}>
      <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{icon}</span>
      <div className="nl-query-result-info">
        <div className="nl-query-result-name">{item.name || item.label}</div>
        <div className="nl-query-result-meta">
          {item.meta && <span style={{ marginRight: 8 }}>{item.meta}</span>}
          {item.score != null && (
            <span style={{ color: scoreColor(item.score), fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              {item.score}/100
            </span>
          )}
          {item.last_touched && <span style={{ color: 'var(--text-tertiary)' }}> · Last: {relativeTime(item.last_touched)}</span>}
        </div>
        {item.sub && <div className="nl-query-result-meta" style={{ marginTop: 1 }}>{item.sub}</div>}
      </div>
      {item.action && (
        <span style={{ fontSize: 11, color: 'var(--accent)' }}>{item.action}</span>
      )}
    </div>
  );
}
