import {
  isSiteExcluded,
  lastWritingStyleStorage,
  presetsStorage,
  settingsStorage,
  type Settings,
} from "@/lib/storage";
import { resolveInstruction, type RewritePreset } from "@/lib/presets";
import {
  clamp,
  findEditableField,
  getDeepActiveElement,
  getFieldSelection,
  getFieldText,
  insertText,
  isEditableField,
  isSearchField,
  type FieldSelection,
} from "./field-utils";
import { isMacPlatform } from "@/lib/shortcuts";
import type {
  BackgroundResponse,
  HasEditableFieldMessage,
  InsertTextMessage,
  RewriteRequest,
  TriggerRewriteContextMenuMessage,
  TriggerRewriteShortcutMessage,
} from "@/lib/messaging";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DiffIcon,
  InlineViewIcon,
  LogoIcon,
  PowerIcon,
  RefreshIcon,
  SparklesIcon,
  SplitViewIcon,
} from "@/components/icons";
import {
  buildCherryPickedText,
  computeDiffStats,
  computeTextDiff,
} from "@/lib/textFormatters";

const MIN_TEXT_LENGTH = 8;
const TYPING_DEBOUNCE_MS = 500;
const ICON_GAP = 6;
const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 320;

interface Props {
  hostElement: HTMLElement;
}

type Stage = "idle" | "presets" | "loading" | "result" | "error";

export default function RewriteWidget({ hostElement }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<RewritePreset[]>([]);
  const [showIcon, setShowIcon] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Bounding rect of the actual input field (for width-matching the popover).
  // Null when the anchor came from a selection range or screen-center fallback.
  const [fieldRect, setFieldRect] = useState<DOMRect | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [resultText, setResultText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [copied, setCopied] = useState(false);

  const activeFieldRef = useRef<HTMLElement | null>(null);
  // Tracks the very last field that was ever focused — used by the popup to
  // insert text back even after focus has moved away.
  const lastFieldRef = useRef<HTMLElement | null>(null);
  // Tracks the element that was right-clicked for context menu actions.
  const rightClickFieldRef = useRef<HTMLElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const selectionRangeRef = useRef<FieldSelection | null>(null);

  const [showDiff, setShowDiff] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<"inline" | "split">(
    "inline",
  );
  const [rejectedDiffIndices, setRejectedDiffIndices] = useState<Set<number>>(
    new Set(),
  );

  const diffParts = useMemo(
    () => computeTextDiff(originalText, resultText),
    [originalText, resultText],
  );

  const diffStats = useMemo(() => computeDiffStats(diffParts), [diffParts]);

  const effectiveText = useMemo(
    () =>
      showDiff
        ? buildCherryPickedText(diffParts, rejectedDiffIndices)
        : resultText,
    [showDiff, diffParts, rejectedDiffIndices, resultText],
  );

  const toggleRejectedIndex = useCallback((index: number) => {
    setRejectedDiffIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const resetWidget = useCallback(() => {
    setShowIcon(false);
    setStage("idle");
    setResultText("");
    setOriginalText("");
    setErrorText("");
    setCustomInstruction("");
    setCopied(false);
    setShowDiff(false);
    setDiffViewMode("inline");
    setRejectedDiffIndices(new Set());
    setRect(null);
    setFieldRect(null);
    selectionRangeRef.current = null;
  }, []);

  const clearActiveField = useCallback(() => {
    activeFieldRef.current = null;
    resetWidget();
  }, [resetWidget]);

  // ─── Settings & presets ───────────────────────────────────────────────────

  useEffect(() => {
    function onSettingsChange(next: Settings | null) {
      setSettings(next);
      const isExcluded = isSiteExcluded(next?.siteDenylist, location.hostname);
      if (isExcluded) clearActiveField();
    }
    settingsStorage.getValue().then(onSettingsChange);
    return settingsStorage.watch(onSettingsChange);
  }, [clearActiveField]);

  useEffect(() => {
    presetsStorage.getValue().then(setPresets);
    return presetsStorage.watch(setPresets);
  }, []);

  const isExcluded = isSiteExcluded(settings?.siteDenylist, location.hostname);
  const autoDetectEnabled = Boolean(settings?.autoDetectEnabled && !isExcluded);
  const useSideBar = settings?.sideBarWidgetEnabled !== false;

  // ─── Initial check for active element on mount / settings load ─────────────
  useEffect(() => {
    if (!autoDetectEnabled || stage !== "idle") return;
    const handleId = requestAnimationFrame(() => {
      const deepActive = getDeepActiveElement();
      const target =
        findEditableField(deepActive) ||
        findEditableField(document.activeElement);
      if (target) {
        if (isSearchField(target)) {
          setShowIcon(false);
          return;
        }
        // Walk up if the element itself has zero size (empty WhatsApp/Gmail editors)
        let fr = target.getBoundingClientRect();
        if ((fr.width === 0 || fr.height === 0) && target.parentElement) {
          let el: HTMLElement | null = target.parentElement;
          while (el && el !== document.body) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              fr = r;
              break;
            }
            el = el.parentElement;
          }
        }
        if (fr.width > 0 && fr.height > 0) {
          activeFieldRef.current = target;
          lastFieldRef.current = target;
          setRect(fr);
          setFieldRect(fr);
          const text = getFieldText(target);
          if (text.trim().length >= MIN_TEXT_LENGTH) {
            setShowIcon(true);
          } else {
            setShowIcon(false);
          }
        }
      }
    });
    return () => cancelAnimationFrame(handleId);
  }, [autoDetectEnabled, stage]);

  // ─── Dynamic resize observer for active field ────────────────────────────
  useEffect(() => {
    if (!activeFieldRef.current || (!showIcon && stage === "idle")) return;
    const target = activeFieldRef.current;
    if (typeof ResizeObserver === "undefined") return;

    let rafId: number;
    const observer = new ResizeObserver(() => {
      rafId = requestAnimationFrame(() => {
        if (target && target.isConnected) {
          const fr = target.getBoundingClientRect();
          if (fr.width > 0 && fr.height > 0) {
            setRect(fr);
            setFieldRect(fr);
          }
        }
      });
    });
    observer.observe(target);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [showIcon, stage]);

  // ─── Field tracking (for hover/typing icon and shortcut target) ───────────

  useEffect(() => {
    /**
     * Returns a usable bounding rect for `target`.
     * Some editors (WhatsApp Lexical, Gmail) render the root contenteditable
     * with a zero-size rect when empty. In that case we walk up the DOM to
     * find the nearest ancestor with a visible rect.
     */
    function getVisibleRect(target: HTMLElement): DOMRect | null {
      let el: HTMLElement | null = target;
      while (el && el !== document.body) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r;
        el = el.parentElement;
      }
      return null;
    }

    function updateFieldTarget(target: HTMLElement) {
      if (!autoDetectEnabled) return;
      if (isSearchField(target)) {
        setShowIcon(false);
        return;
      }
      requestAnimationFrame(() => {
        const fr = getVisibleRect(target);
        if (fr) {
          setRect(fr);
          setFieldRect(fr);
          const text = getFieldText(target);
          if (text.trim().length >= MIN_TEXT_LENGTH) {
            setShowIcon(true);
          } else {
            setShowIcon(false);
          }
        }
      });
    }

    function handleFocusIn(event: FocusEvent) {
      const target = findEditableField(event.target);
      if (!target) return;

      if (stage !== "idle") {
        if (target !== activeFieldRef.current) clearActiveField();
        return;
      }

      if (target !== activeFieldRef.current) selectionRangeRef.current = null;
      activeFieldRef.current = target;
      lastFieldRef.current = target;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (isSearchField(target)) {
        setShowIcon(false);
        return;
      }
      updateFieldTarget(target);
    }

    function handleFocusOut() {
      if (stage !== "idle") return;

      setTimeout(() => {
        const next = getDeepActiveElement() || document.activeElement;
        if (
          next &&
          (next === hostElement ||
            hostElement.contains(next) ||
            hostElement.shadowRoot?.contains(next) ||
            isEditableField(next) ||
            findEditableField(next))
        ) {
          return;
        }
        clearActiveField();
      }, 100);
    }

    function handleInput(event: Event) {
      const target = findEditableField(event.target);
      if (!target) return;
      activeFieldRef.current = target;
      lastFieldRef.current = target;

      if (!autoDetectEnabled || stage !== "idle") return;

      if (isSearchField(target)) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setShowIcon(false);
        return;
      }

      const text = getFieldText(target);
      if (text.trim().length < MIN_TEXT_LENGTH) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setShowIcon(false);
      } else {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          updateFieldTarget(target);
        }, TYPING_DEBOUNCE_MS);
      }
    }

    function handleFieldPointerDown(event: PointerEvent) {
      const target = findEditableField(event.target);
      if (target) {
        activeFieldRef.current = target;
        lastFieldRef.current = target;
        if (autoDetectEnabled && stage === "idle") {
          updateFieldTarget(target);
        }
      }
    }

    function handleContextMenu(event: MouseEvent) {
      const target = findEditableField(event.target);
      if (target) {
        rightClickFieldRef.current = target;
        activeFieldRef.current = target;
        lastFieldRef.current = target;
        const sel = getFieldSelection(target);
        if (sel) selectionRangeRef.current = sel;
      }
    }

    function handleSelectionChange() {
      const deepActive = getDeepActiveElement();
      const target =
        findEditableField(deepActive) ||
        findEditableField(document.activeElement);
      if (target) {
        activeFieldRef.current = target;
        lastFieldRef.current = target;
        const sel = getFieldSelection(target);
        if (sel) selectionRangeRef.current = sel;
      }
    }

    function handleReposition() {
      if (activeFieldRef.current && (showIcon || stage !== "idle")) {
        requestAnimationFrame(() => {
          if (activeFieldRef.current) {
            const fr = activeFieldRef.current.getBoundingClientRect();
            if (fr.width > 0 && fr.height > 0) {
              setRect(fr);
              setFieldRect(fr);
            }
          }
        });
      }
    }

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("pointerdown", handleFieldPointerDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("selectionchange", handleSelectionChange, true);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    // ── Same-origin iframe event forwarding (e.g. Gmail compose) ──────────
    // Gmail renders its compose editor inside a same-origin iframe. Events
    // from that iframe don't bubble to the top document, so we attach our
    // focusin/input listeners directly to each same-origin iframe document.
    const iframeCleanups: (() => void)[] = [];
    function attachIframeListeners(iframeEl: HTMLIFrameElement) {
      try {
        const iDoc = iframeEl.contentDocument;
        if (!iDoc || iDoc === document) return;
        iDoc.addEventListener("focusin", handleFocusIn, true);
        iDoc.addEventListener("focusout", handleFocusOut, true);
        iDoc.addEventListener("input", handleInput, true);
        iDoc.addEventListener("pointerdown", handleFieldPointerDown, true);
        iDoc.addEventListener("selectionchange", handleSelectionChange, true);
        iframeCleanups.push(() => {
          iDoc.removeEventListener("focusin", handleFocusIn, true);
          iDoc.removeEventListener("focusout", handleFocusOut, true);
          iDoc.removeEventListener("input", handleInput, true);
          iDoc.removeEventListener("pointerdown", handleFieldPointerDown, true);
          iDoc.removeEventListener(
            "selectionchange",
            handleSelectionChange,
            true,
          );
        });
      } catch {
        // Cross-origin iframe — skip silently
      }
    }
    // Attach to all existing iframes and observe for new ones
    document.querySelectorAll("iframe").forEach(attachIframeListeners);
    const iframeMutationObs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLIFrameElement) attachIframeListeners(node);
          else if (node instanceof Element) {
            node.querySelectorAll("iframe").forEach(attachIframeListeners);
          }
        });
      }
    });
    iframeMutationObs.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ── Poll for iframe-focused editable (e.g. Gmail compose) ─────────────
    // When an iframe has keyboard focus, document.activeElement is the <iframe>
    // element itself. We detect this case and use the iframe's bounding rect
    // as the positioning anchor for the sidebar.
    const iframePollId = setInterval(() => {
      if (!autoDetectEnabled || stage !== "idle") return;
      const active = document.activeElement;
      if (active instanceof HTMLIFrameElement) {
        try {
          const iDoc = active.contentDocument;
          if (!iDoc) return;
          const deepActive = iDoc.activeElement;
          const editable =
            deepActive instanceof HTMLElement && isEditableField(deepActive)
              ? deepActive
              : (iDoc.querySelector<HTMLElement>(
                  'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea, [role="textbox"]',
                ) ?? null);
          if (
            editable &&
            isEditableField(editable) &&
            !isSearchField(editable)
          ) {
            // Position relative to the iframe element's viewport rect
            const iframeRect = active.getBoundingClientRect();
            if (iframeRect.width > 0 && iframeRect.height > 0) {
              if (editable !== activeFieldRef.current) {
                activeFieldRef.current = editable;
                lastFieldRef.current = editable;
                setRect(iframeRect);
                setFieldRect(iframeRect);
                const text = getFieldText(editable);
                if (text.trim().length >= MIN_TEXT_LENGTH) {
                  setShowIcon(true);
                } else {
                  setShowIcon(false);
                }
              }
            }
          }
        } catch {
          // Cross-origin — ignore
        }
      }
    }, 300);

    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("pointerdown", handleFieldPointerDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener(
        "selectionchange",
        handleSelectionChange,
        true,
      );
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      iframeCleanups.forEach((fn) => fn());
      iframeMutationObs.disconnect();
      clearInterval(iframePollId);
    };
  }, [
    autoDetectEnabled,
    useSideBar,
    showIcon,
    stage,
    hostElement,
    clearActiveField,
  ]);

  // ─── Dismiss widget on outside click or Escape ──────────────────────────────

  useEffect(() => {
    if (stage === "idle" && !showIcon) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        hostElement.contains(target) ||
        (activeFieldRef.current && activeFieldRef.current.contains(target))
      ) {
        return;
      }
      resetWidget();
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        resetWidget();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [stage, showIcon, hostElement, resetWidget]);

  // ─── Rewrite execution ────────────────────────────────────────────────────

  const runRewrite = useCallback(
    async (instruction: string, overrideText?: string) => {
      if (!settings) return;

      const text =
        overrideText ||
        selectionRangeRef.current?.text ||
        (activeFieldRef.current ? getFieldText(activeFieldRef.current) : "");

      if (!text.trim()) return;

      setOriginalText(text);

      if (instruction.trim()) {
        lastWritingStyleStorage.setValue(instruction.trim()).catch(() => {});
      }

      setStage("loading");

      const provider = settings.defaultProvider;
      const model = settings.defaultModel[provider];
      const request: RewriteRequest = {
        type: "REWRITE_REQUEST",
        provider,
        model,
        text,
        instruction,
      };

      try {
        const response: BackgroundResponse =
          await browser.runtime.sendMessage(request);
        if (response.ok) {
          setResultText(response.result);
          setStage("result");
        } else {
          setErrorText(response.error);
          setStage("error");
        }
      } catch (err) {
        setErrorText(
          err instanceof Error ? err.message : "Something went wrong.",
        );
        setStage("error");
      }
    },
    [settings],
  );

  const [configuredShortcut, setConfiguredShortcut] = useState(() =>
    isMacPlatform() ? "Alt+G" : "Alt+G",
  );

  useEffect(() => {
    if (typeof browser !== "undefined" && browser.commands?.getAll) {
      browser.commands
        .getAll()
        .then((commands) => {
          const cmd = commands.find((c) => c.name === "trigger-rewrite");
          if (cmd?.shortcut) {
            setConfiguredShortcut(cmd.shortcut);
          }
        })
        .catch(() => {});
    }
  }, []);

  // ─── Trigger Rewrite / Shortcut / Context Menu Handler ──────────────────

  const triggerRewrite = useCallback(
    async (overrideInstruction?: string) => {
      if (isExcluded) return;

      const deepActive = getDeepActiveElement();

      // Resolve target field — prefer right-clicked element, currently focused element, or last known field
      const targetField =
        (rightClickFieldRef.current && rightClickFieldRef.current.isConnected
          ? rightClickFieldRef.current
          : null) ||
        findEditableField(deepActive) ||
        findEditableField(document.activeElement) ||
        activeFieldRef.current ||
        lastFieldRef.current ||
        findEditableField(null);

      if (targetField) {
        activeFieldRef.current = targetField;
        lastFieldRef.current = targetField;
      }

      let selectionText = "";
      let targetRect: DOMRect | null = null;
      let fieldRect: DOMRect | null =
        targetField && targetField instanceof HTMLElement
          ? targetField.getBoundingClientRect()
          : null;
      if (fieldRect && fieldRect.width === 0 && fieldRect.height === 0)
        fieldRect = null;

      // ── Step 1: Check active window selection FIRST (for highlighted text accuracy) ──
      const winSel = window.getSelection();
      if (winSel && !winSel.isCollapsed && winSel.rangeCount > 0) {
        const range = winSel.getRangeAt(0);
        const text = range.toString().trim();
        if (text) {
          selectionText = text;
          selectionRangeRef.current = { text, range: range.cloneRange() };
          const rr = range.getBoundingClientRect();
          if (rr.width > 0 || rr.height > 0) {
            targetRect = rr;
          }
        }
      }

      // ── Step 2: Check input/textarea or field selection ──
      if (!targetRect && targetField) {
        const sel = getFieldSelection(targetField);
        if (sel?.text) {
          selectionRangeRef.current = sel;
          selectionText = sel.text;
          if (sel.range) {
            const rr = sel.range.getBoundingClientRect();
            if (rr.width > 0 || rr.height > 0) targetRect = rr;
          }
        } else {
          selectionText = getFieldText(targetField);
        }
      }

      // ── Step 4: fall back to field rect, then deepActive rect, then center ──
      if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
        targetRect = fieldRect;
      }

      if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
        const winSel = window.getSelection();
        if (winSel && winSel.rangeCount > 0) {
          const r = winSel.getRangeAt(0).getBoundingClientRect();
          if (r.width > 0 || r.height > 0) targetRect = r;
        }
      }

      if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
        const activeEl = getDeepActiveElement() || document.activeElement;
        if (activeEl && activeEl instanceof HTMLElement) {
          const r = activeEl.getBoundingClientRect();
          if (r.width > 0 || r.height > 0) targetRect = r;
        }
      }

      // ── Step 5: absolute last resort — center on screen ────────────────────
      if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
        const w = POPOVER_WIDTH;
        const h = 40;
        const left = Math.max(10, (window.innerWidth - w) / 2);
        const top = Math.max(10, window.innerHeight / 3);
        targetRect = new DOMRect(left, top, w, h);
      }

      setRect(targetRect);
      setFieldRect(fieldRect);
      setShowIcon(true);

      if (overrideInstruction?.trim()) {
        runRewrite(overrideInstruction.trim(), selectionText);
        return;
      }

      const savedLastStyle = await lastWritingStyleStorage.getValue();
      const styleToRun =
        savedLastStyle || resolveInstruction(settings, presets);

      if (selectionText.trim() && styleToRun) {
        runRewrite(styleToRun, selectionText);
        return;
      }
      setStage("presets");
    },
    [isExcluded, settings, presets, runRewrite],
  );

  // ─── Keyboard shortcut direct listener ────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const matchesCustom = matchesShortcut(e, configuredShortcut);
      const isFallbackG =
        (e.code === "KeyG" || e.key?.toLowerCase() === "g") &&
        e.shiftKey &&
        (e.metaKey || e.ctrlKey);

      if (matchesCustom || isFallbackG) {
        const deepActive = getDeepActiveElement();
        const winSel = window.getSelection();
        const hasSelection = Boolean(
          winSel && !winSel.isCollapsed && winSel.toString().trim().length > 0,
        );
        const editableTarget =
          findEditableField(deepActive) ||
          findEditableField(document.activeElement) ||
          activeFieldRef.current ||
          lastFieldRef.current ||
          findEditableField(null);

        // Always fire if there's any editable target (incl. WhatsApp Web / page input fallback)
        // or a live text selection — do NOT require the field to be explicitly focused.
        if (editableTarget || hasSelection || matchesCustom || isFallbackG) {
          e.preventDefault();
          e.stopPropagation();
          triggerRewrite();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [configuredShortcut, triggerRewrite]);

  // ─── Messaging listener ──────────────────────────────────────────────────

  useEffect(() => {
    function handleMessage(
      message:
        | TriggerRewriteShortcutMessage
        | TriggerRewriteContextMenuMessage
        | InsertTextMessage
        | HasEditableFieldMessage,
    ) {
      // ── TRIGGER_REWRITE_SHORTCUT / CONTEXT_MENU ───────────────────────
      if (message.type === "TRIGGER_REWRITE_SHORTCUT") {
        triggerRewrite();
        return;
      }

      if (message.type === "TRIGGER_REWRITE_CONTEXT_MENU") {
        triggerRewrite(
          (message as TriggerRewriteContextMenuMessage).instruction,
        );
        return;
      }

      // ── INSERT_TEXT ──────────────────────────────────────────────────
      if (message.type === "INSERT_TEXT") {
        const deepActive = getDeepActiveElement();
        const field =
          lastFieldRef.current ||
          activeFieldRef.current ||
          findEditableField(deepActive) ||
          findEditableField(document.activeElement);
        if (field) {
          insertText(
            field,
            (message as InsertTextMessage).text,
            selectionRangeRef.current,
          );
        } else if (selectionRangeRef.current?.range) {
          const range = selectionRangeRef.current.range;
          if (
            range.startContainer.isConnected &&
            range.endContainer.isConnected
          ) {
            try {
              range.deleteContents();
              range.insertNode(
                document.createTextNode((message as InsertTextMessage).text),
              );
            } catch {
              // Ignore if non-editable
            }
          }
        }
        return true as unknown as void; // signal success
      }

      // ── HAS_EDITABLE_FIELD ───────────────────────────────────────────
      if (message.type === "HAS_EDITABLE_FIELD") {
        const deepActive = getDeepActiveElement();
        const field =
          lastFieldRef.current ||
          activeFieldRef.current ||
          findEditableField(deepActive) ||
          findEditableField(document.activeElement);
        return Boolean(field) as unknown as void;
      }
    }

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [triggerRewrite]);

  function handleReplace() {
    const textToInsert = effectiveText;
    if (activeFieldRef.current) {
      insertText(
        activeFieldRef.current,
        textToInsert,
        selectionRangeRef.current,
      );
    } else if (selectionRangeRef.current?.range) {
      const range = selectionRangeRef.current.range;
      if (range.startContainer.isConnected && range.endContainer.isConnected) {
        try {
          range.deleteContents();
          range.insertNode(document.createTextNode(textToInsert));
        } catch {
          navigator.clipboard.writeText(textToInsert).catch(() => {});
        }
      }
    } else {
      navigator.clipboard.writeText(textToInsert).catch(() => {});
    }
    resetWidget();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(effectiveText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setErrorText("Could not copy to clipboard.");
      setStage("error");
    }
  }

  async function handleDisableSite() {
    if (!settings) return;
    const hostname = location.hostname;
    if (!isSiteExcluded(settings.siteDenylist, hostname)) {
      try {
        await settingsStorage.setValue({
          ...settings,
          siteDenylist: [...settings.siteDenylist, hostname],
        });
      } catch {
        // Best-effort
      }
    }
    clearActiveField();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isExcluded || !showIcon || !rect) return null;

  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const padding = 10;

  const spaceBelow = viewHeight - rect.bottom;
  const spaceAbove = rect.top;

  const openUpward =
    spaceAbove >= POPOVER_MAX_HEIGHT + ICON_GAP + padding ||
    spaceAbove >= spaceBelow;
  const targetPanelTop = openUpward
    ? rect.top - POPOVER_MAX_HEIGHT - ICON_GAP
    : rect.bottom + ICON_GAP;

  const panelTop = clamp(
    targetPanelTop,
    padding,
    Math.max(padding, viewHeight - POPOVER_MAX_HEIGHT - padding),
  );

  // ── Width & horizontal position ──────────────────────────────────────────
  const hasFieldWidth = fieldRect && fieldRect.width >= POPOVER_WIDTH * 0.5;
  const panelWidth = hasFieldWidth
    ? Math.min(fieldRect!.width, 480)
    : POPOVER_WIDTH;

  let rawLeft = rect.left;
  if (!hasFieldWidth) {
    rawLeft = rect.left + (rect.width - panelWidth) / 2;
  }
  const panelLeft = clamp(
    rawLeft,
    padding,
    Math.max(padding, viewWidth - panelWidth - padding),
  );

  // ── Smart Edge Bar & Icon Positioning ────────────────────────────────────────
  const targetRect = fieldRect && fieldRect.width > 0 ? fieldRect : rect;

  const SIDE_BAR_HEIGHT = 34;
  const SIDE_BAR_WIDTH = 10;

  const targetSideBarTop =
    targetRect.height > 60
      ? targetRect.top + 12
      : targetRect.top + (targetRect.height - SIDE_BAR_HEIGHT) / 2;

  const sideBarTop = clamp(
    targetSideBarTop,
    padding,
    Math.max(padding, viewHeight - SIDE_BAR_HEIGHT - padding),
  );
  const sideBarLeft = clamp(
    targetRect.left - 14,
    2,
    Math.max(2, viewWidth - SIDE_BAR_WIDTH - 2),
  );

  return (
    <div className="rw-root">
      {stage === "idle" ? (
        useSideBar ? (
          <button
            type="button"
            className="rw-side-bar"
            style={{ top: `${sideBarTop}px`, left: `${sideBarLeft}px` }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (activeFieldRef.current) {
                const sel = getFieldSelection(activeFieldRef.current);
                if (sel) selectionRangeRef.current = sel;
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerRewrite();
            }}
            aria-label="Rewrite with AI"
            data-tooltip="Rewrite with AI"
            data-tooltip-pos="left"
          >
            <span className="rw-side-bar__glow" />
            <span className="rw-side-bar__pill" />
          </button>
        ) : null
      ) : (
        <div
          className="rw-popover"
          style={{
            top: `${panelTop}px`,
            left: `${panelLeft}px`,
            width: `${panelWidth}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {/* Header bar */}
          <div className="rw-popover__header">
            <LogoIcon size={13} />
            <span className="rw-popover__header-title">Rewriter AI</span>
            <button
              type="button"
              className="rw-popover__close"
              onMouseDown={(e) => e.preventDefault()}
              onClick={resetWidget}
              aria-label="Close popover"
              data-tooltip="Close popover"
            >
              ✕
            </button>
          </div>

          {/* Preset picker */}
          {stage === "presets" && (
            <>
              <div className="rw-popover__presets">
                {presets
                  .filter(
                    (preset) =>
                      preset.label.trim() && preset.instruction.trim(),
                  )
                  .map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runRewrite(preset.instruction)}
                      data-tooltip={`Apply style: ${preset.label}`}
                      aria-label={`Apply style: ${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  ))}
              </div>
              <form
                className="rw-popover__custom"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customInstruction.trim())
                    runRewrite(customInstruction.trim());
                }}
              >
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Or describe how to rewrite it…"
                />
                <button
                  type="submit"
                  onMouseDown={(e) => e.preventDefault()}
                  data-tooltip="Rewrite text with custom instruction"
                  aria-label="Rewrite text with custom instruction"
                >
                  <SparklesIcon size={12} />
                </button>
              </form>
            </>
          )}

          {/* Loading */}
          {stage === "loading" && (
            <div className="rw-popover__loading">
              <span className="rw-popover__loading-dot" />
              <span className="rw-popover__loading-dot" />
              <span className="rw-popover__loading-dot" />
              <span className="rw-popover__loading-label">Rewriting…</span>
            </div>
          )}

          {/* Result */}
          {stage === "result" && (
            <>
              <div className="rw-popover__result-wrapper">
                {showDiff ? (
                  diffViewMode === "inline" ? (
                    <div className="rw-popover__result rw-popover__result--diff">
                      {diffParts.map((part, idx) => {
                        const isRejected = rejectedDiffIndices.has(idx);
                        if (!part.added && !part.removed) {
                          return <span key={idx}>{part.value}</span>;
                        }
                        const className = [
                          part.added ? "rw-diff-added" : "rw-diff-removed",
                          "rw-diff-interactive",
                          isRejected ? "rw-diff-rejected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        const title = part.added
                          ? isRejected
                            ? "Click to accept addition"
                            : "Click to reject addition"
                          : isRejected
                            ? "Click to re-delete"
                            : "Click to restore original";

                        return (
                          <span
                            key={idx}
                            className={className}
                            onClick={() => toggleRejectedIndex(idx)}
                            data-tooltip={title}
                          >
                            {part.value}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rw-popover__result rw-popover__result--split">
                      <div className="rw-split-col">
                        <div className="rw-split-label">Original</div>
                        <div className="rw-split-content">
                          {diffParts.map((part, idx) =>
                            part.added ? null : (
                              <span
                                key={idx}
                                className={
                                  part.removed ? "rw-diff-removed" : ""
                                }
                              >
                                {part.value}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="rw-split-col">
                        <div className="rw-split-label">Rewritten</div>
                        <div className="rw-split-content">
                          {diffParts.map((part, idx) =>
                            part.removed ? null : (
                              <span
                                key={idx}
                                className={part.added ? "rw-diff-added" : ""}
                              >
                                {part.value}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rw-popover__result">{resultText}</div>
                )}
                {/* Actions overlaid on result box */}
                <div className="rw-popover__result-tools">
                  {(diffStats.addedWords > 0 || diffStats.removedWords > 0) && (
                    <span
                      className="rw-diff-stats"
                      data-tooltip={`Similarity: ${diffStats.similarity}%`}
                    >
                      {diffStats.addedWords > 0 && (
                        <span className="rw-diff-stats--added">
                          +{diffStats.addedWords}
                        </span>
                      )}
                      {diffStats.removedWords > 0 && (
                        <span className="rw-diff-stats--removed">
                          -{diffStats.removedWords}
                        </span>
                      )}
                    </span>
                  )}
                  {showDiff && (
                    <button
                      type="button"
                      className="rw-popover__action-icon-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        setDiffViewMode(
                          diffViewMode === "inline" ? "split" : "inline",
                        )
                      }
                      data-tooltip={`Switch to ${diffViewMode === "inline" ? "Side-by-Side Split" : "Inline"} View`}
                      aria-label={`Switch to ${diffViewMode === "inline" ? "Side-by-Side Split" : "Inline"} View`}
                    >
                      {diffViewMode === "inline" ? (
                        <SplitViewIcon size={12} />
                      ) : (
                        <InlineViewIcon size={12} />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`rw-popover__action-icon-btn ${showDiff ? "rw-popover__action-icon-btn--active" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowDiff(!showDiff)}
                    data-tooltip="Toggle interactive diff view"
                    aria-label="Toggle interactive diff view"
                  >
                    <DiffIcon size={12} />
                  </button>
                  <button
                    type="button"
                    className={`rw-popover__action-icon-btn ${copied ? "rw-popover__action-icon-btn--copied" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCopy}
                    aria-label={copied ? "Copied!" : "Copy result"}
                    data-tooltip={copied ? "Copied!" : "Copy result"}
                  >
                    {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                  </button>
                  <button
                    type="button"
                    className="rw-popover__action-icon-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCopied(false);
                      setShowDiff(false);
                      setRejectedDiffIndices(new Set());
                      setStage("presets");
                    }}
                    data-tooltip="Try another writing style"
                    aria-label="Try another writing style"
                  >
                    <RefreshIcon size={12} />
                  </button>
                </div>
              </div>
              {showDiff && rejectedDiffIndices.size > 0 && (
                <div className="rw-popover__diff-hint">
                  <span>
                    {rejectedDiffIndices.size} edit
                    {rejectedDiffIndices.size > 1 ? "s" : ""} toggled
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setRejectedDiffIndices(new Set())}
                    data-tooltip="Reset diff toggles"
                    aria-label="Reset diff toggles"
                  >
                    <RefreshIcon size={11} />
                  </button>
                </div>
              )}
              <div className="rw-popover__actions">
                <button
                  type="button"
                  className="rw-popover__actions-replace"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleReplace}
                  data-tooltip="Replace text on page"
                  aria-label="Replace text on page"
                >
                  Replace
                </button>
              </div>
            </>
          )}

          {/* Error */}
          {stage === "error" && (
            <>
              <div className="rw-popover__error">{errorText}</div>
              <button
                type="button"
                className="rw-popover__back"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStage("presets")}
                data-tooltip="Try again (back to preset picker)"
                aria-label="Try again (back to preset picker)"
              >
                <ArrowLeftIcon size={14} />
              </button>
            </>
          )}

          <button
            type="button"
            className="rw-popover__disable-site"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDisableSite}
            data-tooltip="Disable rewriter extension on this site"
            aria-label="Disable rewriter extension on this site"
          >
            <PowerIcon size={12} />
            <span>Turn off on this site</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesShortcut(e: KeyboardEvent, shortcutStr: string): boolean {
  if (!shortcutStr) return false;
  const parts = shortcutStr.split("+").map((p) => p.trim().toLowerCase());
  if (parts.length === 0) return false;

  const requiresAlt = parts.includes("alt") || parts.includes("option");
  const requiresShift = parts.includes("shift");
  const requiresCtrl = parts.includes("ctrl") || parts.includes("macctrl");
  const requiresCmd =
    parts.includes("command") ||
    parts.includes("cmd") ||
    parts.includes("meta");

  if (e.altKey !== requiresAlt) return false;
  if (e.shiftKey !== requiresShift) return false;
  if (e.ctrlKey !== requiresCtrl) return false;
  if (e.metaKey !== requiresCmd) return false;

  const targetKey = parts[parts.length - 1];
  if (!targetKey) return false;

  const keyLower = e.key ? e.key.toLowerCase() : "";
  const codeLower = e.code ? e.code.toLowerCase() : "";

  if (
    codeLower === `key${targetKey}` ||
    codeLower === targetKey ||
    keyLower === targetKey
  ) {
    return true;
  }
  if (targetKey === "r" && (e.key === "‰" || e.key === "®")) return true;

  return false;
}
