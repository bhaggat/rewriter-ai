# Modern UI Refresh — Design

## Goal

Replace the current flat, light/dark-adaptive UI (indigo accent, plain cards) across the popup,
options page, and in-page rewrite widget with a single, always-dark "glass" visual language, plus
smoother micro-interactions. Approved via visual mockups during brainstorming.

## Decisions

- **Visual direction:** Dark Glass — deep charcoal/near-black surfaces, layered panels with subtle
  radial glow, glowing accent highlights, soft borders instead of hard dividers.
- **Theme mode:** Always dark. Drop `prefers-color-scheme` light variants entirely — one consistent
  look regardless of the host OS/browser theme.
- **Accent color:** Violet (`#a78bfa` bright / `#8b5cf6` deep), used for active states, primary
  buttons, and glow effects.
- **Scope:** Primarily visual (color, depth, radius, spacing, typography weight, transitions), with
  minor layout tweaks allowed where they reinforce the new look (see per-surface notes below). No
  changes to popup dimensions, information architecture, or component behavior/logic.
- **In-page widget:** Stays dark-glass regardless of the host page's own theme, since it must stay
  legible over arbitrary sites of any color. Background uses a semi-opaque dark fill + backdrop
  blur (not full transparency) so legibility never depends on what's behind it.

## Shared design tokens

Currently each of the three entrypoints (`popup/style.css`, `options/style.css`,
`content/style.css`) duplicates its own copy of the color/radius/shadow custom properties, each
with a light block and a `prefers-color-scheme: dark` override. Since we're now single-theme, this
is a good point to collapse all three token sets into one shared file instead of keeping three
divergent copies.

New file: `assets/theme.css` (plain CSS, imported first in each of the three `style.css` files via
`@import './path/to/theme.css';` — no build config changes needed, Vite/WXT resolves relative CSS
imports natively).

Tokens (all under `:root`, no media query needed anymore):

```css
--bg: #121118;              /* page/app base */
--surface: #17151f;         /* card/panel background */
--surface-raised: #1d1b27;  /* inputs, inner elements */
--border: #2b2937;
--border-strong: #322f42;
--fg: #f3f2fa;
--fg-muted: #c7c3d9;
--muted: #8f8aa3;
--accent: #a78bfa;
--accent-strong: #8b5cf6;
--accent-fg: #181622;
--glow: 0 0 8px rgba(167, 139, 250, 0.5);
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--shadow-sm: 0 4px 14px rgba(0, 0, 0, 0.3);
--shadow-md: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03);
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

The in-page widget currently prefixes its variables `--rw-*` to avoid colliding with host-page
CSS. Keep that prefix convention for the widget specifically (host pages are untrusted CSS
environments), but source its values from the same palette so all three surfaces stay visually
identical.

## Popup (`entrypoints/popup/`)

- **Base:** `--bg` with a subtle radial glow (`radial-gradient(circle at 30% 0%, #23213099,
  transparent 60%)`) behind the toolbar, matching the mockup.
- **Toolbar (`chat__toolbar`):** slightly taller padding, `--border` bottom line, provider/model
  `<select>` elements restyled with `--surface-raised` background and no default browser chrome
  bleed-through. Icon buttons get a hover glow (`box-shadow: var(--glow)`) instead of a flat
  background swap, plus the existing press-scale.
- **Chat bubbles:** increase radius to match `--radius-md`/`--radius-lg`, assistant bubble uses
  `--surface` + `--border` (was flat gray), user bubble uses `--accent` background with
  `--accent-fg` text. Add a fade+slide-in entrance animation (150ms, `--ease-out`) for new
  messages instead of them popping in instantly.
- **Pending indicator:** replace the static `…` bubble with a 3-dot pulsing typing indicator
  (CSS-only keyframe animation) — this is the concrete fix for the "clunky" complaint on the most
  visible piece of feedback in the chat.
- **Composer:** input and send button restyled to the new tokens; send button gets the accent glow
  on hover and a spring-like press (scale 0.97, `--ease-out`).
- **History list:** each item becomes a `--surface` card with `--border`, hover lifts with
  `--glow`-tinted shadow instead of a flat background swap.
- **Setup view:** inputs/selects/buttons restyled to tokens; primary button gets the accent glow.
- **No dimension changes** — popup stays 380×520.

## Options page (`entrypoints/options/`)

- **Layout tweak:** sections become distinct glass cards (`--surface`, `--border`,
  `box-shadow: var(--shadow-md)`) on the `--bg` page background, each with a small glowing dot
  next to the `h2` heading (matches the mockup) instead of a plain bottom-border heading.
- API key rows, inputs, and the site-denylist list restyled to tokens.
- **Toggle switch:** track uses `--accent` when checked with a `--glow` box-shadow; thumb
  transition eased with `--ease-out`.
- **Saved toast:** keep existing slide+fade behavior, restyle colors to tokens, ease with
  `--ease-out`.

## In-page widget (`entrypoints/content/`)

- **Floating icon:** dark glass circle (`rgba(24,22,30,.9)` + `backdrop-filter: blur(6px)`),
  border glow ring on hover, replaces the current instant show with a fade+scale-in (120ms) when it
  appears next to a focused field.
- **Popover:** `rgba(18,17,24,.94)` background + `backdrop-filter: blur(10px)`, `--border`, glow
  ring shadow, fade+scale-in entrance to match the icon.
- **Preset chips:** pill-shaped, `--surface`/`--border`, hover border turns `--accent` with text
  lightening — matches the mockup's chip treatment (replaces the current plain bordered buttons).
- **Primary actions** (custom instruction "Go", "Replace"): `--accent` background, `--accent-fg`
  text, glow on hover.
- **Result panel, error state:** restyled to tokens; error keeps a distinct red but recolored to
  read correctly against the dark surface (e.g. `#f87171` text on a subtly tinted red-black panel
  instead of the current light-mode `#fee2e2`/`#991b1b` pair, which would look wrong on dark glass).
- No structural/behavioral changes — same stages (`idle`/`presets`/`loading`/`result`/`error`),
  same positioning logic.

## Motion/interaction system

Applies across all three surfaces, addressing the "clunky interactions" feedback:

- Standardize on `--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`) for all hover/press/appear
  transitions, replacing the current mix of default linear/ease transitions.
- Entrances (chat bubbles, widget icon/popover, options "Saved" toast) fade+scale or fade+slide in
  over 120–160ms rather than appearing instantly.
- Hover states use glow (`box-shadow`) rather than flat background/border color swaps where an
  accent-colored element is involved.
- Press states keep the existing scale-down pattern (already present in the codebase), just
  reapplied consistently and with `--ease-out`.

## Testing / verification

- `npm run compile` (TypeScript check) and `npm run lint` after edits — this is a styling-only
  change, no new logic, so these mainly guard against accidental markup/import breakage.
- `npm run dev` and manually check in the browser (per project convention for UI changes): setup
  view, chat view (send a message, confirm bubble/typing-indicator/composer look and animate
  correctly), history view, options page (all sections, toggle, add/remove a site, save toast),
  and the in-page widget on a real page (icon appearance, popover, presets, result, error, replace).
- No automated UI tests exist in this project; visual correctness is confirmed by manual check in
  Chrome via `npm run dev`.
