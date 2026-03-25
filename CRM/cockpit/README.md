# Website Studio CRM Cockpit — V1

Internal dashboard for the Website Studio lead gen system. Reads the existing `website-studio/` file structure as source of truth.

---

## Architecture

```
CRM/cockpit/
├── server.js          Express API server — reads/writes the website-studio file tree
├── package.json
├── index.html          Single-page app shell
├── css/
│   └── style.css      Dark theme, Inter font, status color coding
├── js/
│   ├── api.js         Thin fetch wrapper
│   └── app.js         Full SPA: routing, kanban, detail, approvals, campaign, suppression
└── data/              (generated at runtime)
```

**Stack:** Node.js + Express (backend) · Vanilla HTML/CSS/JS (frontend) · gray-matter (frontmatter parsing)

**No:** database, auth, external APIs, email, complex build tooling.

The server is a read-heavy API that:
1. Scans `website-studio/LEADS/{slug}/` at runtime
2. Infers pipeline stage from `STATUS.md` frontmatter → falls back to file presence
3. Writes approval decisions back to `STATUS.md` files on disk
4. Uses `gray-matter` for clean frontmatter serialization

---

## Running

```bash
cd CRM/cockpit
npm install          # (first time only)
node server.js       # starts on http://localhost:3099
```

Open `http://localhost:3099` in your browser.

---

## Views

### 1. Pipeline Board
Kanban board with all 14 pipeline stages as columns. Cards show: business name, category · location, score badge, stage badge, suppression flag. Click any card to open Lead Detail.

### 2. Lead Detail
Click any card to see:
- Business summary (name, category, location, website status)
- Lead score with bar
- Suppression flag if suppressed
- Approval state and decision notes
- Website audit / no-site brief preview
- Concept brief preview
- Pitch draft preview
- Full stage history table
- All source file paths
- **Approval actions** (Approve / Reject / Park) when lead is in `APPROVAL_QUEUED`

### 3. Approval Queue
Shows only leads in `APPROVAL_QUEUED`. Each card shows:
- Business name, score, pitch preview, concept summary
- Notes field + Approve / Reject / Park buttons
- "View Full Details" links to the detail modal
- Approval count badge in sidebar nav

### 4. Campaign View
Shows `dublin-trades-round-1` status:
- 8 stat cards (total leads, qualified, audited, concepts, pitched, sends used X/5, won, queued)
- Stage distribution bars with counts

### 5. Search & Filter
Search bar + filter panel:
- by pipeline stage (dropdown)
- by category (text match)
- by location (text match)
- by score range (min/max)
- by suppression status (active / suppressed)

### 6. Suppression List
Lists all suppressed businesses with: name, reason, date, added by, section.

---

## Lead Stage Inference

Priority order for determining a lead's stage:
1. `STATUS.md` frontmatter `stage:` field
2. File presence (most complete file wins):

| Highest file present | Inferred stage |
|---|---|
| `PITCH.md` | `PITCH_DRAFTED` |
| `CONCEPT_BRIEF.md` | `CONCEPT_CREATED` |
| `WEBSITE_AUDIT.md` | `WEBSITE_AUDITED` |
| `NO_SITE_BRIEF.md` | `NO_SITE_BRIEF_CREATED` |
| `BUSINESS.md` | `BUSINESS_RESEARCHED` |
| `LEAD_RECORD.md` | `LEAD_QUALIFIED` |
| folder exists | `LEAD_FOUND` |

---

## Status Badge Colors

| Stage | Color |
|---|---|
| LEAD_FOUND | gray |
| LEAD_QUALIFIED | gray |
| BUSINESS_RESEARCHED | indigo |
| WEBSITE_AUDITED / NO_SITE_BRIEF_CREATED | blue |
| CONCEPT_CREATED | emerald |
| PITCH_DRAFTED | green |
| APPROVAL_QUEUED | yellow |
| APPROVED | orange |
| OUTREACH_SENT | purple |
| FOLLOW_UP_PENDING | violet |
| WON | bright green |
| LOST / NO_RESPONSE | red |
| SUPPRESSED | dark red + strikethrough |

---

## What Was Built

- [x] Pipeline kanban board with all 14 stages
- [x] Lead detail modal with file previews
- [x] Approval queue with approve/reject/park actions that write STATUS.md
- [x] Campaign dashboard with stat cards and stage distribution bars
- [x] Search + filter panel (stage, category, location, score, suppression)
- [x] Suppression list view
- [x] Concept/Pitch review panel in lead detail
- [x] Dark theme, Inter font, card-based layout
- [x] Stage inference from file presence
- [x] Real STATUS.md write-back on approval/rejection/park
- [x] JSON index cache for fast loading
- [x] Gray-matter for clean frontmatter serialization

---

## V2 Deferred

- Lead creation form (add new leads from the UI)
- Lead folder auto-creation from the cockpit
- Campaign lead symlinks (`CAMPAIGNS/{slug}/LEADS/`)
- A/B pitch variant tracking
- Response logging (OUTREACH_SENT → FOLLOW_UP_PENDING)
- Win/loss rate metrics over time
- Drag-and-drop between kanban stages
- Multi-campaign support (currently hardcoded to `dublin-trades-round-1`)
- Email client / send integration
- User accounts / multi-agent auth
- Mobile-responsive layout

---

## Source of Truth

The cockpit reads directly from `website-studio/LEADS/{slug}/`. The CRM never moves or changes the existing system files. All writes go to `STATUS.md` inside each lead folder.
