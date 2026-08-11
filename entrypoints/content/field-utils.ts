export function isEditableField(
  target: EventTarget | null,
): target is HTMLElement {
  if (!target || !(target instanceof Element)) return false;

  const tagName = target.tagName.toUpperCase();

  if (tagName === "TEXTAREA") return true;

  if (tagName === "INPUT") {
    const type = (
      (target as HTMLInputElement).type ||
      target.getAttribute("type") ||
      "text"
    ).toLowerCase();
    const nonTextInputTypes = [
      "button",
      "submit",
      "reset",
      "checkbox",
      "radio",
      "file",
      "image",
      "range",
      "color",
      "hidden",
    ];
    return !nonTextInputTypes.includes(type);
  }

  const htmlEl = target as HTMLElement;
  if (htmlEl.isContentEditable) return true;

  const attrCE = target.getAttribute("contenteditable");
  if (attrCE !== null && attrCE !== "false") return true;

  const role = target.getAttribute("role");
  if (role === "textbox" || role === "searchbox" || role === "combobox")
    return true;

  if (
    target.hasAttribute("data-lexical-editor") ||
    target.getAttribute("data-tab") === "10" ||
    target.getAttribute("title")?.toLowerCase().includes("type a message") ||
    target.getAttribute("aria-label")?.toLowerCase().includes("type a message")
  ) {
    return true;
  }

  return false;
}

export function isSearchField(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;

  const el = target as HTMLElement;

  const attrCheck = (val: string | null | undefined): boolean => {
    if (!val) return false;
    const lower = String(val).toLowerCase();
    return lower.includes("search") || lower.includes("find");
  };

  const tagName = el.tagName.toUpperCase();

  if (tagName === "INPUT") {
    const inputEl = el as HTMLInputElement;
    const type = (
      inputEl.type ||
      inputEl.getAttribute("type") ||
      ""
    ).toLowerCase();
    if (type === "search" || type.includes("search")) return true;

    const name = (
      inputEl.name ||
      inputEl.getAttribute("name") ||
      ""
    ).toLowerCase();
    if (
      name === "q" ||
      name === "s" ||
      name === "query" ||
      name === "k" ||
      name === "kw" ||
      name === "keyword" ||
      name.includes("search") ||
      name.includes("find")
    ) {
      return true;
    }
  }

  // Role check
  const role = (el.getAttribute("role") || "").toLowerCase();
  if (role === "searchbox" || role === "search") return true;

  // Attributes check (placeholder, aria-label, aria-description, id, title, autocomplete, data-*)
  if (attrCheck(el.getAttribute("placeholder"))) return true;
  if (attrCheck(el.getAttribute("aria-label"))) return true;
  if (attrCheck(el.getAttribute("aria-description"))) return true;
  if (attrCheck(el.id)) return true;
  if (attrCheck(el.getAttribute("title"))) return true;
  if (attrCheck(el.getAttribute("autocomplete"))) return true;
  if (attrCheck(el.getAttribute("data-testid"))) return true;
  if (attrCheck(el.getAttribute("data-qa"))) return true;
  if (attrCheck(el.getAttribute("data-cy"))) return true;
  if (attrCheck(el.getAttribute("data-id"))) return true;
  if (attrCheck(el.getAttribute("data-action"))) return true;
  if (attrCheck(el.getAttribute("data-component"))) return true;

  // Class name check
  const className =
    typeof el.className === "string"
      ? el.className
      : el.getAttribute("class") || "";
  if (attrCheck(className)) return true;

  // Ancestor container check via closest selector
  if (el.closest) {
    const searchAncestor = el.closest(
      'form[role="search"], form[action*="search"], [role="search"], [role="searchbox"], .search-box, .search-bar, .search-container, .searchbox, #search, #searchbar, #search-input, [data-testid*="search" i], [aria-label*="search" i]',
    );
    if (searchAncestor) return true;
  }

  // Parent traversal check (up to 4 levels)
  let parent: HTMLElement | null = el.parentElement;
  let depth = 0;
  while (parent && depth < 4 && parent !== document.body) {
    if (
      attrCheck(parent.id) ||
      attrCheck(
        typeof parent.className === "string"
          ? parent.className
          : parent.getAttribute("class"),
      ) ||
      attrCheck(parent.getAttribute("aria-label")) ||
      attrCheck(parent.getAttribute("role"))
    ) {
      return true;
    }
    parent = parent.parentElement;
    depth++;
  }

  return false;
}

export function getDeepActiveElement(): HTMLElement | null {
  let active = document.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active instanceof HTMLElement ? active : null;
}

export function findEditableField(
  target: EventTarget | null,
): HTMLElement | null {
  if (!target || !(target instanceof Element)) {
    // Fallback: search for active/visible contenteditable or textbox on page (e.g. WhatsApp Web)
    const activeEl = getDeepActiveElement() || document.activeElement;
    if (activeEl && activeEl !== document.body && isEditableField(activeEl)) {
      return findEditableField(activeEl);
    }
    const pageField = document.querySelector<HTMLElement>(
      'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], [role="textbox"], textarea:not([type="hidden"])',
    );
    if (pageField && isEditableField(pageField)) {
      return pageField;
    }
    return null;
  }

  let curr: Element | null = target;

  while (curr) {
    const closest = curr.closest
      ? curr.closest(
          'textarea, input, [contenteditable], [role="textbox"], [role="searchbox"], [role="combobox"], [data-tab="10"], [data-lexical-editor="true"]',
        )
      : null;

    const candidate = (closest ||
      (isEditableField(curr) ? curr : null)) as HTMLElement | null;

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
  if (
    field.tagName === "TEXTAREA" ||
    field.tagName === "INPUT" ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLInputElement
  ) {
    return (field as HTMLInputElement).value || "";
  }

  try {
    const clone = field.cloneNode(true) as HTMLElement;
    // Extract emoji alt text from img tags (common in WhatsApp Web, Twitter, Slack)
    const imgs = clone.querySelectorAll("img");
    imgs.forEach((img) => {
      const alt =
        img.getAttribute("alt") || img.getAttribute("data-plain-text") || "";
      if (alt) {
        img.replaceWith(document.createTextNode(alt));
      }
    });

    const text = clone.innerText || clone.textContent || "";
    // Strip zero-width control characters inserted by Lexical/Draft.js
    return text.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
  } catch {
    const raw = field.innerText || field.textContent || "";
    return raw.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
  }
}

export interface FieldSelection {
  text: string;
  start?: number;
  end?: number;
  range?: Range;
}

export function getFieldSelection(field: HTMLElement): FieldSelection | null {
  if (
    field.tagName === "TEXTAREA" ||
    field.tagName === "INPUT" ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLInputElement
  ) {
    try {
      const inputEl = field as HTMLInputElement | HTMLTextAreaElement;
      const { selectionStart, selectionEnd, value } = inputEl;
      if (
        selectionStart == null ||
        selectionEnd == null ||
        selectionStart === selectionEnd
      )
        return null;
      const text = value.slice(selectionStart, selectionEnd);
      if (!text.trim()) return null;
      return { text, start: selectionStart, end: selectionEnd };
    } catch {
      // Input type doesn't support selection (e.g., email)
      return null;
    }
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return null;
  const range = selection.getRangeAt(0);
  if (
    !field.contains(range.commonAncestorContainer) &&
    field !== range.commonAncestorContainer
  )
    return null;
  const text = range.toString();
  if (!text.trim()) return null;
  return { text, range: range.cloneRange() };
}

/**
 * Writes text into a field the way a user typing would, so frameworks that listen
 * for native input events (React, Slate, Draft.js, Lexical, WhatsApp Web, etc.) pick up the change.
 */
export function insertText(
  field: HTMLElement,
  text: string,
  selection?: FieldSelection | null,
): void {
  try {
    field.focus();
  } catch {
    // Ignore focus failure if non-focusable
  }

  const activeSelection =
    selection &&
    (!selection.range ||
      (selection.range.startContainer.isConnected &&
        selection.range.endContainer.isConnected))
      ? selection
      : null;

  const isInput =
    field.tagName === "TEXTAREA" ||
    field.tagName === "INPUT" ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLInputElement;

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
    // For ContentEditable (e.g. WhatsApp Lexical), select text contents without destroying wrapper DOM
    try {
      document.execCommand("selectAll", false);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(field);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  let inserted = false;

  // 1. Try document.execCommand('insertText', false, text)
  try {
    inserted = document.execCommand("insertText", false, text);
  } catch {
    // Fall through
  }

  // 2. Try paste event fallback if execCommand was prevented or failed (vital for Lexical/WhatsApp Web)
  if (!inserted || !isInput) {
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", text);
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      field.dispatchEvent(pasteEvent);
    } catch {
      // Ignore ClipboardEvent error
    }
  }

  // 3. Fallback direct DOM manipulation if standard browser commands fail
  if (!inserted && !isInput) {
    try {
      if (activeSelection?.range) {
        activeSelection.range.deleteContents();
        activeSelection.range.insertNode(document.createTextNode(text));
      } else {
        // Preserving paragraph hierarchy for WhatsApp Web / Lexical
        const paragraph = field.querySelector("p");
        if (paragraph) {
          paragraph.textContent = text;
        } else {
          field.textContent = text;
        }
      }
    } catch {
      field.textContent = text;
    }
  } else if (!inserted && isInput) {
    const inputEl = field as HTMLInputElement | HTMLTextAreaElement;
    const prototype =
      inputEl.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      prototype.prototype,
      "value",
    )?.set;
    if (activeSelection?.start != null && activeSelection.end != null) {
      const full = inputEl.value;
      setter?.call(
        inputEl,
        full.slice(0, activeSelection.start) +
          text +
          full.slice(activeSelection.end),
      );
    } else {
      setter?.call(inputEl, text);
    }
  }

  // Dispatch synthetic beforeinput, input, and change events to notify framework state observers (React/Lexical/Vue/Angular)
  try {
    field.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data: text,
      }),
    );
  } catch {
    // Ignore
  }
  try {
    field.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data: text,
      }),
    );
  } catch {
    field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }
  field.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
