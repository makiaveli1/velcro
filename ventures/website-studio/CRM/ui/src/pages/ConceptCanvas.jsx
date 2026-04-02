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
  { key: 'brief', label: 'Concept Brief', icon: '📄' },
  { key: 'website', label: 'Website Preview', icon: '🌐' },
  { key: 'outreach', label: 'Outreach Draft', icon: '📧' },
  { key: 'qa', label: 'QA Notes', icon: '📋' },
  { key: 'package', label: 'Package Summary', icon: '📦' },
];

const CHECKLIST_ITEMS = [
  ['previewLoads', 'Preview loads'],
  ['mobileViewAcceptable', 'Mobile view acceptable'],
  ['screenshotsAttached', 'Screenshots attached'],
  ['trustClaimsVerified', 'Trust claims verified'],
  ['noUnverifiedCertifications', 'No unverified certifications'],
  ['draftReferencesConcept', 'Draft references concept'],
  ['publicUrlValid', 'Public preview URL valid'],
  ['qaPassed', 'QA passed'],
  ['finalApprovalComplete', 'Final approval complete'],
];

const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet: 768,
  mobile: 375,
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
    approved: ['badge badge-emerald', 'Approved'],
    not_started: ['badge badge-default', 'Not Started'],
    internal_review: ['badge badge-amber', 'Internal Review'],
    rework_needed: ['badge badge-rose', 'Rework Needed'],
    building: ['badge badge-sky', 'Building'],
    concept_review: ['badge badge-amber', 'Concept Review'],
    concept_approved: ['badge badge-emerald', 'Concept Approved'],
    outreach_drafted: ['badge badge-violet', 'Outreach Drafted'],
    content_approved: ['badge badge-sky', 'Draft Approved'],
    awaiting_send: ['badge badge-emerald', 'Awaiting Send'],
  };
  return map[status] || ['badge badge-default', String(status || 'unknown').replace(/_/g, ' ')];
}

function boolBadge(value) {
  return value
    ? <span className="badge badge-emerald">Pass</span>
    : <span className="badge badge-rose">Pending</span>;
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
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      html.push('<hr />');
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();
  return html.join('');
}

function MarkdownPreview({ markdown, emptyTitle, emptyDescription }) {
  if (!markdown?.trim()) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      style={{
        color: 'var(--text-primary)',
        lineHeight: 1.75,
        fontSize: 14,
      }}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }}
    />
  );
}

function PanelCard({ title, value, tone = 'default', sub }) {
  const toneClass = tone === 'good'
    ? 'badge badge-emerald'
    : tone === 'warn'
    ? 'badge badge-amber'
    : tone === 'bad'
    ? 'badge badge-rose'
    : 'badge badge-default';

  return (
    <div className="card" style={{ background: 'var(--bg-elevated)' }}>
      <div className="card-body" style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
          <span className={toneClass}>{tone}</span>
        </div>
        {sub && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function ConceptCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [mode, setMode] = useState('website');
  const [device, setDevice] = useState('desktop');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  const fetchCanvas = useCallback(() => apiCanvas(id), [id]);
  const { data, loading, error, execute, setData } = useApi(fetchCanvas, [id], { immediate: true });

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const versions = data?.concept?.versions || [];
    if (versions.length && !selectedVersion) {
      setSelectedVersion(versions[0].url);
    }
  }, [data, selectedVersion]);

  const collapsedRail = viewportWidth < 1200;
  const leadName = data?.contact?.name || data?.leadSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Lead';
  const [conceptBadgeClass, conceptBadgeLabel] = statusMeta(data?.concept?.status);
  const previewSrc = selectedVersion || data?.concept?.publicPreviewUrl || data?.concept?.localPreviewPath || '';
  const previewWidth = DEVICE_WIDTHS[device];
  const checklist = data?.checklist || {};
  const readiness = data?.readiness || {};
  const canMarkReady = readiness.conceptApproved && readiness.previewValid && readiness.qaPassed && readiness.draftReady && readiness.mailboxReady && !checklist.finalApprovalComplete;

  const packageCards = useMemo(() => ([
    { title: 'Concept', value: readiness.conceptApproved ? 'Approved' : 'Pending', tone: readiness.conceptApproved ? 'good' : 'warn', sub: data?.concept?.type?.replace(/_/g, ' ') || 'Homepage mock' },
    { title: 'Preview', value: readiness.previewValid ? 'Verified' : 'Needs Review', tone: readiness.previewValid ? 'good' : 'warn', sub: data?.concept?.publicPreviewUrl ? 'Public preview linked' : 'Local preview route active' },
    { title: 'QA', value: readiness.qaPassed ? 'Passed' : 'Open Findings', tone: readiness.qaPassed ? 'good' : 'bad', sub: `${data?.concept?.qaFindings?.length || 0} findings recorded` },
    { title: 'Draft', value: readiness.draftReady ? 'Ready' : 'Incomplete', tone: readiness.draftReady ? 'good' : 'warn', sub: data?.outreach?.stage?.replace(/_/g, ' ') || 'outreach drafted' },
    { title: 'Mailbox', value: readiness.mailboxReady ? 'Ready' : 'Blocked', tone: readiness.mailboxReady ? 'good' : 'bad', sub: readiness.mailboxReady ? 'System gate passed' : 'Outbound system needs attention' },
    { title: 'Send', value: readiness.sendReady ? 'READY' : 'Blocked', tone: readiness.sendReady ? 'good' : 'bad', sub: readiness.sendReady ? 'Final gates cleared' : `${readiness.blockers?.length || 0} blocker(s)` },
  ]), [data, readiness]);

  const qaMarkdown = useMemo(() => {
    const findings = data?.concept?.qaFindings || [];
    const notes = data?.reviewNotes || [];
    const sections = [];
    if (findings.length) {
      sections.push('## QA Findings');
      findings.forEach(item => sections.push(`- ${item}`));
    }
    if (notes.length) {
      sections.push('', '## Review Notes');
      notes.forEach(item => sections.push(`- ${item}`));
    }
    return sections.join('\n');
  }, [data]);

  const currentDocument = useMemo(() => {
    if (!data) return '';
    if (mode === 'brief') return data.concept?.conceptBrief || '';
    if (mode === 'outreach') return data.outreach?.draft || data.outreach?.pitch || '';
    if (mode === 'qa') return qaMarkdown;
    return '';
  }, [data, mode, qaMarkdown]);

  const mutateChecklist = async (item, checked) => {
    const previous = data;
    setData(current => current ? {
      ...current,
      checklist: { ...current.checklist, [item]: checked },
    } : current);

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
    try {
      await action();
      await execute();
      addToast({ type: 'success', message: key.replace(/-/g, ' ') });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Action failed' });
    } finally {
      setBusyAction('');
    }
  };

  const submitReviewNote = async () => {
    if (!reviewNote.trim()) return;
    setSubmittingNote(true);
    try {
      await apiCanvasReviewNote(id, reviewNote.trim());
      setReviewNote('');
      await execute();
      addToast({ type: 'success', message: 'Review note added' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to add review note' });
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) return <CanvasSkeleton />;
  if (error) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 28 }}>
          <EmptyState
            title="Canvas failed to load"
            description={error}
            action
            actionLabel="Retry"
            onAction={execute}
          />
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div style={{ minHeight: 'calc(100vh - 140px)' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <aside
          className="card"
          data-automation-id="canvas-left-rail"
          style={{
            width: collapsedRail ? 84 : 260,
            flexShrink: 0,
            transition: 'width 200ms ease',
            overflow: 'hidden',
            background: 'var(--bg-surface)',
          }}
        >
          <div className="card-body" style={{ padding: collapsedRail ? 14 : 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsedRail ? 'center' : 'space-between', gap: 10, marginBottom: 10 }}>
                {!collapsedRail && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Concept Review</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>{leadName}</div>
                  </div>
                )}
                <span className={conceptBadgeClass} data-automation-id="canvas-status-badge">{collapsedRail ? '●' : conceptBadgeLabel}</span>
              </div>
              {!collapsedRail && data.contact?.email && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{data.contact.email}</div>
              )}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {NAV_ITEMS.map(item => {
                const active = mode === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key)}
                    className={`sidebar-item ${active ? 'active' : ''}`}
                    data-automation-id={`canvas-nav-${item.key === 'brief' ? 'brief' : item.key === 'website' ? 'website' : item.key}`}
                    style={{ justifyContent: collapsedRail ? 'center' : 'flex-start', paddingInline: collapsedRail ? 10 : 14 }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    {!collapsedRail && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            {!collapsedRail && data.concept?.screenshots?.length > 0 && (
              <section>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Screenshots</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {data.concept.screenshots.map((src, index) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                      <img src={src} alt={`Screenshot ${index + 1}`} style={{ display: 'block', width: '100%', height: 96, objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {!collapsedRail && (
              <section className="card" style={{ background: 'var(--bg-elevated)' }}>
                <div className="card-body" style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Concept Metadata</div>
                  <MetaRow label="Tier" value={`Tier ${data.concept?.tier || 1}`} />
                  <MetaRow label="Type" value={String(data.concept?.type || 'homepage_mock').replace(/_/g, ' ')} />
                  <MetaRow label="Created" value={data.concept?.createdAt ? formatDate(data.concept.createdAt, true) : '—'} />
                </div>
              </section>
            )}

            {!collapsedRail && (data.concept?.versions?.length || 0) > 1 && (
              <section>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Version</div>
                <select
                  className="form-input form-select"
                  value={selectedVersion}
                  onChange={event => setSelectedVersion(event.target.value)}
                  style={{ width: '100%' }}
                >
                  {data.concept.versions.map(version => (
                    <option key={version.id} value={version.url}>{version.label}</option>
                  ))}
                </select>
              </section>
            )}
          </div>
        </aside>

        <main
          className="card"
          data-automation-id="canvas-center-panel"
          style={{ flex: 1, minWidth: 0, background: 'var(--bg-surface)' }}
        >
          <div className="card-header" style={{ padding: '18px 22px', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contacts')} style={{ paddingInline: 0 }}>Contacts</button>
                <span style={{ margin: '0 6px' }}>›</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/contacts/${id}`)} style={{ paddingInline: 0 }}>{leadName}</button>
                <span style={{ margin: '0 6px' }}>›</span>
                <span>{NAV_ITEMS.find(item => item.key === mode)?.label || 'Review'}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{NAV_ITEMS.find(item => item.key === mode)?.label || 'Website Preview'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              {mode === 'website' && (
                <div style={{ display: 'inline-flex', padding: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 999 }}>
                  {['desktop', 'tablet', 'mobile'].map(option => (
                    <button
                      key={option}
                      type="button"
                      className={`btn btn-sm ${device === option ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setDevice(option)}
                      data-automation-id={`canvas-device-${option}`}
                      style={{ minWidth: 82, textTransform: 'capitalize' }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  data-automation-id="canvas-open-tab"
                  onClick={() => previewSrc && window.open(previewSrc, '_blank', 'noopener,noreferrer')}
                  disabled={!previewSrc}
                >
                  Open in new tab
                </button>
                <span data-automation-id="canvas-last-verified" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Last verified: {data.concept?.previewVerifiedAt ? relativeTime(data.concept.previewVerifiedAt) : 'not yet'}
                </span>
              </div>
            </div>
          </div>

          <div className="card-body" style={{ padding: 22 }}>
            {mode === 'website' && (
              previewSrc ? (
                <div style={{ transition: 'all 200ms ease' }}>
                  <div style={{ margin: '0 auto', width: previewWidth, maxWidth: '100%', transition: 'width 200ms ease' }}>
                    <iframe
                      title={`${leadName} concept preview`}
                      src={previewSrc}
                      sandbox="allow-scripts allow-same-origin"
                      data-automation-id="canvas-preview-iframe"
                      style={{
                        width: '100%',
                        minHeight: 880,
                        border: '1px solid var(--border-default)',
                        borderRadius: 16,
                        background: '#fff',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState title="Preview not available yet" description="There’s no saved public or local concept preview for this lead yet." />
              )
            )}

            {mode !== 'website' && mode !== 'package' && (
              <div className="card" style={{ background: 'var(--bg-elevated)' }}>
                <div className="card-body" style={{ padding: 24 }}>
                  <MarkdownPreview
                    markdown={currentDocument}
                    emptyTitle={mode === 'brief' ? 'Concept brief missing' : mode === 'outreach' ? 'Outreach draft missing' : 'QA notes missing'}
                    emptyDescription={mode === 'brief'
                      ? 'Add a CONCEPT_BRIEF.md file to populate this panel.'
                      : mode === 'outreach'
                      ? 'Add OUTREACH_DRAFT.md or PITCH.md to populate this panel.'
                      : 'Add CONCEPT_APPROVAL.md or review notes to populate this panel.'}
                  />
                </div>
              </div>
            )}

            {mode === 'package' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, transition: 'all 200ms ease' }}>
                {packageCards.map(card => <PanelCard key={card.title} {...card} />)}
              </div>
            )}
          </div>
        </main>

        <aside
          className="card"
          data-automation-id="canvas-right-rail"
          style={{ width: 300, flexShrink: 0, background: 'var(--bg-surface)' }}
        >
          <div className="card-body" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <section>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Review Checklist</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {CHECKLIST_ITEMS.map(([key, label]) => {
                  const checked = !!checklist[key];
                  return (
                    <label
                      key={key}
                      data-automation-id={`canvas-checklist-${kebabCase(key)}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '18px 1fr auto',
                        gap: 10,
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 10,
                        cursor: 'pointer',
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={event => mutateChecklist(key, event.target.checked)} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
                      {boolBadge(checked)}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="card" style={{ background: 'var(--bg-elevated)' }}>
              <div className="card-body" style={{ padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Concept Status</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span className={conceptBadgeClass}>{conceptBadgeLabel}</span>
                  {data.concept?.approvedAt && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{relativeTime(data.concept.approvedAt)}</span>}
                </div>
                {data.concept?.approvedBy && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                    Approved by <strong style={{ color: 'var(--text-primary)' }}>{data.concept.approvedBy}</strong> on {formatFullDate(data.concept.approvedAt)}
                  </div>
                )}
              </div>
            </section>

            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Blockers</div>
                <span className={`badge ${readiness.blockers?.length ? 'badge-rose' : 'badge-emerald'}`} data-automation-id="canvas-send-readiness">
                  {readiness.sendReady ? 'Ready' : 'Blocked'}
                </span>
              </div>
              <div data-automation-id="canvas-blockers-list" style={{ display: 'grid', gap: 8 }}>
                {readiness.blockers?.length ? readiness.blockers.map(blocker => (
                  <div key={blocker} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.2)', fontSize: 12, color: 'var(--signal-rose)' }}>
                    {blocker}
                  </div>
                )) : (
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: 12, color: 'var(--signal-emerald)' }}>
                    No blockers recorded.
                  </div>
                )}
              </div>
            </section>

            <section className="card" style={{ background: 'var(--bg-elevated)' }}>
              <div className="card-body" style={{ padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Send Readiness</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <GateRow label="Concept approved" value={readiness.conceptApproved} />
                  <GateRow label="Preview valid" value={readiness.previewValid} />
                  <GateRow label="QA passed" value={readiness.qaPassed} />
                  <GateRow label="Draft ready" value={readiness.draftReady} />
                  <GateRow label="Mailbox ready" value={readiness.mailboxReady} />
                  <GateRow label="Send ready" value={readiness.sendReady} accent />
                </div>
              </div>
            </section>

            <section>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Review Notes</div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                {(data.reviewNotes || []).slice(0, 5).map((note, index) => (
                  <div key={`${note}-${index}`} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {note}
                  </div>
                ))}
                {!data.reviewNotes?.length && (
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px dashed var(--border-default)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                    No review notes yet.
                  </div>
                )}
              </div>
              <textarea
                className="form-input"
                rows={3}
                value={reviewNote}
                onChange={event => setReviewNote(event.target.value)}
                placeholder="Add a review note…"
                style={{ width: '100%', resize: 'vertical' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={submitReviewNote} disabled={!reviewNote.trim() || submittingNote} style={{ marginTop: 8 }}>
                {submittingNote ? 'Adding…' : 'Add note'}
              </button>
            </section>

            <section style={{ display: 'grid', gap: 10 }}>
              <button
                className="btn btn-success"
                data-automation-id="canvas-btn-approve-concept"
                disabled={data.concept?.status === 'approved' || busyAction === 'Approve Concept'}
                onClick={() => runAction('Approve Concept', () => apiCanvasApproveConcept(id))}
              >
                {busyAction === 'Approve Concept' ? 'Approving…' : 'Approve Concept'}
              </button>
              <button
                className="btn btn-secondary"
                data-automation-id="canvas-btn-request-rework"
                onClick={() => runAction('Request Rework', () => apiCanvasRequestRework(id))}
                disabled={busyAction === 'Request Rework'}
                style={{ borderColor: 'rgba(232, 164, 69, 0.3)', color: 'var(--accent)' }}
              >
                {busyAction === 'Request Rework' ? 'Sending…' : 'Request Rework'}
              </button>
              <button
                className="btn btn-secondary"
                data-automation-id="canvas-btn-approve-draft"
                onClick={() => runAction('Approve Draft', () => apiCanvasApproveDraft(id))}
                disabled={(!data.outreach?.draft && !data.outreach?.pitch) || data.outreach?.contentApproval === 'approved' || busyAction === 'Approve Draft'}
                style={{ borderColor: 'rgba(56, 189, 248, 0.25)', color: 'var(--signal-sky)' }}
              >
                {busyAction === 'Approve Draft' ? 'Approving…' : 'Approve Draft'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => runAction('Mark Ready to Send', () => apiCanvasChecklist(id, 'finalApprovalComplete', true))}
                disabled={!canMarkReady || busyAction === 'Mark Ready to Send'}
              >
                {busyAction === 'Mark Ready to Send' ? 'Saving…' : 'Mark Ready to Send'}
              </button>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function GateRow({ label, value, accent = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
      <span style={{ color: accent ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: accent ? 600 : 500 }}>{label}</span>
      {value ? <span className="badge badge-emerald">Yes</span> : <span className="badge badge-rose">No</span>}
    </div>
  );
}

function CanvasSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div className="card" style={{ width: 260 }}>
        <div className="card-body" style={{ padding: 18 }}>
          <div className="skeleton skeleton-text lg" style={{ width: '65%', marginBottom: 16 }} />
          <div className="skeleton skeleton-text" style={{ width: '85%', marginBottom: 10 }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 10 }} />
          <div className="skeleton skeleton-text" style={{ width: '75%', marginBottom: 10 }} />
        </div>
      </div>
      <div className="card" style={{ flex: 1 }}>
        <div className="card-body" style={{ padding: 22 }}>
          <div className="skeleton skeleton-text lg" style={{ width: 240, marginBottom: 20 }} />
          <div className="skeleton-card" style={{ height: 760 }} />
        </div>
      </div>
      <div className="card" style={{ width: 300 }}>
        <div className="card-body" style={{ padding: 18 }}>
          <div className="skeleton skeleton-text" style={{ width: 160, marginBottom: 16 }} />
          <div className="skeleton-card" style={{ height: 480 }} />
        </div>
      </div>
    </div>
  );
}
