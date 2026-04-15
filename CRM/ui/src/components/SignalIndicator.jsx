import React from 'react';

export default function SignalIndicator({ signalCount = 0, signalQuality = 'medium', label }) {
  const level = signalQuality?.toLowerCase() === 'high' ? 4
    : signalQuality?.toLowerCase() === 'medium' ? 2
    : 1;

  const colorClass = signalQuality?.toLowerCase() === 'high' ? ''
    : signalQuality?.toLowerCase() === 'medium' ? 'medium' : '';

  return (
    <div className="signal-indicator" title={`Signal: ${signalCount} interactions`}>
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`signal-dot ${i <= level ? `filled ${colorClass}` : ''}`}
        />
      ))}
      {label && <span className="signal-label">{label}</span>}
    </div>
  );
}
