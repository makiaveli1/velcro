import React, { useEffect, useRef } from 'react';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function Modal({ title, children, footer, size = 'medium', onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const sizeClass = size === 'large' ? 'large' : size === 'small' ? 'small' : '';

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal-panel ${sizeClass}`} ref={panelRef} role="dialog" aria-modal="true">
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            {onClose && (
              <button className="modal-close btn-icon" onClick={onClose} aria-label="Close">
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
