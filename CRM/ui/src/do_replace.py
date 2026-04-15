#!/usr/bin/env python3
fp = '/home/likwid/.openclaw/workspace/ventures/velcro/ventures/website-studio/CRM/ui/src/pages/ConceptCanvas.jsx'
with open(fp) as f:
    content = f.read()

rail_start = content.find('      {/* ── Right Rail ─────────────────────────────────────────────── */}')
cp_close = content.find('    </div>\n  );\n}', rail_start)

old_text = content[rail_start:cp_close]
print(f'Old text: {len(old_text)} chars, from {rail_start} to {cp_close}')

new_right_rail = '''      {/* ── Right Rail — Essential signal + sticky actions ────────── */}
      <aside
        data-automation-id="canvas-right-rail"
        style={{
          width:      288,
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

          {/* ── Review Notes — read-only (textarea moved to drawer) ─── */}
          <section>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Review Notes</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(data.reviewNotes || []).slice(0, 5).map((note, i) => (
                <div key={i} style={{
                  padding: '9px 12px', borderRadius: 10,
                  background: 'var(--bg-elevated)',
                  border:    '1px solid var(--border-default)',
                  fontSize:  12, color: 'var(--text-secondary)',
                }}>
                  {note}
                </div>
              ))}
              {!data.reviewNotes?.length && (
                <div style={{
                  padding: '9px 12px', borderRadius: 10,
                  background: 'var(--bg-elevated)',
                  border:    '1px dashed var(--border-default)',
                  fontSize:  12, color: 'var(--text-tertiary)',
                }}>
                  No review notes yet.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* ── Sticky Action Buttons ────────────────────────────────── */}
        <div style={{
          padding:        '14px 18px',
          borderTop:      '1px solid var(--border-default)',
          display:        'grid',
          gap:            9,
          position:       'sticky',
          bottom:         0,
          background:     'var(--bg-surface)',
          flexShrink:     0,
        }}>
          <button
            className="btn btn-success"
            data-automation-id="canvas-btn-approve-concept"
            disabled={data.concept?.status === 'approved' || busyAction === 'Approve Concept'}
            onClick={() => runAction('Approve Concept', () => apiCanvasApproveConcept(id))}
          >
            {busyAction === 'Approve Concept' ? 'Approving…' : '✓ Approve Concept'}
          </button>
          <button
            className="btn btn-secondary"
            data-automation-id="canvas-btn-request-rework"
            disabled={busyAction === 'Request Rework'}
            onClick={() => runAction('Request Rework', () => apiCanvasRequestRework(id))}
            style={{ borderColor: 'rgba(232, 164, 69, 0.3)', color: 'var(--accent)' }}
          >
            {busyAction === 'Request Rework' ? 'Sending…' : '↺ Request Rework'}
          </button>
          <button
            className="btn btn-secondary"
            data-automation-id="canvas-btn-approve-draft"
            disabled={(!data.outreach?.draft && !data.outreach?.pitch) || data.outreach?.contentApproval === 'approved' || busyAction === 'Approve Draft'}
            onClick={() => runAction('Approve Draft', () => apiCanvasApproveDraft(id))}
            style={{ borderColor: 'rgba(56, 189, 248, 0.25)', color: 'var(--signal-sky)' }}
          >
            {busyAction === 'Approve Draft' ? 'Approving…' : '✓ Approve Draft'}
          </button>
          <button
            className="btn btn-primary"
            disabled={!canMarkReady || busyAction === 'Mark Ready to Send'}
            onClick={() => runAction('Mark Ready to Send', () => apiCanvasChecklist(id, 'finalApprovalComplete', true))}
          >
            {busyAction === 'Mark Ready to Send' ? 'Saving…' : 'Mark Ready to Send'}
          </button>
        </div>
      </aside>

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
              <div style={{ display: 'grid', gap: 8 }}>
                {data.concept.screenshots.map(src => (
                  <a key={src} href={src} target="_blank" rel="noreferrer"
                    style={{ display: 'block', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                    <img src={src} alt="Screenshot" style={{ display: 'block', width: '100%', height: 88, objectFit: 'cover' }} />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Concept Info</div>
            <MetaRow label="Tier"    value={`Tier ${data.concept?.tier || 1}`} />
            <MetaRow label="Type"    value={String(data.concept?.type || 'homepage_mock').replace(/_/g, ' ')} />
            <MetaRow label="Created" value={data.concept?.createdAt ? formatDate(data.concept.createdAt, true) : '—'} />
          </section>

          {(data.concept?.versions?.length ?? 0) > 1 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Version</div>
              <select
                className="form-input form-select"
                value={selectedVersion}
                onChange={e => setSelectedVersion(e.target.value)}
                style={{ width: '100%' }}
              >
                {data.concept.versions.map(v => <option key={v.id} value={v.url}>{v.label}</option>)}
              </select>
            </section>
          )}

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

          <section className="card" style={{ background: 'var(--bg-elevated)' }}>
            <div className="card-body" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Concept Status</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span className={conceptBadgeClass}>{conceptBadgeLabel}</span>
                {data.concept?.approvedAt && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{relativeTime(data.concept.approvedAt)}</span>
                )}
              </div>
              {data.concept?.approvedBy && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Approved by <strong style={{ color: 'var(--text-primary)' }}>{data.concept.approvedBy}</strong> on {formatFullDate(data.concept.approvedAt)}
                </div>
              )}
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

'''

# Check if canvas-page closing is at the end of new_right_rail
# Strip it so we don't duplicate
if new_right_rail.rstrip().endswith('    </div>'):
    idx = new_right_rail.rfind('\n    </div>')
    new_right_rail = new_right_rail[:idx] + '\n'
    print('Stripped canvas-page </div> from new_right_rail')
else:
    print('Canvas-page </div> NOT found at end, checking last 50 chars:', repr(new_right_rail[-50:]))

print(f'New rail ends with: {repr(new_right_rail[-30:])}')
new_content = content[:rail_start] + new_right_rail + content[cp_close:]
print(f'New file: {len(new_content)} chars (old: {len(content)})')

with open(fp, 'w') as f:
    f.write(new_content)
print('Done!')
