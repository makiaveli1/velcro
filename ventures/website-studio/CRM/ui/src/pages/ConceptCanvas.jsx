import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import {
  apiCanvas,
  apiCanvasApproveConcept,
  apiCanvasApproveDraft,
  apiCanvasChecklist,
  apiCanvasRequestRework,
  apiCanvasReviewNote,
} from '../api';
import EmptyState from '../components/EmptyState';
import { useToast } from '../App';
import { formatDate, formatFullDate, relativeTime } from '../utils';

const NAV_ITEMS = [
  { key: 'brief',    label: 'Concept Brief',     icon: '📄' },
  { key: 'website',  label: 'Website Preview',   icon: '🌐' },
  { key: 'outreach', label: 'Outreach Draft',     icon: '📧' },
  { key: 'qa',       label: 'QA Notes',          icon: '📋' },
  { key: 'package',  label: 'Package Summary',  icon: '📦' },
];

const CHECKLIST_ITEMS = [
  ['previewLoads',              'Preview loads'],
  ['mobileViewAcceptable',       'Mobile view acceptable'],
  ['screenshotsAttached',        'Screenshots attached'],
  ['trustClaimsVerified',        'Trust claims verified'],
  ['noUnverifiedCertifications', 'No unverified certifications'],
  ['draftReferencesConcept',     'Draft references concept'],
  ['publicUrlValid',            'Public preview URL valid'],
  ['qaPassed',                  'QA passed'],
  ['finalApprovalComplete',      'Final approval complete'],
];

const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet:  768,
  mobile:  375,
};

const TONE_CONFIG = {
  good: {
    bg:    'rgba(16, 185, 129, 0.10)',
    border:'rgba(16, 185, 129, 0.30)',
    dot:   '#10b981',
    text:  'var(--signal-emerald)',
  },
  warn: {
    bg:    'rgba(232, 164, 69, 0.10)',
    border:'rgba(232, 164, 69, 0.30)',
    dot:   '#e8a445',
    text:  'var(--accent)',
  },
  bad: {
    bg:    'rgba(244, 63, 94, 0.10)',
    border:'rgba(244, 63, 94, 0.30)',
    dot:   '#f43f5e',
    text:  'var(--signal-rose)',
  },
};

function kebabCase(value = '') {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function statusMeta(status) {
  const map = {
    approved:          ['badge badge-emerald', 'Approved'],
    not_started:       ['badge badge-default',  'Not Started'],
    internal_review:   ['badge badge-amber',   'Internal Review'],
    rework_needed:     ['badge badge-rose',     'Rework Needed'],
    building:          ['badge badge-sky',      'Building'],
    concept_review:    ['badge badge-amber',     'Concept Review'],
    concept_approved:  ['badge badge-emerald',   'Concept Approved'],
    outreach_drafted:  ['badge badge-violet',   'Outreach Drafted'],
    content_approved:  ['badge badge-sky',      'Draft Approved'],
    awaiting_send:     ['badge badge-emerald',   'Awaiting Send'],
  };
  return map[status] || ['badge badge-default', String(status || 'unknown').replace(/_/g, ' ')];
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function applyInlineMarkdown(value = '') {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function markdownToHtml(markdown = '') {
  if (!markdown?.trim()) return '';
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let listItems = [];
  let codeLines = [];
  let inCode = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${applyInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map(item => `<li>${applyInlineMarkdown(item)}</li>`).join('')}</ul>`);
    listItems = [];
  };
  const flushCode = () => {
    if (!codeLines.length) return;
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine || '';
    if (line.trim().startsWith('```')) {
      flushParagraph(); flushList();
      if (inCode) { flushCode(); inCode = false; } else { inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) { flushParagraph(); flushList(); html.push(`<h${headingMatch[1].length}>${applyInlineMarkdown(headingMatch[2])}</h${headingMatch[1].length}>`); continue; }
    const listMatch = line.match(/^[-*+]\s+(.+)$/);
    if (listMatch) { flushParagraph(); listItems.push(listMatch[1]); continue; }
    if (/^---+$/.test(line.trim())) { flushParagraph(); flushList(); html.push('<hr />'); continue; }
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushCode();
  return html.join('');
}

// ─── Upgraded PanelCard with tone-config ───────────────────────────────────────
function PanelCard({ title, value, tone = 'default', sub }) {
  const cfg = TONE_CONFIG[tone] || { bg: 'var(--bg-elevated)', border: 'var(--border-default)', dot: 'var(--text-tertiary)', text: 'var(--text-primary)' };
  return (
    <div
      className="card"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 14,
        transition: 'all 200ms ease',
        cursor: 'default',
      }}
    >
      <div className="card-body" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{title}</div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: cfg.text, letterSpacing: '-0.01em', marginBottom: 4 }}>{value}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Gate Row ─────────────────────────────────────────────────────────────────
function GateRow({ label, value, accent = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
      <span style={{ color: accent ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: accent ? 600 : 500 }}>{label}</span>
      {value
        ? <span className="badge badge-emerald" style={{ fontSize: 11 }}>Yes</span>
        : <span className="badge badge-rose"    style={{ fontSize: 11 }}>No</span>}
    </div>
  );
}

// ─── Device Frame (viewport chrome) ───────────────────────────────────────────
function DeviceFrame({ previewSrc, previewWidth, leadName }) {
  const [fading, setFading] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(previewSrc);

  useEffect(() => {
    if (previewSrc !== displaySrc) {
      setFading(true);
      const t = setTimeout(() => {
        setDisplaySrc(previewSrc);
        setFading(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [previewSrc]);

  const hostname = (() => { try { return new URL(displaySrc).hostname; } catch { return 'preview'; } })();

  return (
    <div style={{ margin: '0 auto', width: previewWidth, maxWidth: '100%', transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Chrome bar */}
      <div style={{
        borderRadius: '12px 12px 0 0',
        background: '#1e1e2e',
        border: '1px solid #313244',
        borderBottom: 'none',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}>
        {/* Traffic lights */}
        {['#ff5f57', '#febc2e', '#28c840'].map((color, i) => (
          <div key={i} className="device-chrome-dot" style={{ width: 12, height: 12, borderRadius: '50%', background: color, opacity: 0.85 }} />
        ))}
        {/* URL pill */}
        <div style={{
          marginLeft: 10, flex: 1,
          background: '#11111b', borderRadius: 6, padding: '4px 12px',
          fontSize: 11, color: '#6c7086', fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}>
          {hostname}
        </div>
      </div>
      {/* iframe */}
      <iframe
        title={`${leadName} concept preview`}
        src={displaySrc}
        sandbox="allow-scripts allow-same-origin"
        data-automation-id="canvas-preview-iframe"
        style={{
          display: 'block', width: '100%', minHeight: 820,
          border: '1px solid #313244', borderTop: 'none',
          borderRadius: '0 0 12px 12px', background: '#fff',
          opacity: fading ? 0 : 1,
          transition: 'opacity 300ms ease',
        }}
      />
    </div>
  );
}

// ─── Canvas Skeleton ──────────────────────────────────────────────────────────
function CanvasSkeleton() {
  return (
    <div style={{ minHeight: 'calc(100vh - 140px)' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        {/* Left rail */}
        <div className="card" style={{ width: 260, flexShrink: 0, background: 'var(--bg-surface)' }}>
          <div className="card-body" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 10 }} />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
            </div>
            {[80, 75, 70, 65, 60].map((w, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%`, height: 40, borderRadius: 8 }} />
            ))}
            <div style={{ marginTop: 'auto' }}>
              {[65, 55, 60].map((w, i) => (
                <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%`, marginBottom: 10 }} />
              ))}
            </div>
          </div>
        </div>
        {/* Center panel */}
        <div className="card" style={{ flex: 1, minWidth: 0, background: 'var(--bg-surface)' }}>
          <div className="card-header" style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-default)' }}>
            <div className="skeleton skeleton-text lg" style={{ width: 280, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: 160 }} />
          </div>
          <div className="card-body" style={{ padding: 28 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
              <div style={{ background: '#1e1e2e', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                {[12,12,12].map((s, i) => <div key={i} className="skeleton" style={{ width: s, height: s, borderRadius: '50%' }} />)}
                <div className="skeleton skeleton-text" style={{ marginLeft: 10, height: 22, borderRadius: 6, flex: 1, maxWidth: '60%' }} />
              </div>
              <div className="skeleton-card" style={{ height: 700, background: '#fff' }} />
            </div>
          </div>
        </div>
        {/* Right rail */}
        <div className="card" style={{ width: 300, flexShrink: 0, background: 'var(--bg-surface)' }}>
          <div className="card-body" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 4 }} />
            {[100,100,95,100,90].map((w, i) => (
              <div key={i} className="skeleton skeleton-card" style={{ height: 48, borderRadius: 10 }} />
            ))}
            <div style={{ marginTop: 8 }}>
              <div className="skeleton skeleton-text" style={{ width: '65%', marginBottom: 12 }} />
              {[100,100,100].map((w, i) => (
                <div key={i} className="skeleton skeleton-card" style={{ height: 36, borderRadius: 8, marginBottom: 8 }} />
              ))}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
              <div className="skeleton skeleton-card" style={{ height: 40, borderRadius: 8, marginBottom: 8 }} />
              <div className="skeleton skeleton-card" style={{ height: 40, borderRadius: 8 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────
export default function ConceptCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [mode,           setMode]           = useState('website');
  const [device,         setDevice]         = useState('desktop');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [reviewNote,     setReviewNote]     = useState('');
  const [immersive,      setImmersive]      = useState(false);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [busyAction,    setBusyAction]     = useState('');
  const [viewportWidth,  setViewportWidth]  = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  const fetchCanvas = useCallback(() => apiCanvas(id), [id]);
  const { data, loading, error, execute, setData } = useApi(fetchCanvas, [id], { immediate: true });

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const versions = data?.concept?.versions || [];
    if (versions.length && !selectedVersion) setSelectedVersion(versions[0].url);
  }, [data, selectedVersion]);

  // Escape key closes the utility drawer
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const collapsedRail = viewportWidth < 1200;
  const leadName = data?.contact?.name || data?.leadSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Lead';
  const [conceptBadgeClass, conceptBadgeLabel] = statusMeta(data?.concept?.status);
  const previewSrc    = selectedVersion || data?.concept?.publicPreviewUrl || data?.concept?.localPreviewPath || '';
  const previewWidth  = DEVICE_WIDTHS[device];
  const checklist     = data?.checklist || {};
  const readiness     = data?.readiness || {};
  const canMarkReady  = readiness.conceptApproved && readiness.previewValid && readiness.qaPassed
    && readiness.draftReady && readiness.mailboxReady && !checklist.finalApprovalComplete;

  const packageCards = useMemo(() => ([
    { title: 'Concept',  value: readiness.conceptApproved ? 'Approved'     : 'Pending',       tone: readiness.conceptApproved ? 'good' : 'warn', sub: data?.concept?.type?.replace(/_/g, ' ') || 'Homepage mock' },
    { title: 'Preview',  value: readiness.previewValid    ? 'Verified'     : 'Needs Review',  tone: readiness.previewValid    ? 'good' : 'warn', sub: data?.concept?.publicPreviewUrl ? 'Public preview linked' : 'Local preview route active' },
    { title: 'QA',      value: readiness.qaPassed         ? 'Passed'       : 'Open Findings', tone: readiness.qaPassed         ? 'good' : 'bad',  sub: `${data?.concept?.qaFindings?.length || 0} findings recorded` },
    { title: 'Draft',   value: readiness.draftReady       ? 'Ready'        : 'Incomplete',    tone: readiness.draftReady       ? 'good' : 'warn', sub: data?.outreach?.stage?.replace(/_/g, ' ') || 'outreach drafted' },
    { title: 'Mailbox', value: readiness.mailboxReady     ? 'Ready'        : 'Blocked',       tone: readiness.mailboxReady     ? 'good' : 'bad',  sub: readiness.mailboxReady ? 'System gate passed' : 'Outbound system needs attention' },
    { title: 'Send',    value: readiness.sendReady        ? 'READY'        : 'Blocked',       tone: readiness.sendReady        ? 'good' : 'bad',  sub: readiness.sendReady ? 'Final gates cleared' : `${readiness.blockers?.length || 0} blocker(s)` },
  ]), [data, readiness]);

  const qaMarkdown = useMemo(() => {
    const findings = data?.concept?.qaFindings || [];
    const notes    = data?.reviewNotes || [];
    const sections  = [];
    if (findings.length) { sections.push('## QA Findings'); findings.forEach(f => sections.push(`- ${f}`)); }
    if (notes.length)     { sections.push('', '## Review Notes'); notes.forEach(n => sections.push(`- ${n}`)); }
    return sections.join('\n');
  }, [data]);

  const currentDocument = useMemo(() => {
    if (!data) return '';
    if (mode === 'brief')    return data.concept?.conceptBrief || '';
    if (mode === 'outreach') return data.outreach?.draft || data.outreach?.pitch || '';
    if (mode === 'qa')       return qaMarkdown;
    return '';
  }, [data, mode, qaMarkdown]);

  const mutateChecklist = async (item, checked) => {
    const previous = data;
    setData(current => current ? { ...current, checklist: { ...current.checklist, [item]: checked } } : current);
    try {
      await apiCanvasChecklist(id, item, checked);
      await execute();
    } catch (err) {
      setData(previous);
      addToast({ type: 'error', message: err.message || 'Failed to update checklist' });
    }
  };

  const runAction = async (key, action) => {
    setBusyAction(key);
    try { await action(); await execute(); addToast({ type: 'success', message: key.replace(/-/g, ' ') }); }
    catch (err)        { addToast({ type: 'error', message: err.message || 'Action failed' }); }
    finally             { setBusyAction(''); }
  };

  const submitReviewNote = async () => {
    if (!reviewNote.trim()) return;
    setSubmittingNote(true);
    try {
      await apiCanvasReviewNote(id, reviewNote.trim());
      setReviewNote('');
      await execute();
      addToast({ type: 'success', message: 'Review note added' });
    } catch (err) { addToast({ type: 'error', message: err.message || 'Failed to add review note' }); }
    finally       { setSubmittingNote(false); }
  };

  if (loading) return <CanvasSkeleton />;
  if (error)   return (
    <div className="card"><div className="card-body" style={{ padding: 28 }}>
      <EmptyState title="Canvas failed to load" description={error} action actionLabel="Retry" onAction={execute} />
    </div></div>
  );
  if (!data) return null;

  const modePanelKey = `${mode}-${device}`;

  return (
    <div
      className={`canvas-page${collapsedRail ? ' collapsed' : ''}${immersive ? ' immersive' : ''}`}
      style={{ minHeight: 'calc(100vh - 140px)' }}
    >

      {/* ── Immersive floating bar ───────────────────────────────── */}
      {immersive && (
        <div className="immersive-bar" data-automation-id="immersive-bar">
          <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
            {leadName}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px',
            background: 'rgba(232, 164, 69, 0.2)',
            border: '1px solid rgba(232, 164, 69, 0.4)',
            borderRadius: 999, color: 'var(--accent)', letterSpacing: '0.05em',
          }}>
            ● Focus Mode
          </span>
          {mode === 'website' && (
            <div style={{ display: 'inline-flex', marginLeft: 8, padding: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 999 }}>
              {(['desktop', 'tablet', 'mobile']).map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`btn btn-sm ${device === opt ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setDevice(opt)}
                  data-automation-id={`canvas-device-${opt}`}
                  style={{ minWidth: 72, textTransform: 'capitalize' }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            data-automation-id="canvas-btn-exit-immersive"
            onClick={() => setImmersive(false)}
            style={{ marginLeft: 'auto' }}
          >
            Exit Focus
          </button>
        </div>
      )}

      {/* ── Immersive bottom status strip ────────────────────────── */}
      {immersive && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(30, 30, 46, 0.92)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          animation: 'immersivePillReveal 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <span className={`badge ${readiness.blockers?.length ? 'badge-rose' : 'badge-emerald'}`}>
              {readiness.blockers?.length ? `${readiness.blockers.length} blocker(s)` : 'No blockers'}
            </span>
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success btn-sm" onClick={() => runAction('Approve Concept', () => apiCanvasApproveConcept(id))}>✓ Approve</button>
            <button className="btn btn-secondary btn-sm" onClick={() => runAction('Request Rework', () => apiCanvasRequestRework(id))}>↺ Rework</button>
            <button className="btn btn-primary btn-sm" disabled={!canMarkReady} onClick={() => runAction('Mark Ready to Send', () => apiCanvasChecklist(id, 'finalApprovalComplete', true))}>Mark Ready</button>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>·</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setDrawerOpen(true)} style={{ color: '#a6adc8' }}>
            ☰ More
          </button>
        </div>
      )}

      {/* ── Left Rail ─────────────────────────────────────────────── */}
      <aside
        data-automation-id="canvas-left-rail"
        style={{
          flexShrink:    0,
          background:    'var(--bg-surface)',
          borderRadius:  12,
          overflow:      'hidden',
          display:       'flex',
          flexDirection: 'column',
          boxShadow:     '0 2px 12px rgba(0,0,0,0.20)',
        }}
      >
        <div style={{ padding: collapsedRail ? 14 : 16, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

          {/* Lead header block */}
          <div style={{
            padding:       '14px 16px',
            background:    'var(--bg-elevated)',
            borderRadius:  12,
            border:        '1px solid var(--border-default)',
          }}>
            {!collapsedRail && (
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>
                Concept Review
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsedRail ? 'center' : 'space-between', gap: 10 }}>
              {!collapsedRail && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{leadName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, textTransform: 'capitalize' }}>
                    {String(data.concept?.type || 'homepage_mock').replace(/_/g, ' ')}
                  </div>
                </div>
              )}
              <span className={conceptBadgeClass} data-automation-id="canvas-status-badge">
                {collapsedRail ? '●' : conceptBadgeLabel}
              </span>
            </div>
            {!collapsedRail && data.contact?.email && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>{data.contact.email}</div>
            )}
          </div>

          {/* Nav */}
          {!collapsedRail && (
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, padding: '0 4px' }}>
              Assets
            </div>
          )}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_ITEMS.map(item => {
              const active = mode === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key)}
                  className={`sidebar-item ${active ? 'active' : ''}`}
                  data-automation-id={`canvas-nav-${item.key}`}
                  style={{ justifyContent: collapsedRail ? 'center' : 'flex-start', paddingInline: collapsedRail ? 10 : 14 }}
                >
                  <span style={{ fontSize: 17 }}>{item.icon}</span>
                  {!collapsedRail && <span style={{ fontSize: 13 }}>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Screenshots, metadata, version — moved to utility drawer */}
        </div>
      </aside>

      {/* ── Center Panel ──────────────────────────────────────────── */}
      <main
        data-automation-id="canvas-center-panel"
        style={{
          flex:            1,
          minWidth:        0,
          background:      'var(--bg-surface)',
          borderRadius:    12,
          boxShadow:       '0 2px 16px rgba(0,0,0,0.18)',
          display:         'flex',
          flexDirection:   'column',
          overflow:        'hidden',
        }}
      >
        {/* Header — compact single row, ~52px */}
        <div style={{
          padding:     '14px 20px',
          borderBottom:'1px solid var(--border-default)',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
          gap:          16,
          flexShrink:  0,
        }}>
          {/* Left: breadcrumb trail + page title */}
          <div>
            <div style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 2,
            }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/contacts')}
                style={{ paddingInline: 0, fontSize: 12, color: 'var(--text-secondary)' }}
              >
                Contacts
              </button>
              <span style={{ opacity: 0.4 }}>›</span>
              <span>{leadName}</span>
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              {mode === 'website' ? 'Website Preview' : mode === 'package' ? 'Package Summary' : ''}
            </div>
          </div>

          {/* Right: icon controls cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Device switcher — only in website mode, hidden in immersive */}
            {mode === 'website' && !immersive && (
              <div style={{ display: 'inline-flex', padding: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 999 }}>
                {(['desktop', 'tablet', 'mobile']).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`btn btn-sm ${device === opt ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setDevice(opt)}
                    data-automation-id={`canvas-device-${opt}`}
                    style={{ minWidth: 68, textTransform: 'capitalize', fontSize: 12 }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Open in new tab */}
            <button
              className="btn btn-secondary btn-sm"
              data-automation-id="canvas-open-tab"
              onClick={() => previewSrc && window.open(previewSrc, '_blank', 'noopener,noreferrer')}
              disabled={!previewSrc}
              title="Open preview in new tab"
            >
              ↗
            </button>

            {/* Focus mode toggle */}
            {!immersive ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setImmersive(true)}
                title="Focus mode — hide sidebars"
                data-automation-id="canvas-enter-immersive"
              >
                Focus
              </button>
            ) : null}

            {/* Hamburger — canvas utilities */}
            <button
              className="hamburger-btn"
              data-automation-id="canvas-btn-drawer"
              onClick={() => setDrawerOpen(v => !v)}
              title="Canvas utilities"
              aria-label="Open canvas utilities"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>
        </div>

        {/* Mode content — bounded scroll container */}
        <div className="card-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Website Preview */}
          {mode === 'website' && (
            <div key={modePanelKey} data-mode-panel>
              {previewSrc
                ? <DeviceFrame previewSrc={previewSrc} previewWidth={previewWidth} leadName={leadName} />
                : <EmptyState title="Preview not available yet" description="No saved public or local concept preview for this lead yet." />
              }
            </div>
          )}

          {/* Document modes */}
          {mode !== 'website' && mode !== 'package' && (
            <div key={modePanelKey} data-mode-panel className="card" style={{ background: 'var(--bg-elevated)' }}>
              <div className="card-body" style={{ padding: 24 }}>
                {/* Sticky document sub-header */}
                <div className="panel-doc-header">
                  {NAV_ITEMS.find(i => i.key === mode)?.label || ''}
                </div>
                {/* Constrained reading width content */}
                {currentDocument ? (
                  <div className="doc-content"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(currentDocument) }} />
                ) : (
                  <EmptyState
                    title={mode === 'brief' ? 'Concept brief missing' : mode === 'outreach' ? 'Outreach draft missing' : 'QA notes missing'}
                    description={mode === 'brief' ? 'Add a CONCEPT_BRIEF.md file to populate this panel.'
                      : mode === 'outreach' ? 'Add OUTREACH_DRAFT.md or PITCH.md to populate this panel.'
                      : 'Add CONCEPT_APPROVAL.md or review notes to populate this panel.'}
                  />
                )}
              </div>
            </div>
          )}

          {/* Package Summary */}
          {mode === 'package' && (
            <div key={modePanelKey} data-mode-panel className="package-grid">
              <div className="package-section-label">Readiness Summary</div>
              {packageCards.map(card => <PanelCard key={card.title} {...card} />)}
            </div>
          )}

        </div>
      </main>

      {/* ── Right Rail — Essential signal + sticky actions ────────── */}
      <aside
        data-automation-id="canvas-right-rail"
        className={readiness.blockers?.length ? 'has-blockers' : ''}
        style={{
          flexShrink: 0,
          background:'var(--bg-surface)',
          borderRadius: 12,
          display:    'flex',
          flexDirection: 'column',
          boxShadow:  '0 2px 12px rgba(0,0,0,0.20)',
          overflow:  'hidden',
        }}
      >
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>

          {/* ── Blockers — always visible ───────────────────────────── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Blockers</div>
              <span
                className={`badge ${readiness.blockers?.length ? 'badge-rose' : 'badge-emerald'}`}
                data-automation-id="canvas-send-readiness"
                style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', letterSpacing: '0.05em' }}
              >
                {readiness.sendReady ? 'Ready' : 'Blocked'}
              </span>
            </div>
            <div data-automation-id="canvas-blockers-list" style={{ display: 'grid', gap: 8 }}>
              {readiness.blockers?.length
                ? readiness.blockers.map(b => (
                    <div key={b} style={{
                      padding: '9px 12px', borderRadius: 10,
                      background: 'rgba(244, 63, 94, 0.12)',
                      border:    '1px solid rgba(244, 63, 94, 0.20)',
                      fontSize:   12, color: 'var(--signal-rose)',
                    }}>
                      {b}
                    </div>
                  ))
                : (
                  <div style={{
                    padding: '9px 12px', borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.10)',
                    border:    '1px solid rgba(16, 185, 129, 0.20)',
                    fontSize:   12, color: 'var(--signal-emerald)',
                  }}>
                    No blockers — ready to proceed.
                  </div>
                )
              }
            </div>
          </section>

        </div>

        {/* ── Last verified timestamp (moved from center header) ──── */}
        <div style={{
          fontSize:        11,
          color:           'var(--text-tertiary)',
          textAlign:       'center',
          borderTop:       '1px solid var(--border-subtle)',
          paddingTop:      12,
          paddingBottom:   12,
          paddingInline:  18,
          marginTop:       4,
        }}>
          {data.concept?.previewVerifiedAt
            ? `Preview verified ${relativeTime(data.concept.previewVerifiedAt)}`
            : 'Preview not yet verified'}
        </div>

        {/* ── Sticky Action Buttons — 2x2 grid: Decision + Handoff ───── */}
        <div style={{
          padding:        '14px 18px',
          borderTop:      '1px solid var(--border-default)',
          display:        'flex',
          flexDirection: 'column',
          gap:            12,
          position:       'sticky',
          bottom:         0,
          background:     'var(--bg-surface)',
          flexShrink:     0,
        }}>
          {/* Decision group */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              data-automation-id="canvas-btn-request-rework"
              disabled={busyAction === 'Request Rework'}
              onClick={() => runAction('Request Rework', () => apiCanvasRequestRework(id))}
              style={{ borderColor: 'rgba(232, 164, 69, 0.3)', color: 'var(--accent)' }}
            >
              {busyAction === 'Request Rework' ? 'Sending…' : '↺ Rework'}
            </button>
            <button
              className="btn btn-success btn-sm"
              data-automation-id="canvas-btn-approve-concept"
              disabled={data.concept?.status === 'approved' || busyAction === 'Approve Concept'}
              onClick={() => runAction('Approve Concept', () => apiCanvasApproveConcept(id))}
            >
              {busyAction === 'Approve Concept' ? 'Approving…' : '✓ Approve'}
            </button>
          </div>
          {/* Handoff group */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              data-automation-id="canvas-btn-approve-draft"
              disabled={(!data.outreach?.draft && !data.outreach?.pitch) || data.outreach?.contentApproval === 'approved' || busyAction === 'Approve Draft'}
              onClick={() => runAction('Approve Draft', () => apiCanvasApproveDraft(id))}
              style={{ borderColor: 'rgba(56, 189, 248, 0.25)', color: 'var(--signal-sky)' }}
            >
              {busyAction === 'Approve Draft' ? 'Approving…' : '✓ Draft'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!canMarkReady || busyAction === 'Mark Ready to Send'}
              onClick={() => runAction('Mark Ready to Send', () => apiCanvasChecklist(id, 'finalApprovalComplete', true))}
            >
              {busyAction === 'Mark Ready to Send' ? 'Saving…' : 'Send →'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Utility Drawer backdrop ─────────────────────────────── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.3)',
            animation: 'fadeIn 200ms ease forwards',
          }}
        />
      )}

      {/* ── Utility Drawer — screenshots, metadata, notes, review gates */}
      {drawerOpen && (
        <div
          className="utility-drawer"
          data-automation-id="canvas-utility-drawer"
          role="dialog"
          aria-label="Canvas utilities"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Canvas Utilities</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close utilities"
              style={{ padding: '4px 8px', fontSize: 13 }}
            >
              ✕
            </button>
          </div>

          {(data.concept?.screenshots?.length ?? 0) > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Screenshots</div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                {data.concept.screenshots.map(src => (
                  <a key={src} href={src} target="_blank" rel="noreferrer"
                    style={{ display: 'block', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                    <img src={src} alt="Screenshot" style={{ display: 'block', width: '100%', height: 88, objectFit: 'cover' }} />
                  </a>
                ))}
              </div>
              {(data.concept?.versions?.length ?? 0) > 1 && (
                <select
                  className="form-input form-select"
                  value={selectedVersion}
                  onChange={e => setSelectedVersion(e.target.value)}
                  style={{ width: '100%', fontSize: 12 }}
                >
                  {data.concept.versions.map(v => <option key={v.id} value={v.url}>{v.label}</option>)}
                </select>
              )}
            </section>
          )}

          <section style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Concept Info</div>
            <MetaRow label="Tier"    value={`Tier ${data.concept?.tier || 1}`} />
            <MetaRow label="Type"    value={String(data.concept?.type || 'homepage_mock').replace(/_/g, ' ')} />
            <MetaRow label="Status"  value={conceptBadgeLabel} />
            <MetaRow label="Created" value={data.concept?.createdAt ? formatDate(data.concept.createdAt, true) : '—'} />
            {data.concept?.approvedBy && (
              <MetaRow label="Approved" value={`${data.concept.approvedBy} · ${relativeTime(data.concept.approvedAt)}`} />
            )}
          </section>

          <section>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Review Gates</div>
            <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
              {CHECKLIST_ITEMS.map(([key, label]) => {
                const checked = !!checklist[key];
                return (
                  <label
                    key={key}
                    data-automation-id={`canvas-checklist-${kebabCase(key)}`}
                    style={{
                      display:          'grid',
                      gridTemplateColumns: '20px 1fr',
                      gap:              10,
                      alignItems:       'center',
                      padding:          '8px 12px',
                      background:       checked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-elevated)',
                      border:           `1px solid ${checked ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-default)'}`,
                      borderRadius:     8,
                      cursor:           'pointer',
                      transition:       'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => mutateChecklist(key, e.target.checked)}
                      style={{ accentColor: 'var(--signal-emerald)' }}
                    />
                    <span style={{
                      fontSize:   13,
                      color:      checked ? 'var(--signal-emerald)' : 'var(--text-primary)',
                      fontWeight: checked ? 600 : 400,
                      transition: 'color 200ms ease',
                    }}>
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{
              padding:       '12px 14px',
              background:   'var(--bg-elevated)',
              borderRadius:  10,
              border:       '1px solid var(--border-default)',
            }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <GateRow label="Concept approved" value={readiness.conceptApproved} />
                <GateRow label="Preview valid"    value={readiness.previewValid} />
                <GateRow label="QA passed"        value={readiness.qaPassed} />
                <GateRow label="Draft ready"     value={readiness.draftReady} />
                <GateRow label="Mailbox ready"   value={readiness.mailboxReady} />
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 8, marginTop: 2 }}>
                  <GateRow label="Send ready" value={readiness.sendReady} accent />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Add Review Note</div>
            <textarea
              className="form-input"
              rows={3}
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder="Add a review note…"
              style={{ width: '100%', resize: 'vertical' }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={submitReviewNote}
              disabled={!reviewNote.trim() || submittingNote}
              style={{ marginTop: 8, width: '100%' }}
            >
              {submittingNote ? 'Adding…' : 'Add note'}
            </button>
          </section>
        </div>
      )}

    </div>
  );
}

// ─── Meta Row helper ─────────────────────────────────────────────────────────
function MetaRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
