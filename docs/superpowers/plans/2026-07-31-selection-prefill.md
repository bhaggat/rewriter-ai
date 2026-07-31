# Selection Prefill (Popup Composer + Widget Partial-Selection Rewrite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user has a text selection on a page (including inside an `<input>`/`<textarea>`), the extension popup's chat composer prefills with it, and the in-page rewrite widget rewrites only that selection instead of the whole field.

**Architecture:** A single shared DOM helper (`getFieldSelection`) reads "is there a selection, and what is it" for both native form fields and contenteditable elements. The popup asks the content script for the page's current selection via a new runtime message. The widget captures the selection at the moment it's triggered (icon click / keyboard shortcut) and threads it through the existing rewrite → replace flow.

**Tech Stack:** WXT (browser extension framework), React 19, TypeScript, `browser.*` WebExtension APIs (via `wxt`'s `browser` global).

## Global Constraints

- No live re-sync of the popup composer after mount — it's a one-shot prefill only, and never overwrites a non-empty composer.
- No change to the widget's activation trigger — it still activates on field focus / the keyboard shortcut, unchanged. Only what text gets rewritten/replaced changes.
- Only `selection.getRangeAt(0)` is used — no handling for multi-range selections.
- `GET_SELECTION` failures (no content script on the tab, e.g. `chrome://`/`file://` pages) are treated as "no selection" — never surfaced as an error.
- This project has **no automated test runner** (no vitest/jest — check `package.json`). `npm run compile` (`tsc --noEmit`) and `npm run lint` (`eslint .`) are the available automated gates for every task. Behavioral verification is manual, via `npm run dev` (WXT launches a Chrome window with the extension loaded and hot-reloads on file changes) — each task below spells out the exact manual steps.
- Spec: `docs/superpowers/specs/2026-07-31-selection-prefill-design.md`.

---

### Task 1: Shared selection helpers in `field-utils.ts`

**Files:**
- Modify: `entrypoints/content/field-utils.ts`

**Interfaces:**
- Produces: `export interface FieldSelection { text: string; start?: number; end?: number; range?: Range }`, `export function getFieldSelection(field: HTMLElement): FieldSelection | null`, and an updated signature `export function insertText(field: HTMLElement, text: string, selection?: FieldSelection | null): void` (third param is new and optional — existing two-arg call sites keep working unchanged).

- [ ] **Step 1: Add `FieldSelection` and `getFieldSelection`**

Insert after `getFieldText` (after line 15):

```ts
export interface FieldSelection {
  text: string;
  start?: number;
  end?: number;
  range?: Range;
}

export function getFieldSelection(field: HTMLElement): FieldSelection | null {
  if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    const { selectionStart, selectionEnd, value } = field;
    if (selectionStart == null || selectionEnd == null || selectionStart === selectionEnd) return null;
    return { text: value.slice(selectionStart, selectionEnd), start: selectionStart, end: selectionEnd };
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!field.contains(range.commonAncestorContainer)) return null;
  const text = range.toString();
  if (!text) return null;
  return { text, range: range.cloneRange() };
}
```

- [ ] **Step 2: Rewrite `insertText` to accept an optional selection**

Replace the existing `insertText` function (currently lines 21-50) with:

```ts
/**
 * Writes text into a field the way a user typing would, so frameworks that listen
 * for native input events (React, Slate, Draft.js, etc.) pick up the change. When
 * `selection` is given, only that span is replaced instead of the whole field — the
 * selection is restored right before writing, so `execCommand('insertText', ...)`
 * naturally splices into just that span.
 */
export function insertText(field: HTMLElement, text: string, selection?: FieldSelection | null): void {
  field.focus();

  const activeSelection =
    selection && (!selection.range || selection.range.startContainer.isConnected) ? selection : null;

  if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    if (activeSelection?.start != null && activeSelection.end != null) {
      field.setSelectionRange(activeSelection.start, activeSelection.end);
    } else {
      field.select();
    }
  } else if (activeSelection?.range) {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(activeSelection.range);
  } else {
    const range = document.createRange();
    range.selectNodeContents(field);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  let inserted = false;
  try {
    inserted = document.execCommand('insertText', false, text);
  } catch {
    // Fall through to the manual-assignment path below.
  }

  if (inserted) return;

  if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(prototype.prototype, 'value')?.set;
    if (activeSelection?.start != null && activeSelection.end != null) {
      const full = field.value;
      setter?.call(field, full.slice(0, activeSelection.start) + text + full.slice(activeSelection.end));
    } else {
      setter?.call(field, text);
    }
  } else if (activeSelection?.range) {
    activeSelection.range.deleteContents();
    activeSelection.range.insertNode(document.createTextNode(text));
  } else {
    field.textContent = text;
  }
  field.dispatchEvent(new Event('input', { bubbles: true }));
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npm run compile && npm run lint`
Expected: both exit with no errors. (`RewriteWidget.tsx` still calls `insertText(field, resultText)` with two args at this point — that must still type-check since the third param is optional.)

- [ ] **Step 4: Commit**

```bash
git add entrypoints/content/field-utils.ts
git commit -m "Add selection-aware field helpers"
```

---

### Task 2: `GET_SELECTION` message + content script handler

**Files:**
- Modify: `lib/messaging.ts`
- Modify: `entrypoints/content/index.tsx`

**Interfaces:**
- Consumes: `getFieldSelection`, `isEditableField` from `entrypoints/content/field-utils.ts` (Task 1).
- Produces: `export interface GetSelectionMessage { type: 'GET_SELECTION' }` in `lib/messaging.ts`; a `browser.runtime.onMessage` listener in the content script that responds to `GET_SELECTION` with a `string` (the page's current selection, or `''`).

- [ ] **Step 1: Add the message type**

In `lib/messaging.ts`, add after `TriggerRewriteShortcutMessage` (after line 24):

```ts
export interface GetSelectionMessage {
  type: 'GET_SELECTION';
}
```

- [ ] **Step 2: Register the content script handler**

In `entrypoints/content/index.tsx`, update imports and add the listener inside `main`, before the `createShadowRootUi` call:

```tsx
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { createRoot } from 'react-dom/client';
import RewriteWidget from './RewriteWidget';
import { getFieldSelection, isEditableField } from './field-utils';
import type { GetSelectionMessage } from '@/lib/messaging';
import './style.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    browser.runtime.onMessage.addListener((message: GetSelectionMessage) => {
      if (message.type !== 'GET_SELECTION') return;
      const active = document.activeElement;
      if (isEditableField(active)) {
        const selection = getFieldSelection(active);
        if (selection) return Promise.resolve(selection.text);
      }
      return Promise.resolve(window.getSelection()?.toString() ?? '');
    });

    const ui = await createShadowRootUi(ctx, {
      name: 'rewriter-ai-widget',
      position: 'modal',
      zIndex: 2147483647,
      onMount: (container, _shadow, shadowHost) => {
        // The container spans the full viewport (position: modal); only our
        // own icon/popover elements should intercept pointer events.
        container.style.pointerEvents = 'none';
        const root = createRoot(container);
        root.render(<RewriteWidget hostElement={shadowHost} />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });

    ui.mount();
  },
});
```

- [ ] **Step 3: Verify types and lint**

Run: `npm run compile && npm run lint`
Expected: both exit with no errors.

- [ ] **Step 4: Manual verification of the handler**

Run: `npm run dev` (this opens a Chrome window with the extension loaded).

1. Navigate to any regular web page with a paragraph of text (not an input/textarea) and select a few words with the mouse.
2. Open `chrome://extensions`, find the extension, click "service worker" (or "background page") to open its devtools console.
3. In that console, run:
   ```js
   const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
   await browser.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
   ```
   (Adjust the tab query if the page tab isn't the last-focused window — you can also just hardcode the tab's numeric id from `chrome://extensions` → "Inspect views".)
4. Expected: the exact text you selected on the page is returned as a string.
5. Now click into a `<textarea>` on any page (e.g. a GitHub comment box), type some text, and select part of it with the mouse (keep focus in the textarea). Re-run the same console snippet.
6. Expected: only the substring you selected inside the textarea is returned — not the whole textarea's content, and not empty.

- [ ] **Step 5: Commit**

```bash
git add lib/messaging.ts entrypoints/content/index.tsx
git commit -m "Add GET_SELECTION content script handler"
```

---

### Task 3: Popup composer prefill

**Files:**
- Modify: `entrypoints/popup/ChatView.tsx`

**Interfaces:**
- Consumes: `GetSelectionMessage` from `lib/messaging.ts` (Task 2); the content script's `GET_SELECTION` response (Task 2).

- [ ] **Step 1: Add the mount-time selection fetch**

In `entrypoints/popup/ChatView.tsx`, add the import:

```ts
import type { BackgroundResponse, ChatRequest, GetSelectionMessage } from '@/lib/messaging';
```

(this replaces the existing `import type { BackgroundResponse, ChatRequest } from '@/lib/messaging';` line)

Add a new effect directly after the existing hostname-detection effect (after line 60, the `browser.tabs.query(...).then(...)` block):

```ts
useEffect(() => {
  (async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const message: GetSelectionMessage = { type: 'GET_SELECTION' };
      const selected = await browser.tabs.sendMessage(tab.id, message);
      if (typeof selected === 'string' && selected.trim()) {
        setInput((current) => (current ? current : selected));
      }
    } catch {
      // No content script on this tab (e.g. chrome:// or file://) — leave composer as-is.
    }
  })();
  // One-shot prefill on mount only — not a live sync while the popup stays open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 2: Verify types and lint**

Run: `npm run compile && npm run lint`
Expected: both exit with no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`.

1. Navigate to any regular web page with a paragraph of text and select a sentence with the mouse.
2. Click the extension's toolbar icon to open the popup.
3. Expected: the composer textarea is prefilled with the selected sentence.
4. Close the popup. Click into a `<textarea>` on some page (e.g. a comment box), type a sentence, and select part of it with the mouse.
5. Open the popup again.
6. Expected: the composer is prefilled with only the selected substring, not the whole textarea's content.
7. Close the popup, open it again with no selection on the page.
8. Expected: composer is empty (unless a prior conversation draft already had content — either way, nothing gets overwritten).
9. Open the popup, manually type something into the composer without sending, close the popup, select different text on the page, and reopen.
10. Expected: since the popup fully remounts on close/reopen, this always starts from an empty composer — confirm the prefill still applies correctly on this fresh mount (there is no persisted draft across popup close/reopen today, so there's nothing to protect here beyond what step 3 already confirms).
11. Navigate to a `chrome://extensions` page (no content script runs there), open the popup.
12. Expected: no error is shown; composer behaves as if there were no selection.

- [ ] **Step 4: Commit**

```bash
git add entrypoints/popup/ChatView.tsx
git commit -m "Prefill popup composer from page selection"
```

---

### Task 4: Widget rewrites only the selection when present

**Files:**
- Modify: `entrypoints/content/RewriteWidget.tsx`

**Interfaces:**
- Consumes: `FieldSelection`, `getFieldSelection` from `entrypoints/content/field-utils.ts` (Task 1); `insertText(field, text, selection?)` new signature (Task 1).

- [ ] **Step 1: Import the new helpers and add the ref**

Change the field-utils import (line 4) from:

```ts
import { clamp, getFieldText, insertText, isEditableField } from './field-utils';
```

to:

```ts
import { clamp, getFieldSelection, getFieldText, insertText, isEditableField, type FieldSelection } from './field-utils';
```

Add a new ref next to `activeFieldRef` (after line 32):

```ts
const selectionRangeRef = useRef<FieldSelection | null>(null);
```

- [ ] **Step 2: Clear the captured selection whenever the widget resets or the active field changes**

In `resetWidget` (lines 35-43), add the clear:

```ts
const resetWidget = useCallback(() => {
  setShowIcon(false);
  setStage('idle');
  setResultText('');
  setErrorText('');
  setCustomInstruction('');
  setCopied(false);
  setRect(null);
  selectionRangeRef.current = null;
}, []);
```

In `handleFocusIn` (inside the trigger-detection effect, around line 74), add a guard right where the active field is reassigned — this prevents a selection captured for a previous field from leaking into a later activation on a different field that received focus without going through `resetWidget` first:

```ts
function handleFocusIn(event: FocusEvent) {
  if (!isEditableField(event.target)) return;
  const target = event.target;
  if (target !== activeFieldRef.current) selectionRangeRef.current = null;
  activeFieldRef.current = target;

  // A field can already hold text when it's focused (an existing draft, a
  // pre-filled title), so check right away instead of waiting for the next
  // keystroke to fire the debounced `input` handler below.
  if (stage !== 'idle') return;
  if (debounceRef.current) clearTimeout(debounceRef.current);
  const text = getFieldText(target);
  if (text.trim().length >= MIN_TEXT_LENGTH) {
    setRect(target.getBoundingClientRect());
    setShowIcon(true);
  } else {
    setShowIcon(false);
  }
}
```

- [ ] **Step 3: Capture the selection at the two trigger points**

The icon's `onClick` (around line 217) changes from:

```tsx
onClick={() => setStage('presets')}
```

to:

```tsx
onClick={() => {
  selectionRangeRef.current = activeFieldRef.current ? getFieldSelection(activeFieldRef.current) : null;
  setStage('presets');
}}
```

The keyboard-shortcut handler (inside the `TRIGGER_REWRITE_SHORTCUT` effect, around lines 141-148) changes from:

```ts
function handleMessage(message: TriggerRewriteShortcutMessage) {
  if (message.type !== 'TRIGGER_REWRITE_SHORTCUT' || !enabled) return;
  const field = activeFieldRef.current;
  if (!field || !getFieldText(field).trim()) return;
  setRect(field.getBoundingClientRect());
  setShowIcon(true);
  setStage('presets');
}
```

to:

```ts
function handleMessage(message: TriggerRewriteShortcutMessage) {
  if (message.type !== 'TRIGGER_REWRITE_SHORTCUT' || !enabled) return;
  const field = activeFieldRef.current;
  if (!field || !getFieldText(field).trim()) return;
  selectionRangeRef.current = getFieldSelection(field);
  setRect(field.getBoundingClientRect());
  setShowIcon(true);
  setStage('presets');
}
```

- [ ] **Step 4: Use the captured selection as the rewrite text**

In `runRewrite` (lines 153-179), change:

```ts
const text = getFieldText(field);
if (!text.trim()) return;
```

to:

```ts
const text = selectionRangeRef.current?.text || getFieldText(field);
if (!text.trim()) return;
```

- [ ] **Step 5: Splice the result back into just the selected span**

In `handleReplace` (lines 181-184), change:

```ts
function handleReplace() {
  if (activeFieldRef.current) insertText(activeFieldRef.current, resultText);
  resetWidget();
}
```

to:

```ts
function handleReplace() {
  if (activeFieldRef.current) insertText(activeFieldRef.current, resultText, selectionRangeRef.current);
  resetWidget();
}
```

- [ ] **Step 6: Verify types and lint**

Run: `npm run compile && npm run lint`
Expected: both exit with no errors.

- [ ] **Step 7: Manual verification — no regression on whole-field rewrite**

Run: `npm run dev`.

1. On a page where the widget is enabled, click into an empty `<textarea>` and type at least 8 characters with no selection.
2. Click the widget's icon, pick a preset (e.g. "Concise").
3. Expected: the rewrite is generated and, after clicking Replace, the *entire* textarea content is replaced — same as before this change (no regression).

- [ ] **Step 8: Manual verification — partial-selection rewrite in a `<textarea>`**

1. In a `<textarea>` containing a couple of sentences, select just one sentence with the mouse (leave the rest of the text unselected).
2. Click the widget's icon (it should appear near the field as usual), pick a preset.
3. Expected: the popover's result shows a rewrite of *only the selected sentence*, not the whole textarea.
4. Click Replace.
5. Expected: only the previously-selected sentence is replaced in place; the rest of the textarea's text is unchanged and in the same position.

- [ ] **Step 9: Manual verification — partial-selection rewrite in a contenteditable element**

1. Find or open a page with a contenteditable element (e.g. a rich-text comment box, or open `data:text/html,<div contenteditable style="border:1px solid">Some editable text here for testing.</div>` directly in the browser's address bar).
2. Click into it, select part of the text (e.g. the word "editable"), and trigger the widget.
3. Expected: the rewrite result reflects only the selected word/phrase.
4. Click Replace.
5. Expected: only that word/phrase is replaced; the surrounding text is untouched.

- [ ] **Step 10: Manual verification — "Try another" keeps the same captured selection**

1. Repeat step 8's selection setup, trigger the widget, pick a preset to get a result.
2. Click "Try another," then pick a different preset.
3. Expected: the second rewrite is still based on the *original* selected sentence, not the full field or the (now-replaced) popover state.

- [ ] **Step 11: Commit**

```bash
git add entrypoints/content/RewriteWidget.tsx
git commit -m "Rewrite only the active selection in the in-page widget when present"
```
