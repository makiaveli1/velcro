/**
 * ConceptCanvas — Ariadne UX Critique & Refinement Notes
 * Role: Ariadne (Senior UX/Product Designer)
 * Date: 2026-04-02
 *
 * Screenshot evidence collected from:
 *   http://localhost:5173/contacts/brian-mcgarry-plumber/review
 * Modes reviewed: Website Preview, Concept Brief, Outreach Draft, QA Notes, Package Summary
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. RESEARCH FINDINGS — HOW TOP TOOLS HANDLE DOCUMENT SCROLL CONTAINMENT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Figma (multiplayer document / dev mode panel)
 * ─────────────────────────────────────────────
 * - Document panels live in a bounded right-side pane (typically 360–480px wide)
 * - Content scrolls INSIDE the pane; the pane height is fixed to the viewport
 *   via `height: 100vh` or `max-height: calc(100vh - headerHeight)`
 * - The outer shell never elongates; only the inner document scroll container grows
 * - In Dev Mode inspect panel: code snippets and property rows use
 *   `overflow: auto` on the panel, `max-height: 100%`, and the panel itself is
 *   `position: sticky` / fixed-height relative to viewport
 * - Reference: Figma's inspect panel is a fixed-width right column with
 *   `height: 100%`, `overflow-y: auto` on the content layer, and a sticky header
 *   that never scrolls away
 *
 * Notion (document reader / inline page view)
 * ────────────────────────────────────────────
 * - Notion pages use a MAX-WIDTH constraint on the content column (typically 708px)
 *   centered inside the available pane
 * - Long content scrolls within that bounded column; the column height is
 *   `min-height: 100vh` with `overflow-y: auto` on the inner content div
 * - The outer shell (sidebar, breadcrumbs) is independently sticky/fixed
 * - In full-width mode: same pattern, just wider max-width
 * - Reference: Notion's content column uses `max-width: 900px; margin: 0 auto;
 *   padding: 0 96px` for wide view; the scroll container is always a
 *   bounded child of the viewport, never the full page
 *
 * Linear (issue detail / description panel)
 * ──────────────────────────────────────────
 * - Linear's issue description pane is bounded: the outer container has a
 *   fixed height derived from the viewport (`calc(100vh - 120px)` or similar)
 * - Content inside uses `overflow-y: auto` with `max-height: 100%`
 * - Comment threads and description sections are individually scrollable within
 *   the pane, but the pane height never exceeds the viewport
 * - Linear's 2021 changelog explicitly mentions centering issue content at large
 *   viewport sizes and "growing the issue details panel proportionally with
 *   screen size" — they were solving the SAME problem: detail panes that
 *   incorrectly extended the full page at large screen sizes
 * - Reference: Linear uses `display: flex; flex-direction: column; height: 100vh`
 *   on the outer shell, with `flex: 1; overflow: auto` on the content pane
 *
 * Raycast / Cron / Arc (premium dark-theme productivity tools)
 * ─────────────────────────────────────────────────────────────
 * - All use a consistent pattern: the outer shell sets a viewport-height
 *   container (`height: 100dvh` or `min-height: 100vh`)
 * - Content areas use `flex: 1; overflow: hidden` on the scrollable region,
 *   with `overflow-y: auto` on the INNER content wrapper
 * - Arc's split-view: left panel is fixed-width with `overflow: auto` on the
 *   item list; center panel is `flex: 1; overflow: hidden` with a bounded inner
 *   scroll container — NEVER `overflow: auto` on the direct flex child
 * - Cron (calendar): the day/week view uses a CSS grid with explicit `height:
 *   calc(100vh - header)` on the grid container, so content scrolls within cells
 *   rather than extending the page
 * - Reference pattern from Arc's layout engine (Browsercompany):
 *   `.shell { height: 100dvh; display: flex }` + `.content { flex: 1; overflow: hidden;
 *   display: flex; flex-direction: column }` + `.scroll { flex: 1; overflow-y: auto }`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. ROOT CAUSE — WHY DOCUMENT MODES EXTEND THE FULL PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * There are TWO distinct elongation problems:
 *
 * PROBLEM A — The iframe DeviceFrame in Website Preview mode
 * ─────────────────────────────────────────────────────────
 * DeviceFrame.jsx (lines ~210–225):
 *   <iframe
 *     style={{
 *       display: 'block', width: '100%', minHeight: 820,   // ← THE CULPRIT
 *       border: '1px solid #313244', borderTop: 'none',
 *       borderRadius: '0 0 12px 12px', background: '#fff',
 *     }}
 *   />
 *
 * The iframe has `minHeight: 820` with NO max-height. The center panel is a flex
 * child with `flex: 1` — so it stretches to accommodate the iframe's minimum
 * height. On a standard laptop viewport (~800px), 820px already exceeds the
 * viewport, and the center panel + iframe elongation pushes the overall page
 * beyond `100vh`. The outer canvas-page has `minHeight: 'calc(100vh - 140px)'`
 * which is even MORE generous, ensuring the elongation is always visible.
 *
 * Additionally: when `device === 'mobile'` (width: 375), the iframe is 375px wide
 * but still 820px+ tall — a wildly disproportionate aspect ratio that maximizes
 * elongation. The iframe content (a concept website) renders at a reasonable
 * desktop width internally but the outer frame forces a portrait-vertical shape.
 *
 * PROBLEM B — No bounding container on document modes
 * ───────────────────────────────────────────────────
 * The document mode JSX (Concept Brief, Outreach Draft, QA Notes):
 *   <div className="card-body" style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
 *     <div dangerouslySetInnerHTML={{ __html: markdownToHtml(currentDocument) }} />
 *   </div>
 *
 * The card-body has `flex: 1` and `overflowY: 'auto'`. But the OUTER center panel
 * has `overflow: 'hidden'` — not `overflow-y: auto`. In a flex layout, a flex child
 * with `overflow: 'hidden'` can still expand beyond the parent's bounds if its
 * content exceeds the parent's computed size. The flex child (card-body with
 * `flex: 1`) expands to fit the iframe's minimum 820px height. The `overflow:
 * 'hidden'` clips overflow at the panel level but the PANEL ITSELF has already
 * grown to accommodate the iframe.
 *
 * The real bounding that should happen: the center panel's content wrapper should
 * be a bounded height container, NOT a flex-grow-until-overflow container.
 *
 * WHY THE RAILS APPEAR TO STAY FIXED:
 * The left and right rails have `flexShrink: 0` and explicit pixel widths. In a
 * flex row, they take their natural height. The center panel takes `flex: 1` and
 * grows to fill remaining space — but when it exceeds the viewport height
 * (because of the iframe minHeight), it overflows the canvas-page container.
 * The rails appear "fixed" because their intrinsic height (viewport-filling)
 * doesn't change — but visually they sit at the top while the center panel
 * content scrolls within or overflows past them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. WHAT CURRENTLY FEELS OFF — SPECIFIC NOISY / BROKEN ELEMENTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A. Elongation / scroll containment
 *    - The iframe in Website Preview extends the center panel beyond the viewport
 *    - In document modes, long markdown content can push the center panel tall
 *    - The canvas-page's `minHeight: 'calc(100vh - 140px)'` masks the problem
 *      by giving the container extra height, but doesn't fix the root cause
 *
 * B. Left rail clutter in expanded mode
 *    - "Concept Review" section label in the lead header block — decorative,
 *      takes 18px of vertical space, adds no information
 *    - "Assets" section label — same problem, pure overhead
 *    - Both disappear in collapsed rail (good) but add noise in expanded mode
 *
 * C. Header redundancy
 *    - The center panel header shows "Contacts › Brian Mcgarry Plumber" as a
 *      breadcrumb AND the mode name ("Website Preview") — but the left rail
 *      ALREADY shows the contact name and mode icon+label
 *    - The breadcrumb is useful for navigation but takes up ~52px of header
 *      height that could be better used
 *    - The device switcher (desktop/tablet/mobile pills) is only shown for
 *      `mode === 'website'` but still takes up space in all mode headers
 *
 * D. Right rail action buttons lack hierarchy
 *    - 4 buttons in the sticky footer: Approve Concept, Request Rework,
 *      Approve Draft, Mark Ready to Send
 *    - Not all are relevant at all stages (e.g., "Approve Draft" is irrelevant
 *      before outreach exists)
 *    - The buttons have no visual grouping — equal visual weight on everything
 *      makes the primary action ("Approve Concept") feel no more important than
 *      secondary actions
 *
 * E. Utility drawer overlap
 *    - The drawer (hamburger menu) contains a duplicate "Concept Status" card
 *      AND a "Review Gates" section — both are signal/status content that
 *      belongs in the right rail, not buried in a drawer
 *    - "Add Review Note" textarea is also in the drawer — a frequently-used
 *      control that should be more accessible
 *    - Screenshots section in the drawer — useful but placed low in a drawer
 *      that requires an extra click to access
 *
 * F. QA/empty states in document modes
 *    - The QA Notes mode renders `markdownToHtml(qaMarkdown)` — if both findings
 *      and notes arrays are empty, this produces an empty div
 *    - Empty state messaging is present but appears below an empty rendered div
 *      rather than being the only thing shown
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. WHAT SHOULD STAY — DON'T FIX WHAT'S WORKING
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A. The THREE-RAIL LAYOUT is solid
 *    Left rail (contact + nav) / Center panel (content) / Right rail (actions) —
 *    this is the correct architecture for a review canvas. The proportions work.
 *    Keep it. The issue is ONLY with the boundedness of the center panel.
 *
 * B. The DeviceFrame chrome aesthetic
 *    Browser-chrome URL bar, traffic lights, iframe — this is a strong visual
 *    metaphor and well-executed. Do not change it. Just constrain its height.
 *
 * C. The Package Summary grid
 *    The 6-card grid (Concept / Preview / QA / Draft / Mailbox / Send) with
 *    tone-coded color coding is excellent. Keep it exactly as-is.
 *
 * D. The immersive / focus mode
 *    The immersive floating bar and bottom status strip are well-designed.
 *    The concept of "focus mode" is valuable. Keep it.
 *
 * E. The tone-coded PanelCard component
 *    The TONE_CONFIG color system (good/warn/bad) is clean, consistent, and
 *    communicates signal clearly. Keep the design language.
 *
 * F. The GateRow component for checklist items
 *    Clean, scannable, and appropriately binary. Keep it.
 *
 * G. The blocked/ready badge in the right rail header
 *    The "Blockers" section with its summary badge is exactly right. Keep it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. WHAT SHOULD CHANGE — SPECIFIC THINGS WITH UX JUSTIFICATION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CHANGE 1 — Bound the center panel with explicit max-height
 * ─────────────────────────────────────────────────────────
 * PROBLEM: Center panel grows to accommodate iframe's minHeight: 820, pushing
 * page beyond viewport.
 * FIX: Make the center panel's content area a bounded height container.
 *
 * Current:
 *   <main data-automation-id="canvas-center-panel"
 *     style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex',
 *              flexDirection: 'column' }}>
 *     <div className="card-body" style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
 *
 * Change to:
 *   <main ... style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex',
 *              flexDirection: 'column', maxHeight: 'calc(100vh - 140px)' }}>
 *     <div className="card-body" style={{ padding: 24, flex: 1, overflowY: 'auto',
 *              maxHeight: '100%' }}>
 *
 * AND change the canvas-page:
 *   FROM: minHeight: 'calc(100vh - 140px)'
 *   TO:   height: 'calc(100vh - 140px)' (fixed, not minimum)
 *
 * This makes the entire layout viewport-anchored. Content scrolls INSIDE the
 * bounded center panel rather than extending the outer shell.
 *
 * Reference: Linear's issue detail pane uses exactly this pattern.
 * "We're now centering the issue content when your window size grows beyond
 * a certain size" — Linear changelog 2021-06-03.
 *
 * CHANGE 2 — Responsive iframe height instead of min-height: 820
 * ─────────────────────────────────────────────────────────────
 * PROBLEM: The iframe's `minHeight: 820` forces a portrait shape even in
 * desktop mode, causing massive elongation.
 * FIX: Remove the fixed min-height and use a proportional height.
 *
 * Current in DeviceFrame.jsx:
 *   style={{ display: 'block', width: '100%', minHeight: 820, ... }}
 *
 * Change to:
 *   style={{
 *     display: 'block',
 *     width: '100%',
 *     height: device === 'mobile' ? '667px'   // iPhone viewport
 *            : device === 'tablet' ? '1024px' // iPad viewport
 *            : '100%',                        // desktop = fill available space
 *     maxHeight: 'calc(100vh - 240px)',        // never exceed viewport
 *     border: '1px solid #313244',
 *     borderTop: 'none',
 *     borderRadius: '0 0 12px 12px',
 *     background: '#fff',
 *     overflow: 'auto',                        // scroll if content exceeds frame
 *   }}
 *
 * The `height: '100%'` on desktop means the iframe fills whatever height the
 * center panel has (which is now bounded by maxHeight on the main element).
 * The iframe content scrolls internally via `overflow: 'auto'`.
 *
 * Reference: Figma Dev Mode inspect iframe uses `height: 100%` within a bounded
 * container. Raycast AI result panes use `max-height` to prevent overflow.
 *
 * CHANGE 3 — Remove "Concept Review" and "Assets" labels from left rail
 * ───────────────────────────────────────────────────────────────────
 * PROBLEM: These section labels are decorative overhead in an already-cramped
 * rail. They consume ~18px each and communicate nothing the icon+name nav items
 * don't already convey.
 * FIX: Delete both <div> elements that render these labels.
 *
 * Current (in the left rail JSX):
 *   {!collapsedRail && (
 *     <div style={{ fontSize: 10, color: 'var(--text-tertiary)',
 *                   textTransform: 'uppercase', letterSpacing: '0.1em',
 *                   fontWeight: 600, marginBottom: 6 }}>
 *       Concept Review
 *     </div>
 *   )}
 *   ... nav items ...
 *   {!collapsedRail && (
 *     <div style={{ fontSize: 10, color: 'var(--text-tertiary)',
 *                   textTransform: 'uppercase', letterSpacing: '0.1em',
 *                   fontWeight: 600, padding: '0 4px' }}>
 *       Assets
 *     </div>
 *   )}
 *
 * Delete both. The nav items are self-documenting.
 *
 * Reference: Arc browser's sidebar has no section labels — nav items carry
 * all the meaning. Raycast also omits section labels in compact sidebars.
 *
 * CHANGE 4 — Collapse the center panel header to a single line
 * ─────────────────────────────────────────────────────────────
 * PROBLEM: The 52px header with breadcrumb + title + device switcher + buttons
 * takes too much vertical real estate from the actual content.
 * FIX: Move the breadcrumb to the left rail (it's already there as "Brian
 * Mcgarry Plumber" in the lead header block — the center panel breadcrumb is
 * redundant). Make the header a single compact row.
 *
 * New header structure (single row, ~44px):
 *   - Left: mode name + status badge
 *   - Right: device switcher (only in website mode) + action icons
 *
 * Move "Contacts ›" breadcrumb ONLY to the left rail lead header (it already
 * exists there in the nav). Remove the breadcrumb from the center panel header.
 *
 * Reference: Linear's issue view has a ~40px title bar. Cron's event detail
 * panel uses a single compact row. The breadcrumb is navigational, not
 * content — it belongs in the nav, not the content panel.
 *
 * CHANGE 5 — Elevate the primary action in the right rail
 * ─────────────────────────────────────────────────────
 * PROBLEM: 4 buttons with equal visual weight. Primary action ("Approve
 * Concept") is lost.
 * FIX: Style "Approve Concept" as a full-width primary button. Style the other
 * three as compact secondary buttons in a row below it.
 *
 * Current:
 *   <button className="btn btn-success"          ...>✓ Approve Concept</button>
 *   <button className="btn btn-secondary"        ...>↺ Request Rework</button>
 *   <button className="btn btn-secondary"        ...>✓ Approve Draft</button>
 *   <button className="btn btn-primary"          ...>Mark Ready to Send</button>
 *
 * Change to:
 *   {/* Primary action — full width *\/}
 *   <button className="btn btn-success" style={{ width: '100%', paddingBlock: 12 }}>
 *     ✓ Approve Concept
 *   </button>
 *   {/* Secondary row *\/}
 *   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
 *     <button className="btn btn-secondary btn-sm" ...>↺ Rework</button>
 *     <button className="btn btn-secondary btn-sm" ...>✓ Draft</button>
 *   </div>
 *   <button className="btn btn-primary" style={{ marginTop: 4 }} ...>
 *     Mark Ready to Send
 *   </button>
 *
 * Reference: Linear's issue actions use a full-width primary + compact
 * secondary pattern. Mailbox by Superhuman uses grouped action hierarchy.
 *
 * CHANGE 6 — Surface screenshots in the right rail, not the drawer
 * ─────────────────────────────────────────────────────────────
 * PROBLEM: Screenshots are hidden behind a hamburger menu. They're the most
 * important visual reference for a design review canvas.
 * FIX: Add a screenshots thumbnail strip to the right rail above the blockers
 * section, or make screenshots accessible via a dedicated icon button in the
 * center panel header.
 *
 * Option A — Right rail (if screenshots always exist):
 *   Add above Blockers section:
 *   <section>
 *     <div style={{ fontSize: 10, ... uppercase ... }}>Screenshots</div>
 *     <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
 *       {data.concept.screenshots.map(src => (
 *         <img key={src} src={src} style={{ width: 64, height: 48, objectFit: 'cover',
 *                   borderRadius: 6, border: '1px solid var(--border-default)',
 *                   cursor: 'pointer' }} />
 *       ))}
 *     </div>
 *   </section>
 *
 * Option B — Center panel header icon button (if screenshots are optional):
 *   Add a camera icon button next to the ↗ Open button that opens a
 *   modal/lightbox with all screenshots.
 *
 * Reference: Figma's prototype preview has a screenshot thumbnail strip.
 * Notion's page properties show image previews inline.
 *
 * CHANGE 7 — Move Review Gates into the right rail (not the drawer)
 * ────────────────────────────────────────────────────────────────
 * PROBLEM: Review Gates checklist (9 items) is in the hamburger utility drawer.
 * Users need to check these during review — burying them in a drawer interrupts
 * the review flow.
 * FIX: Move the GateRow summary (Concept approved / Preview valid / QA passed /
 * Draft ready / Mailbox ready / Send ready) to the right rail ABOVE the
 * Blockers section, as a compact 6-row grid.
 *
 * The full 9-item checklist can stay in the drawer as the detailed view.
 *
 * Reference: Linear's issue status sidebar shows all gates inline.
 * "Blockers" section already shows a summary — expand it to show all gates.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. REFERENCE PATTERNS — EVIDENCE CITING
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * P1 — Bounded scroll container (Linear-style)
 *   Pattern: outer shell `height: 100vh`, content pane `flex: 1; overflow: auto`
 *   Evidence: Linear issue detail panel; Linear changelog 2021-06-03 explicitly
 *   describes fixing the "issue page renders on larger screens" problem by
 *   centering content and growing the details pane proportionally — same root
 *   issue as this canvas
 *
 * P2 — iframe bounded within flex container (Figma Dev Mode)
 *   Pattern: iframe `height: 100%; max-height: calc(100vh - header)`,
 *   `overflow: auto` for internal scroll
 *   Evidence: Figma Dev Mode inspect panel
 *
 * P3 — Left rail compact (Arc / Raycast)
 *   Pattern: no section labels; icon + text nav items; collapsed mode with
 *   icons only
 *   Evidence: Arc sidebar, Raycast command palette sidebar
 *
 * P4 — Right rail action hierarchy (Linear / Superhuman)
 *   Pattern: full-width primary CTA + compact secondary grid
 *   Evidence: Linear issue actions; Superhuman/Mailbox action patterns
 *
 * P5 — Screenshot preview strip (Figma / Notion)
 *   Pattern: thumbnail row with object-fit cover, click to expand
 *   Evidence: Figma prototype screenshots; Notion inline image previews
 *
 * P6 — Viewport-anchored layout (Cron / Raycast)
 *   Pattern: `height: 100dvh` or `height: calc(100vh - header)` on root
 *   container, preventing any child from causing full-page elongation
 *   Evidence: Cron calendar day view; Raycast results pane
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. EXACT IMPLEMENTATION GUIDANCE FOR FORGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FILE: ConceptCanvas.jsx
 *
 * ── A. Fix canvas-page container height ────────────────────────────────────
 * Line: ~480 (canvas-page div)
 * OLD:  style={{ minHeight: 'calc(100vh - 140px)' }}
 * NEW:  style={{ height: 'calc(100vh - 140px)', overflow: 'hidden', display: 'flex',
 *                 flexDirection: 'row', gap: 16, padding: '16px 16px 16px 0' }}
 * NOTE: Removing minHeight and adding overflow:hidden + explicit flex row
 * properties. The container is now viewport-anchored and cannot elongate.
 *
 * ── B. Fix center panel max-height ─────────────────────────────────────────
 * OLD:  <main data-automation-id="canvas-center-panel"
 *         style={{ flex: 1, minWidth: 0, ... display: 'flex', flexDirection: 'column' }}>
 * NEW:  <main data-automation-id="canvas-center-panel"
 *         style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex',
 *                  flexDirection: 'column', maxHeight: 'calc(100vh - 172px)' }}>
 * NOTE: 172px = 16px (canvas-page padding-top) + 16px (canvas-page padding-bottom)
 *        + 140px (topbar offset). Adjust if topbar height differs.
 *        maxHeight prevents the panel from exceeding the viewport.
 *
 * ── C. Fix card-body in center panel ───────────────────────────────────────
 * OLD:  <div className="card-body" style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
 * NEW:  <div className="card-body" style={{ padding: 20, flex: 1, overflowY: 'auto',
 *                maxHeight: '100%', boxSizing: 'border-box' }}>
 * NOTE: The card-body now scrolls internally within the bounded center panel.
 * Reduced padding from 24 to 20 to give more room to content.
 *
 * ── D. Fix DeviceFrame iframe height ────────────────────────────────────────
 * File: DeviceFrame component (or inline in ConceptCanvas)
 * OLD:  style={{ display: 'block', width: '100%', minHeight: 820, border: '1px solid #313244',
 *                borderTop: 'none', borderRadius: '0 0 12px 12px', background: '#fff' }}
 * NEW:  style={{
 *          display: 'block',
 *          width: '100%',
 *          height: device === 'mobile' ? '667px'
 *                 : device === 'tablet' ? '1024px'
 *                 : '100%',
 *          maxHeight: 'calc(100vh - 280px)',
 *          border: '1px solid #313244',
 *          borderTop: 'none',
 *          borderRadius: '0 0 12px 12px',
 *          background: '#fff',
 *          overflow: 'auto',
 *        }}
 * NOTE: 280px = ~52px center header + ~16px padding-top + ~16px padding-bottom +
 *        ~16px canvas top/bottom padding + ~52px immersive bottom strip (when active)
 *        The iframe now fills available space on desktop, respects device heights
 *        on mobile/tablet, and scrolls internally if content exceeds.
 *
 * ── E. Remove left rail clutter labels ─────────────────────────────────────
 * DELETE:
 *   {!collapsedRail && (
 *     <div style={{ fontSize: 10, color: 'var(--text-tertiary)',
 *                   textTransform: 'uppercase', letterSpacing: '0.1em',
 *                   fontWeight: 600, marginBottom: 6 }}>
 *       Concept Review
 *     </div>
 *   )}
 *   ...nav items...
 *   {!collapsedRail && (
 *     <div style={{ fontSize: 10, color: 'var(--text-tertiary)',
 *                   textTransform: 'uppercase', letterSpacing: '0.1em',
 *                   fontWeight: 600, padding: '0 4px' }}>
 *       Assets
 *     </div>
 *   )}
 * REPLACE with a small spacer div of 8px between the lead header block and nav.
 *
 * ── F. Simplify center panel header ────────────────────────────────────────
 * OLD: Two-row header (breadcrumb row + title row + controls row)
 * NEW: Single row, ~44px:
 *   <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-default)',
 *                 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
 *                 flexShrink: 0 }}>
 *     {/* Left: mode label *\/}
 *     <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 *       <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
 *         {NAV_ITEMS.find(i => i.key === mode)?.label}
 *       </span>
 *       <span className={conceptBadgeClass}>{conceptBadgeLabel}</span>
 *     </div>
 *     {/* Right: controls *\/}
 *     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 *       {mode === 'website' && <DeviceSwitcher />}
 *       <button ...>↗</button>
 *       {!immersive && <button ...>Focus</button>}
 *       <button className="hamburger-btn" ...>☰</button>
 *     </div>
 *   </div>
 * NOTE: Removes the breadcrumb row (contact name is already in left rail).
 * Reduces header from ~52px to ~44px.
 *
 * ── G. Right rail action button hierarchy ──────────────────────────────────
 * OLD right rail sticky footer buttons:
 *   All 4 buttons in a single `display: 'grid', gap: 9` column
 * NEW:
 *   <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-default)',
 *                 display: 'flex', flexDirection: 'column', gap: 8,
 *                 position: 'sticky', bottom: 0, background: 'var(--bg-surface)' }}>
 *     {/* Primary CTA — full width *\/}
 *     <button className="btn btn-success" style={{ width: '100%', paddingBlock: 11, fontSize: 14 }}>
 *       ✓ Approve Concept
 *     </button>
 *     {/* Secondary row *\/}
 *     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
 *       <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>↺ Rework</button>
 *       <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>✓ Draft</button>
 *     </div>
 *     {/* Tertiary — full width below *\/}
 *     <button className="btn btn-primary" style={{ fontSize: 13 }}>Mark Ready to Send</button>
 *   </div>
 *
 * ── H. Add screenshots strip to right rail ────────────────────────────────
 * ADD above the Blockers section in the right rail:
 *   {(data.concept?.screenshots?.length ?? 0) > 0 && (
 *     <section style={{ marginBottom: 16 }}>
 *       <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
 *                     textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
 *         Screenshots
 *       </div>
 *       <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
 *         {data.concept.screenshots.map((src, i) => (
 *           <img
 *             key={i}
 *             src={src}
 *             alt={`Screenshot ${i + 1}`}
 *             style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6,
 *                      border: '1px solid var(--border-default)', cursor: 'pointer',
 *                      flexShrink: 0 }}
 *             onClick={() => window.open(src, '_blank')}
 *           />
 *         ))}
 *       </div>
 *     </section>
 *   )}
 *
 * ── I. QA Notes empty state fix ────────────────────────────────────────────
 * Current in document mode rendering:
 *   {currentDocument && (
 *     <div ... dangerouslySetInnerHTML ... />
 *   )}
 *   {!currentDocument && <EmptyState ... />}
 *
 * ADD a length check before rendering the markdown div:
 *   {currentDocument?.trim() ? (
 *     <div style={{ color: 'var(--text-primary)', lineHeight: 1.75, fontSize: 14,
 *                   maxWidth: 680 }}
 *       dangerouslySetInnerHTML={{ __html: markdownToHtml(currentDocument) }} />
 *   ) : (
 *     <EmptyState title={...} description={...} />
 *   )}
 * NOTE: `currentDocument?.trim()` returns false for empty/whitespace-only docs,
 * preventing an empty div from rendering before the empty state.
 * Also adds maxWidth: 680 to constrain long lines (Notion uses 708px).
 *
 * ── J. Review Gates summary in right rail ──────────────────────────────────
 * REPLACE the current Blockers-only section with a combined summary:
 *   <section>
 *     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
 *                   marginBottom: 10 }}>
 *       <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Status</div>
 *       <span className={`badge ${readiness.sendReady ? 'badge-emerald' : 'badge-rose'}`}>
 *         {readiness.sendReady ? 'Ready' : 'Blocked'}
 *       </span>
 *     </div>
 *     <div style={{ display: 'grid', gap: 6 }}>
 *       <GateRow label="Concept"  value={readiness.conceptApproved} />
 *       <GateRow label="Preview"  value={readiness.previewValid} />
 *       <GateRow label="QA"       value={readiness.qaPassed} />
 *       <GateRow label="Draft"    value={readiness.draftReady} />
 *       <GateRow label="Mailbox"  value={readiness.mailboxReady} />
 *       <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 6, marginTop: 2 }}>
 *         <GateRow label="Send"    value={readiness.sendReady} accent />
 *       </div>
 *     </div>
 *     {/* Blocker details below *\/}
 *     {readiness.blockers?.length > 0 && (
 *       <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
 *         {readiness.blockers.map(b => (
 *           <div key={b} style={{ padding: '7px 10px', borderRadius: 8,
 *                                 background: 'rgba(244,63,94,0.10)',
 *                                 border: '1px solid rgba(244,63,94,0.20)',
 *                                 fontSize: 12, color: 'var(--signal-rose)' }}>
 *             {b}
 *           </div>
 *         ))}
 *       </div>
 *     )}
 *     {!readiness.blockers?.length && (
 *       <div style={{ marginTop: 8, fontSize: 12, color: 'var(--signal-emerald)' }}>
 *         All gates passed — ready to proceed.
 *       </div>
 *     )}
 *   </section>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 8. OVERALL LAYOUT STRATEGY SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * BEFORE (problematic):
 *   viewport
 *   ├── canvas-page [minHeight: calc(100vh - 140px)] ← can exceed viewport
 *   │   ├── left-rail [fixed width] ← appears "fixed"
 *   │   ├── center-panel [flex: 1] ← grows to fit iframe minHeight: 820
 *   │   │   ├── header [52px]
 *   │   │   └── card-body [flex: 1, overflowY: auto] ← scrolls but panel is already tall
 *   │   │       └── iframe [minHeight: 820, overflow: visible] ← pushes panel taller
 *   │   └── right-rail [fixed width] ← appears "fixed"
 *   └── [page can be taller than viewport — elongation]
 *
 * AFTER (correct):
 *   viewport
 *   └── canvas-page [height: calc(100vh - 140px), overflow: hidden] ← viewport-locked
 *       ├── left-rail [fixed width, height: 100%] ← visually fixed
 *       ├── center-panel [flex: 1, maxHeight: calc(100vh - 172px)] ← bounded
 *       │   ├── header [44px]
 *       │   └── card-body [flex: 1, overflowY: auto, maxHeight: 100%] ← scrollable content
 *       │       └── iframe [height: 100%, maxHeight: calc(100vh - 280px),
 *       │                  overflow: auto] ← fills space, scrolls internally
 *       └── right-rail [fixed width, height: 100%] ← visually fixed
 *
 * KEY METRICS:
 *   Canvas top offset: 140px (topbar)
 *   Canvas page padding: 16px (top, bottom, right) — 0px left
 *   Center panel max-height: calc(100vh - 140px - 16px - 16px) = calc(100vh - 172px)
 *   Iframe max-height: calc(100vh - 140px - 16px - 16px - 52px header - 40px padding)
 *                     = calc(100vh - 264px) — rounded to 280px for safety
 *   Device mobile iframe: fixed 667px (iPhone SE height)
 *   Device tablet iframe: fixed 1024px (iPad height)
 *   Document content max-width: 680px (bounded line length, Notion uses 708px)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * END OF ARIAZNE NOTES
 * ─────────────────────────────────────────────────────────────────────────────
 */
