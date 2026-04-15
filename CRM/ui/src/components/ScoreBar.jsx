import React, { useState, useRef, useEffect } from 'react';
import { scoreColor, clamp } from '../utils';

export default function ScoreBar({ score = 0, breakdown = null, showLabel = true, size = 'md' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const barRef = useRef(null);

  const pct = clamp(score, 0, 100);
  const color = scoreColor(score);

  const breakpoints = [30, 50, 70];

  useEffect(() => {
    if (showTooltip && barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX });
    }
  }, [showTooltip]);

  const trackH = size === 'sm' ? 4 : 6;
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <div className="score-bar" style={{ position: 'relative' }}>
      <div
        ref={barRef}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: breakdown ? 'pointer' : 'default' }}
        onClick={() => breakdown && setShowTooltip(v => !v)}
        title={breakdown ? 'Click for breakdown' : undefined}
      >
        <div className="score-bar-track" style={{ height: trackH, flex: 1 }}>
          <div
            className="score-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        {showLabel && (
          <span className="score-bar-value" style={{ fontSize, color, minWidth: 36, flexShrink: 0 }}>
            {score}
          </span>
        )}
        {breakdown && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11, flexShrink: 0 }}>?</span>
        )}
      </div>

      {/* Breakpoint dots */}
      <div className="score-bar-labels" style={{ position: 'relative', height: 0, top: -4 }}>
        {breakpoints.map(bp => (
          <div
            key={bp}
            className="score-bar-breakpoint"
            style={{ left: `${bp}%` }}
          >
            <div className="score-bar-breakpoint-dot" />
          </div>
        ))}
      </div>

      {showTooltip && breakdown && (
        <ScoreBreakdownTooltip breakdown={breakdown} score={score} pos={tooltipPos} onClose={() => setShowTooltip(false)} />
      )}
    </div>
  );
}

function ScoreBreakdownTooltip({ breakdown, score, pos, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const { components = {} } = breakdown;
  const comps = [
    { key: 'recency', label: 'Recency', max: 30 },
    { key: 'frequency', label: 'Frequency', max: 25 },
    { key: 'priority', label: 'Priority', max: 20 },
    { key: 'signal', label: 'Signal', max: 25 },
  ];

  return (
    <div
      ref={ref}
      className="score-bar-tooltip"
      style={{
        position: 'fixed',
        top: pos.top,
        left: Math.min(pos.left, window.innerWidth - 280),
        zIndex: 300,
      }}
    >
      <div className="score-tooltip-title">
        Relationship Score: {score}
      </div>
      {comps.map(({ key, label, max }) => {
        const comp = components[key] || {};
        const val = comp.factor ?? 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        return (
          <div key={key} className="score-component">
            <span className="score-component-label">{label}</span>
            <div className="score-component-bar-wrap">
              <div
                className="score-component-bar"
                style={{ width: `${pct}%`, background: scoreColor(val) }}
              />
            </div>
            <span className="score-component-value">{val}/{max}</span>
          </div>
        );
      })}
      {breakdown.explanation && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
          {breakdown.explanation}
        </p>
      )}
    </div>
  );
}
