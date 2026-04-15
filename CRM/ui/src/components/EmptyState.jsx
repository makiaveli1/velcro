import React from 'react';

export default function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
}) {
  const IconEl = icon || (
    <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <div className="empty-state">
      {IconEl}
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {action && (
        <button className="btn btn-secondary" onClick={onAction}>
          {actionLabel || 'Take action'}
        </button>
      )}
    </div>
  );
}
