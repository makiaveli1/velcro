# UI Design System — Verdantia CRM 2.0

_"Dark Intelligence Terminal" — the interface a capable operator actually wants to use._

---

## Aesthetic Direction

**Reference points:** Linear meets Bloomberg Terminal. Confident, dense-but-controlled, sharp. Not a generic SaaS dashboard. Not a clone of any existing CRM.

The UI should feel like a precision instrument — every pixel earns its place. Information-rich without being overwhelming. Premium without being precious. Dark without being depressing.

---

## Color Palette

### Backgrounds (Depth Layers)

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0A0A0C` | Page background — the darkest base layer |
| `--bg-surface` | `#111115` | Primary surface — cards, panels |
| `--bg-elevated` | `#18181E` | Elevated surface — modals, dropdowns |
| `--bg-overlay` | `#222230` | Overlay/hover states |
| `--bg-input` | `#0D0D11` | Input field backgrounds |

### Accent (Primary)

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#E8A445` | Primary actions, links, active states |
| `--accent-hover` | `#F0B560` | Hover on accent elements |
| `--accent-dim` | `rgba(232,164,69,0.12)` | Accent backgrounds, subtle highlights |
| `--accent-glow` | `rgba(232,164,69,0.25)` | Focus rings, glows |

### Signal Colors

| Token | Hex | Usage |
|---|---|---|
| `--signal-amber` | `#F59E0B` | Attention, warnings, pending follow-ups |
| `--signal-emerald` | `#10B981` | Positive, closed, completed, approved |
| `--signal-rose` | `#F43F5E` | Risk, lost, errors, overdue |
| `--signal-violet` | `#8B5CF6` | In-progress, in-review states |
| `--signal-sky` | `#38BDF8` | Information, neutral indicators |

### Text

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#F5F0E8` | Primary text — warm cream on dark |
| `--text-secondary` | `#9A9AAA` | Secondary text, labels |
| `--text-tertiary` | `#5A5A6A` | Disabled, placeholder, metadata |
| `--text-inverse` | `#0A0A0C` | Text on light/accent backgrounds |

### Borders

| Token | Hex | Usage |
|---|---|---|
| `--border-subtle` | `#1E1E26` | Subtle dividers |
| `--border-default` | `#2A2A36` | Default borders, card edges |
| `--border-strong` | `#3A3A48` | Active borders, focus |

### Score Gradient

Relationship score 0–100 uses a continuous gradient:
- `0–30`: `--signal-rose` — "cold" / needs attention urgently
- `31–50`: `--signal-amber` — "warm" / worth investing
- `51–70`: `--signal-sky` — "active" / healthy relationship
- `71–100`: `--signal-emerald` — "strong" / priority accounts

---

## Typography

**Primary font:** `Inter` (Google Fonts) — weights 400, 500, 600, 700
**Mono font:** `JetBrains Mono` — for code, IDs, timestamps

### Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-xs` | 11px | 500 | Timestamps, metadata, badges |
| `--text-sm` | 13px | 400 | Secondary labels, table content |
| `--text-base` | 14px | 400 | Default body text |
| `--text-md` | 15px | 500 | Emphasized body, card titles |
| `--text-lg` | 18px | 600 | Section headings |
| `--text-xl` | 22px | 700 | Page titles |
| `--text-2xl` | 28px | 700 | Dashboard hero numbers |
| `--text-3xl` | 36px | 700 | Large stat displays |

### Line Heights
- Headings: `1.2`
- Body: `1.55`
- Dense/lists: `1.35`

---

## Spacing System

Base unit: **4px**

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, small tags |
| `--radius-md` | 6px | Buttons, inputs, small cards |
| `--radius-lg` | 10px | Cards, panels |
| `--radius-xl` | 14px | Modals, large surfaces |
| `--radius-full` | 9999px | Pills, avatars |

---

## Shadows / Depth

| Token | Usage |
|---|---|
| `--shadow-sm` | Subtle: hover states on cards |
| `--shadow-md` | Elevated: dropdowns, popovers |
| `--shadow-lg` | Modals, floating panels |
| `--shadow-glow-accent` | `0 0 20px rgba(232,164,69,0.15)` — accent glow on key elements |

---

## Motion Philosophy

**Principle:** Motion should communicate state, not entertain. Subtle, purposeful, fast.

- **Duration scale:** 120ms (micro), 200ms (standard), 300ms (page transitions)
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` — fast start, gentle settle (used for most UI)
- **Principle:** Elements should fade + translate slightly, not just appear
- **Hover:** Subtle background shift + shadow lift — 120ms
- **Page/section transitions:** Fade + slight upward translate — 200ms
- **Modals:** Fade in + scale from 0.97 → 1.0 — 200ms
- **No bounce, no spring, no decorative animation**

---

## Icon Style

**Direction:** Outline icons, 1.5px stroke weight, 16×16 default size
**Usage:** Lucide icons (open source, consistent stroke weight)
**Exceptions:** Small badges and status dots use filled indicators

---

## Component Patterns

### Badge
- `badge`: Default — `--bg-overlay` background, `--text-secondary` text
- `badge-accent`: Accent fill — `--accent-dim` bg, `--accent` text
- `badge-emerald`: Success/approved
- `badge-amber`: Warning/pending
- `badge-rose`: Danger/lost/error
- `badge-violet`: In-progress/review

Sizes: `--text-xs` for inline use, `--text-sm` for standalone.

### Button

| Variant | Appearance |
|---|---|
| `btn-primary` | `--accent` bg, `--text-inverse` text — primary actions |
| `btn-secondary` | `--bg-elevated` bg, `--border-default` border, `--text-primary` text |
| `btn-ghost` | Transparent bg, `--text-secondary` text — tertiary actions |
| `btn-danger` | `--signal-rose` bg, white text — destructive actions |
| `btn-sm` | Smaller padding (6px 12px), `--text-sm` font |
| `btn-icon` | Square, icon-only, `--btn-ghost` variant |

States: hover (lighten 8%), active (darken 5%), disabled (40% opacity), loading (spinner replaces text).

### Card

- Background: `--bg-surface`
- Border: 1px `--border-default`
- Radius: `--radius-lg`
- Padding: `--space-5` (compact) or `--space-6` (default)
- Hover (if clickable): border color shifts to `--border-strong`, shadow lifts

### Score Bar

A horizontal bar showing relationship score with labeled breakpoints:

```
[=====>          ] 54/100  ● Recency: 18 days ago
```
- Track: `--bg-overlay`, height 6px, full width
- Fill: color from score gradient (see Score Gradient above)
- Breakpoint dots at 30/50/70 with labels
- Score number + label right-aligned or below

**Score breakdown tooltip** (on hover/click of score):
```
Relationship Score: 54
─────────────────────
Recency    ██████░░░░  18d  (max 30)
Frequency  ████░░░░░░  3/mo  (max 25)
Priority   ███░░░░░░░  Normal  (max 20)
Signal     ██░░░░░░░░  Medium  (max 25)
─────────────────────
Total              54/100
```
Each component is clickable (shows what affects it).

### Timeline Component

Vertical timeline for contact interaction history:

```
●─── Mar 24, 2026 — Email received
│    Re: Website redesign inquiry
│    "Hi, we'd like to discuss..."
│
●─── Mar 20, 2026 — Meeting: 45 min
│    Project kick-off call ✓
│    [2 action items]
│
●─── Mar 15, 2026 — Draft proposed
     Follow-up draft ready
     [View Draft →]
```

- Connector line: `--border-subtle`, 1px
- Dot: 8px circle, `--accent` fill, 2px white ring
- Entry type determines dot color: email=`--signal-sky`, meeting=`--accent`, call=`--signal-violet`, note=`--text-tertiary`, draft=`--signal-amber`
- Expandable: click to show full content
- Progressive disclosure: show last 5, "Show more" link

### Signal Indicator

Shows contact signal strength from discovery:

```
●●●○  High signal (4+ interactions)
```
- 4 dots, filled = strength level
- Color: `--accent` for high, `--signal-amber` for medium, `--text-tertiary` for low
- Tooltip shows: signal count, quality rating, interaction types seen

### Priority Badge

| Priority | Color | Label |
|---|---|---|
| Critical | `--signal-rose` | `CRITICAL` |
| High | `--signal-amber` | `HIGH` |
| Normal | `--text-secondary` | `NORMAL` |
| Low | `--text-tertiary` | `LOW` |

### Modal

- Backdrop: `rgba(0,0,0,0.7)` with `backdrop-filter: blur(4px)`
- Panel: `--bg-elevated`, `--radius-xl`, shadow `--shadow-lg`
- Header: title `--text-lg` + close button
- Footer: action buttons right-aligned
- Max widths: 480px (small), 640px (medium), 800px (large)

### Toast Notifications

Position: bottom-right, stacked.
- `--bg-elevated` background, left border colored by type
- Auto-dismiss: 4 seconds
- Types: success (emerald), error (rose), warning (amber), info (sky)

### Empty States

Centered in container:
- Icon (muted, 32px)
- Title: `--text-md` `--text-primary`
- Description: `--text-sm` `--text-secondary`
- CTA button (optional): `btn-secondary`

---

## NL Query Bar

Persistent across all screens. Design:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍  Tell me about Brian McGarry                              ⌘K  │
└─────────────────────────────────────────────────────────────────┘
```

- Width: full viewport minus sidebar (or full width on mobile)
- Background: `--bg-surface`, border `--border-default`
- On focus: border becomes `--accent`, subtle glow
- Keyboard shortcut: `⌘K` / `Ctrl+K` — focuses from anywhere
- Results appear below as a dropdown panel:

```
┌─────────────────────────────────────────┐
│ 🔍 "Brian McGarry"                      │
├─────────────────────────────────────────┤
│ 👤 Brian McGarry — Plumber, Dublin      │
│    Score: 62 · Last touch: 3 days ago   │
│    [Open Dossier]                      │
│                                         │
│ 📅 Next follow-up: Mar 30              │
│ ✉️  Pending draft: 1                    │
└─────────────────────────────────────────┘
```

Or for "Who needs attention?":
```
┌─────────────────────────────────────────┐
│ ⚠️  Contacts needing attention (4)      │
│                                         │
│ 👤 Sarah O'Brien — Score dropped 12pts  │
│    Co: TechFlow Ltd · Last: 18 days ago │
│    [Open] [Follow Up] [Dismiss]        │
│                                         │
│ 👤 James K. — Overdue follow-up        │
│    [Open] [Clear Follow-up]            │
└─────────────────────────────────────────┘
```

---

## Layout Structure

### App Shell
```
┌──────────┬────────────────────────────────────────┐
│          │  [NL Query Bar — full width]            │
│ Sidebar  ├────────────────────────────────────────┤
│  220px   │                                        │
│          │  Main Content Area                     │
│          │  (scrollable, padded)                  │
│          │                                        │
│          │                                        │
└──────────┴────────────────────────────────────────┘
```

### Sidebar Navigation

```
┌─────────────────────────┐
│  ◆ VERDANTIA CRM        │
├─────────────────────────┤
│  ◉ Dashboard            │
│  ◎ Discovery (3)        │
│  ◎ Contacts             │
│  ◎ Companies            │
│  ◎ Follow-ups           │
│  ◎ Meetings             │
│  ◎ Drafts               │
├─────────────────────────┤
│  ◎ Settings             │
└─────────────────────────┘
```
- Icons: outline, 16px
- Active: accent color + `--accent-dim` background
- Badge for pending counts (Discovery queue, overdue follow-ups)
- Collapsible on mobile

### Page Header Pattern

```
┌──────────────────────────────────────────────────────┐
│ Dashboard                              [Actions ▾]  │
│ Today's pulse — Monday, March 27                     │
├──────────────────────────────────────────────────────┤
│ [Stat Card] [Stat Card] [Stat Card] [Stat Card]     │
└──────────────────────────────────────────────────────┘
```

- Title: `--text-xl`
- Subtitle: `--text-sm` `--text-secondary`
- Action menu: `btn-ghost` with dropdown

---

## Component States Reference

### States for all interactive elements
- **Default:** normal resting state
- **Hover:** subtle background shift, cursor pointer
- **Focus:** accent border + glow ring (`:focus-visible`)
- **Active/Pressed:** slightly darker
- **Disabled:** 40% opacity, cursor not-allowed
- **Loading:** spinner, pointer-events none
- **Error:** rose border (for inputs)

### Loading States
- Full page: centered spinner with "Loading..." text
- List/table: skeleton rows (3-5 animated placeholder rows)
- Card: shimmer animation on card background
- Button: spinner replaces label

### Error States
- Inline form errors: rose text below field
- API errors: toast notification (rose) with retry action
- Page errors: centered error card with "Try again" button

---

## Accessibility

- All interactive elements keyboard-accessible
- Focus order follows visual order
- Color is never the sole indicator — always paired with icon or label
- Contrast: all text meets WCAG AA (4.5:1 minimum)
- Focus rings: always visible, styled with `--accent-glow`
- Screen reader labels on icon-only buttons

---

_This system is the implementation target. When in doubt, apply these tokens and patterns._
