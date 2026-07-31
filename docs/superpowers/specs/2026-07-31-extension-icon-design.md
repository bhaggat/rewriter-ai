# Extension Icon Design

**Date:** 2026-07-31

## Purpose

Rewriter AI currently has no icon assets (the old Vite template's `favicon.svg`/`icons.svg`
were removed during the WXT migration). The extension needs a toolbar icon so it doesn't
fall back to Chrome's default puzzle-piece placeholder.

## Concept

A pencil nib drawn as a single diagonal stroke, with a small 4-point spark at the tip
(signals AI-assisted writing), rendered in white on a rounded-square badge.

## Colors

Blue gradient badge background, `#2563eb` → `#1d4ed8`, white foreground glyph.

## Shape

Full-bleed rounded-square badge (not a transparent floating glyph) — stays legible as a
16px toolbar icon.

## Deliverables

- One master SVG (`public/icon/icon.svg`)
- PNG exports at 16, 32, 48, 128px (Chrome's required manifest icon sizes), in `public/icon/`
- `manifest.icons` wired up in `wxt.config.ts` pointing at the PNGs

## Scope

Initially toolbar/extension icon only; expanded on 2026-07-31 to a full rollout across the
app (see Rollout below) at the user's request ("use this in whole app").

## Rollout

- **Manifest icons** — `wxt.config.ts` `manifest.icons` (16/32/48/128, done in the first pass)
- **Favicons** — `<link rel="icon">` added to both `entrypoints/popup/index.html` and
  `entrypoints/options/index.html`, pointing at `/icon/32.png`
- **Popup welcome header** — `SetupView.tsx` shows the 32px badge inline next to the
  "Welcome to Rewriter AI" heading
- **Options page header** — `App.tsx` shows the 32px badge inline next to
  "Rewriter AI Settings"
- **Inline rewrite trigger** — the floating "rewrite with AI" button in
  `entrypoints/content/RewriteWidget.tsx` (injected on every page) now uses a new
  `LogoIcon` — a monochrome, stroke-based pencil+spark glyph added to the shared
  `components/icons.tsx` set (16x16, `currentColor`, matching the existing icon style) —
  replacing the previous "✎" emoji. The full-color badge wasn't used here since this
  button already has its own background/color theming (light/dark, hover-to-accent) that
  the shared icon set's `currentColor` convention matches; the colored badge would have
  clashed with that theming.
- **Not done**: no logo in the popup's chat toolbar (`ChatView.tsx`) — that toolbar is a
  tightly packed row of functional controls (provider/model selects, icon buttons) with no
  free corner to place a badge without overlapping a control.
