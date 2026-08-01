export function isEditableField(target: EventTarget | null): target is HTMLElement {
  if (!target || !(target instanceof Element)) return false;

  const tagName = target.tagName.toUpperCase();

  if (tagName === 'TEXTAREA') return true;

  if (tagName === 'INPUT') {
    const type = ((target as HTMLInputElement).type || target.getAttribute('type') || 'text').toLowerCase();
    const nonTextInputTypes = [
      'button',
      'submit',
      'reset',
      'checkbox',
      'radio',
      'file',
      'image',
      'range',
      'color',
      'hidden',
    ];
    return !nonTextInputTypes.includes(type);
  }

  const htmlEl = target as HTMLElement;
  if (htmlEl.isContentEditable) return true;

  const attrCE = target.getAttribute('contenteditable');
  if (attrCE !== null && attrCE !== 'false') return true;

  const role = target.getAttribute('role');
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;

  return false;
}

export function getDeepActiveElement(): HTMLElement | null {
  let active = document.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active instanceof HTMLElement ? active : null;
}

export function findEditableField(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target instanceof Element)) return null;

  let curr: Element | null = target;

  while (curr) {
    const closest = curr.closest
      ? curr.closest('textarea, input, [contenteditable], [role="textbox"], [role="searchbox"], [role="combobox"]')
      : null;

    const candidate = (closest || (isEditableField(curr) ? curr : null)) as HTMLElement | null;

    if (candidate && isEditableField(candidate)) {
      // If contenteditable, walk up to the topmost editable container so we don't return an inner <span>/<p>/<br>
      if (candidate.isContentEditable) {
        let rootEditable = candidate;
        while (
          rootEditable.parentElement &&
          rootEditable.parentElement.isContentEditable &&
          isEditableField(rootEditable.parentElement)
        ) {
          rootEditable = rootEditable.parentElement;
        }
        return rootEditable;
      }
      return candidate;
    }

    // Traverse shadow DOM host if present
    const root: Node | null = curr.getRootNode ? curr.getRootNode() : null;
    if (root instanceof ShadowRoot) {
      curr = root.host;
    } else {
      break;
    }
  }

  return null;
}

export function getFieldText(field: HTMLElement): string {
  if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT' || field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    return (field as HTMLInputElement).value || '';
  }
  return field.innerText || field.textContent || '';
}

export interface FieldSelection {
  text: string;
  start?: number;
  end?: number;
  range?: Range;
}

export function getFieldSelection(field: HTMLElement): FieldSelection | null {
  if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT' || field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    try {
      const inputEl = field as HTMLInputElement | HTMLTextAreaElement;
      const { selectionStart, selectionEnd, value } = inputEl;
      if (selectionStart == null || selectionEnd == null || selectionStart === selectionEnd) return null;
      const text = value.slice(selectionStart, selectionEnd);
      if (!text.trim()) return null;
      return { text, start: selectionStart, end: selectionEnd };
    } catch {
      // Input type doesn't support selection (e.g., email)
      return null;
    }
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!field.contains(range.commonAncestorContainer) && field !== range.commonAncestorContainer) return null;
  const text = range.toString();
  if (!text.trim()) return null;
  return { text, range: range.cloneRange() };
}

/**
 * Writes text into a field the way a user typing would, so frameworks that listen
 * for native input events (React, Slate, Draft.js, Lexical, etc.) pick up the change.
 */
export function insertText(field: HTMLElement, text: string, selection?: FieldSelection | null): void {
  try {
    field.focus();
  } catch {
    // Ignore focus failure if non-focusable
  }

  const activeSelection =
    selection && (!selection.range || (selection.range.startContainer.isConnected && selection.range.endContainer.isConnected))
      ? selection
      : null;

  const isInput = field.tagName === 'TEXTAREA' || field.tagName === 'INPUT' || field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement;

  if (isInput) {
    const inputEl = field as HTMLInputElement | HTMLTextAreaElement;
    if (activeSelection?.start != null && activeSelection.end != null) {
      try {
        inputEl.setSelectionRange(activeSelection.start, activeSelection.end);
      } catch {
        inputEl.select();
      }
    } else {
      inputEl.select();
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
    // Fall through
  }

  if (!inserted) {
    if (isInput) {
      const inputEl = field as HTMLInputElement | HTMLTextAreaElement;
      const prototype = inputEl.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(prototype.prototype, 'value')?.set;
      if (activeSelection?.start != null && activeSelection.end != null) {
        const full = inputEl.value;
        setter?.call(inputEl, full.slice(0, activeSelection.start) + text + full.slice(activeSelection.end));
      } else {
        setter?.call(inputEl, text);
      }
    } else if (activeSelection?.range) {
      activeSelection.range.deleteContents();
      activeSelection.range.insertNode(document.createTextNode(text));
    } else {
      field.textContent = text;
    }
  }

  // Dispatch events to notify React and other frameworks of input mutation
  try {
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
  } catch {
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
