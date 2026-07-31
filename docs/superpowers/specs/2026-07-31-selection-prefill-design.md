# Selection Prefill (Popup Composer + Widget Partial-Selection Rewrite) — Design

## Goal

When the user has selected text on a page — including text selected inside an `<input>` or
`<textarea>` — that selection should be usable directly instead of requiring a retype or a
whole-field rewrite:

1. Opening the extension popup should prefill the chat composer with the current page selection.
2. Opening the in-page rewrite widget while a field has a partial text selection should rewrite
   only that selection, and "Replace" should splice the result back into just that span.

## Current state (for context)

- `docs/superpowers/specs/2026-07-31-quick-presets-and-selection-autofill-design.md` (section 3)
  already specs a popup-only selection autofill using `window.getSelection()?.toString()`, but it
  has not been implemented yet (no `GET_SELECTION` message or handler exists in the codebase).
- `window.getSelection()` does not see a native form control's internal text selection — a
  selection inside an `<input>`/`<textarea>` only exists via `activeElement.selectionStart` /
  `selectionEnd`. The prior spec's approach would silently miss exactly the case this request calls
  out (selecting inside an input/textarea).
- `entrypoints/content/field-utils.ts` has no concept of "the selected portion of a field" today.
  `getFieldText` always returns the whole field's content, and `insertText` always selects and
  replaces the *entire* field (`field.select()` for input/textarea, `range.selectNodeContents(field)`
  for contenteditable) before writing.
- The in-page widget (`entrypoints/content/RewriteWidget.tsx`) triggers on field focus/input and
  always operates on the whole field's text — this design does not change *when* it triggers, only
  *what text* it operates on when a selection is present at trigger time.
- The popup's chat composer (`entrypoints/popup/ChatView.tsx`) has no selection-reading logic today.

## Decisions

### 1. Shared helper: `getFieldSelection`

Add to `entrypoints/content/field-utils.ts`:

```ts
export interface FieldSelection {
  text: string;
  start?: number; // input/textarea: offsets into field.value
  end?: number;
  range?: Range; // contenteditable: cloned Range to restore later
}

export function getFieldSelection(field: HTMLElement): FieldSelection | null
```

- For `<textarea>`/`<input>`: reads `selectionStart`/`selectionEnd`; returns `null` if they're equal
  (collapsed) or unavailable.
- For contenteditable: reads `window.getSelection()`; returns `null` if collapsed, empty, or the
  range's `commonAncestorContainer` isn't inside `field`. Otherwise clones the `Range` (so it
  survives later selection changes elsewhere in the document) and returns its `toString()`.

This is the single source of truth both features below use to answer "is there a selection, and
what is it."

### 2. Popup composer prefill

- New message type in `lib/messaging.ts`:
  ```ts
  export interface GetSelectionMessage {
    type: 'GET_SELECTION';
  }
  ```
- `entrypoints/content/index.tsx` registers a `browser.runtime.onMessage` listener (alongside
  mounting the widget, independent of the widget's enabled/denylist state) that:
  1. If `document.activeElement` is an editable field (`isEditableField`), tries
     `getFieldSelection` on it first.
  2. Otherwise (or if that returns `null`), falls back to `window.getSelection()?.toString() ?? ''`.
  3. Responds with the resulting string.
- `ChatView.tsx`, in a mount-only effect: queries the active tab (reusing the existing
  `browser.tabs.query({ active: true, currentWindow: true })` pattern already used for hostname),
  sends `GET_SELECTION` to it via `browser.tabs.sendMessage`, and if the response is non-empty
  **and** the composer (`input` state) is currently empty, sets `input` to that text.
- One-shot on mount only — no live re-sync while the popup stays open. Never overwrites text the
  user already typed or an in-progress conversation's draft (only fires when `input` is empty at
  that moment, which is always true on a fresh popup mount).
- Failure (no content script on the page, e.g. `chrome://`/`file://` tabs, or the message throws) is
  treated as "no selection" — composer stays empty, no error surfaced. Mirrors how the widget
  already silently no-ops on non-editable pages.

### 3. Widget: rewrite only the selection when present

- `RewriteWidget.tsx` adds `const selectionRangeRef = useRef<FieldSelection | null>(null)`.
- Both places that open the popover — the icon's `onClick` and the `TRIGGER_REWRITE_SHORTCUT`
  message handler — call `getFieldSelection(activeFieldRef.current)` and store the result in
  `selectionRangeRef.current` at that exact moment, before setting `stage` to `'presets'`. Capturing
  here (not later, e.g. inside `runRewrite`) matters because clicking into the popover's
  custom-instruction `<input>` shifts the document's selection away from the original field, so the
  selection would otherwise be unrecoverable by the time the user submits.
- `runRewrite` uses `selectionRangeRef.current?.text || getFieldText(field)` as the text to send —
  selection takes priority when present, whole-field text otherwise (today's behavior).
- `resetWidget` clears `selectionRangeRef.current = null`, so a stale selection can't leak into the
  next activation. It is **not** cleared between "Try another" retries within the same activation —
  retrying re-runs the same captured source text with a different instruction, matching the intent
  of "Try another" today.
- `insertText` (in `field-utils.ts`) gains an optional third parameter,
  `selection?: FieldSelection | null`:
  - `<textarea>`/`<input>`: if `selection.start`/`selection.end` are present, calls
    `field.setSelectionRange(start, end)` instead of `field.select()`.
  - Contenteditable: if `selection.range` is present and its `startContainer.isConnected` is still
    true, restores that Range via `window.getSelection()` instead of `range.selectNodeContents(field)`.
    If the range has gone stale (its container was removed from the DOM, e.g. a rich-text editor
    re-rendered), falls back to whole-field selection — same as no selection being present.
  - The existing `execCommand('insertText', ...)` call is unchanged; it operates on whatever
    selection was just restored, so it naturally splices into just that span.
  - The manual-assignment fallback path (used only if `execCommand` isn't supported) is updated to
    splice using the same offsets/Range instead of overwriting the whole field: for input/textarea,
    `value.slice(0, start) + text + value.slice(end)`; for contenteditable,
    `range.deleteContents(); range.insertNode(document.createTextNode(text))`.
  - `handleReplace` passes `selectionRangeRef.current` through to `insertText`.
- No change to *when* the widget's icon appears or triggers — the `MIN_TEXT_LENGTH` gating in
  `handleFocusIn`/`handleInput` still checks whole-field text length, unchanged. Only what gets
  rewritten/replaced changes, and only when a selection exists at the moment the popover opens.

## Data flow summary

**Popup:**
```
User selects text (page text, or inside an input/textarea) → clicks extension icon → popup opens
        │
        ▼
ChatView mount → query active tab → GET_SELECTION → content script
        │                                   │
        │                     activeElement editable? ──yes──▶ getFieldSelection(activeElement)
        │                                   │no
        │                                   ▼
        │                          window.getSelection()?.toString()
        ▼
Response non-empty AND composer empty → composer prefilled
```

**Widget:**
```
User selects text inside a focused field → clicks widget icon (or keyboard shortcut)
        │
        ▼
getFieldSelection(field) captured into selectionRangeRef, stage → 'presets'
        │
        ▼
User picks a preset / submits custom instruction
        │
        ▼
runRewrite sends selectionRangeRef.text (or whole field text if no selection)
        │
        ▼
User clicks Replace → insertText(field, resultText, selectionRangeRef.current)
        │
        ├─ selection present & still attached → splice into just that span
        └─ no selection / stale → replace whole field (today's behavior)
```

## Error handling

- `GET_SELECTION` failures (no content script, message timeout): treated as "no selection," no
  error shown — same posture as the existing widget's silent no-op on non-editable pages.
- A captured contenteditable `Range` that's gone stale by the time `Replace` is clicked (rare —
  requires the page's own script to have mutated that DOM in the meantime) falls back to whole-field
  replace rather than throwing.
- Everything downstream of "the text to rewrite" (the `REWRITE_REQUEST`/`CHAT_REQUEST` calls, error
  display) is unchanged from today.

## Out of scope

- No live re-sync of the popup composer while it stays open (matches the original selection-autofill
  spec).
- No change to the widget's activation trigger (still field-focus/keyboard-shortcut, not
  selection-based) — a selection only changes *what text* gets rewritten once triggered.
- No handling for selections that span multiple disjoint ranges (`selection.rangeCount > 1`) —
  only `getRangeAt(0)` is used, consistent with typical browser selection behavior.

## Testing

- Manual: select text inside a page's plain content, open popup → composer prefilled. Select text
  inside a `<textarea>`/`<input>`, open popup → composer prefilled with just that substring, not the
  whole field. Open popup with no selection, or with an in-progress draft already in the composer →
  composer unchanged.
- Manual: focus a field with no selection, trigger the widget, rewrite → whole field replaced (no
  regression from today). Select part of a field's text, trigger the widget (icon or shortcut),
  rewrite, click Replace → only the selected span is replaced, surrounding text untouched, for both
  a `<textarea>` and a contenteditable element. Try another after a partial-selection rewrite →
  still operates on the same original selection.
