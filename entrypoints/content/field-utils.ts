export function isEditableField(target: EventTarget | null): target is HTMLElement {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
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
    return !nonTextInputTypes.includes(target.type.toLowerCase());
  }
  if (target.isContentEditable) return true;

  const attrCE = target.getAttribute('contenteditable');
  if (attrCE !== null && attrCE !== 'false') return true;

  const role = target.getAttribute('role');
  if (role === 'textbox') return true;

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
  const el = target as Element;
  if (isEditableField(el)) return el as HTMLElement;

  const closest = el.closest('[contenteditable], [role="textbox"], input, textarea');
  if (closest && isEditableField(closest)) {
    return closest as HTMLElement;
  }
  return null;
}

export function getFieldText(field: HTMLElement): string {
  if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    return field.value;
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
  if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    try {
      const { selectionStart, selectionEnd, value } = field;
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
  if (!field.contains(range.commonAncestorContainer)) return null;
  const text = range.toString();
  if (!text.trim()) return null;
  return { text, range: range.cloneRange() };
}

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
    selection && (!selection.range || (selection.range.startContainer.isConnected && selection.range.endContainer.isConnected))
      ? selection
      : null;

  if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    if (activeSelection?.start != null && activeSelection.end != null) {
      try {
        field.setSelectionRange(activeSelection.start, activeSelection.end);
      } catch {
        // Input type doesn't support selection (e.g., email)
        field.select();
      }
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
