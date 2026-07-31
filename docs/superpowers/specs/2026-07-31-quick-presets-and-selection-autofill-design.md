# Quick Presets, Selection Autofill & Sticky Model/Preset — Design

## Goal

Reduce the effort needed to rewrite text with the extension by:

1. Auto-filling the popup's chat input with whatever text the user had selected on the page when
   they opened the extension.
2. Offering one-click tone/style presets (Professional, Polite, Spell Check, etc.) below the input
   in both the popup and the existing in-page widget, instead of requiring a typed instruction.
3. Remembering the last model/provider and the last preset used, so returning users don't have to
   re-pick them every session.

## Current state (for context)

- `lib/presets.ts` already defines `REWRITE_PRESETS` (`Concise`, `Formal`, `Friendly`, `Fix
  Grammar`), but only the in-page widget (`entrypoints/content/RewriteWidget.tsx`) consumes it. The
  popup's chat composer (`entrypoints/popup/ChatView.tsx`) has no preset buttons.
- The widget triggers on focusing an editable field, not on page text selection — this design does
  not change that trigger.
- The popup has no way to read the page's current text selection today.
- `Settings.defaultProvider` / `Settings.defaultModel` (`lib/storage.ts`) are set once during setup
  and never updated afterward — changing the provider/model dropdown in `ChatView` only changes
  local component state, lost on next open.

## Decisions

### 1. Preset set (shared by popup and widget)

Replace/extend `REWRITE_PRESETS` in `lib/presets.ts` with 9 presets, reusing the existing
`{id, label, instruction}` shape:

- **Professional** (renamed from `Formal`, same instruction)
- **Polite** (new)
- **Friendly** (unchanged)
- **Casual** (new — distinct from Friendly: more relaxed/informal)
- **Concise** (unchanged)
- **Expand** (new — make text longer/more detailed while preserving meaning)
- **Simplify** (new — simpler words/shorter sentences)
- **Persuasive** (new — more compelling/convincing)
- **Spell Check** (renamed from `Fix Grammar`, same instruction — already covers grammar/spelling/
  punctuation)

This list is a single source of truth imported by both `RewriteWidget.tsx` and `ChatView.tsx`. No
settings UI to configure presets — fixed set, code change only if it ever needs to change.

### 2. Preset button layout

Both surfaces render presets as a wrapping row of pill buttons (the widget's existing
`.rw-popover__presets` flex-wrap pattern, reused for the popup composer). With 9 items the row
wraps to 2–3 lines; no scrolling container, no overflow/"more" menu.

- **Widget**: no change to *when* the presets appear (still shown in the popover after
  focusing/triggering rewrite on a field) — it just renders the expanded list.
- **Popup**: a new preset row renders directly below the composer `<textarea>` (above/beside the
  Send button). Buttons are disabled when the textarea is empty, same guard as the Send button.

Clicking a preset button in the popup:
- Takes the current textarea content as the text to rewrite.
- Sends a `CHAT_REQUEST` immediately, combining `<preset.instruction>` and the textarea text (same
  composition `buildRewriteMessages` already uses for the widget's rewrite flow).
- Appends the result as the assistant's reply in the conversation (identical rendering path to a
  normal Send).
- Clears the textarea afterward.

No "prefill instruction, let user edit" path — clicking a preset always fires immediately.

### 3. Selection autofill (popup only)

On `ChatView` mount:
- Send a new runtime message `GET_SELECTION` to the active tab.
- The content script (`entrypoints/content/index.tsx`) registers a `browser.runtime.onMessage`
  handler for `GET_SELECTION` that responds with `window.getSelection()?.toString() ?? ''`.
- If the response is non-empty **and** the composer textarea is currently empty, pre-fill the
  textarea with that text.
- One-shot on open only — no live re-sync while the popup stays open, and it never overwrites text
  the user already typed/pasted or an in-progress conversation's draft.

This does not touch the in-page widget's trigger — the widget still activates on field focus, not
on page-text selection.

### 4. Sticky model/provider and last-used preset

- Whenever the provider or model dropdown changes in `ChatView`, immediately persist the new value
  into `settingsStorage` under the existing `defaultProvider` / `defaultModel` fields (no schema
  change — these fields already exist and are already read on mount by both `ChatView` and
  `RewriteWidget`; today they're just never *written* after initial setup). This alone makes model
  choice sticky everywhere without adding new state.
- Add one new field to `Settings` (`lib/storage.ts`): `lastPresetId?: string`. Updated whenever a
  preset button is clicked in either surface.
- On mount, both surfaces read `lastPresetId` and render that preset button with a distinct
  highlighted/outlined style (visual marker only — clicking it still fires the rewrite/chat request
  like any other preset; it is not auto-triggered on open).

## Data flow summary

```
User selects text on page
        │
        ▼
User clicks extension icon → popup opens
        │
        ▼
ChatView mount → GET_SELECTION → content script → returns selection text
        │
        ▼ (if composer empty)
Composer textarea pre-filled with selected text
        │
        ▼
User clicks a preset pill (e.g. "Professional")
        │
        ├─ persists lastPresetId
        ├─ builds CHAT_REQUEST: instruction + textarea text
        ├─ sends via browser.runtime.sendMessage → background.ts → provider client
        └─ renders assistant reply in chat, clears textarea
```

Provider/model dropdown changes in ChatView write straight to `settingsStorage.defaultProvider` /
`defaultModel` in parallel with updating local state, independent of the flow above.

## Error handling

- `GET_SELECTION` failures (no content script on the page, e.g. `chrome://` pages, or the message
  times out): treated as "no selection" — composer stays empty, no error shown to the user. This
  mirrors how the widget already silently no-ops on non-editable pages.
- Preset-triggered `CHAT_REQUEST` failures use the exact same error path `ChatView.handleSend`
  already has for a typed message (error surfaced as a failed assistant message in the thread).

## Out of scope

- No changes to the widget's activation trigger (still field-focus, not selection-based).
- No user-configurable preset list/settings UI.
- No per-preset model override — presets only supply the instruction text.
- No syncing "last preset" across devices beyond whatever `browser.storage` already provides.

## Testing

- Unit-level: `lib/presets.ts` content (labels/instructions match the list above).
- Manual: popup opened with an active page selection → textarea pre-filled; popup opened with no
  selection or an in-progress draft → textarea unchanged; clicking each preset in both popup and
  widget produces a rewrite using that preset's instruction; provider/model change in popup
  persists across a popup close/reopen and is reflected in the widget's next rewrite call; last-used
  preset shows the highlighted style on next open in both surfaces.
