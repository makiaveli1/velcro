import React, { useState } from 'react';
import { formatDate, interactionDotClass, interactionLabel } from '../utils';

export default function Timeline({ items = [], emptyMessage = 'No interactions yet' }) {
  const [expanded, setExpanded] = useState({});
  const visible = items.slice(0, 5);
  const hasMore = items.length > 5;

  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  if (!items.length) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <div className="empty-state-title">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {visible.map((item, i) => {
        const dotClass = interactionDotClass(item.type);
        const isOpen = !!expanded[i];
        return (
          <div key={item.id || i} className="timeline-item">
            <div className={`timeline-dot ${dotClass}`} />
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-date">{formatDate(item.date || item.created_at)}</span>
                <span className="timeline-type">{interactionLabel(item.type)}</span>
              </div>
              {item.title && <div className="timeline-title">{item.title}</div>}
              {item.preview && (
                <div
                  className="timeline-preview"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggle(i)}
                >
                  {isOpen ? item.preview : item.preview.slice(0, 100)}{!isOpen && item.preview.length > 100 ? '…' : ''}
                </div>
              )}
              {item.actions?.length > 0 && (
                <div className="timeline-actions">
                  {item.actions.map((a, j) => (
                    <button key={j} className="btn btn-ghost btn-sm">{a}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-start', marginTop: 8 }}
          onClick={() => {}}
        >
          Show more ({items.length - 5} more)
        </button>
      )}
    </div>
  );
}
