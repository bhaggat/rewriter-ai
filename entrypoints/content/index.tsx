import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { createRoot } from 'react-dom/client';
import RewriteWidget from './RewriteWidget';
import { findEditableField, getDeepActiveElement, getFieldSelection, getFieldText } from './field-utils';
import type { GetSelectionMessage } from '@/lib/messaging';
import ErrorBoundary from '@/components/ErrorBoundary';
import './style.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    browser.runtime.onMessage.addListener((message: GetSelectionMessage, _sender, sendResponse) => {
      if (message.type !== 'GET_SELECTION') return;
      const active = getDeepActiveElement() || document.activeElement;
      let text = '';
      const editable = findEditableField(active);
      if (editable) {
        const fieldSelection = getFieldSelection(editable);
        text = fieldSelection?.text || getFieldText(editable) || '';
      }
      if (!text.trim()) {
        text = window.getSelection()?.toString() || '';
      }
      sendResponse(text);
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
        root.render(
          <ErrorBoundary className="rw-root rw-error-boundary">
            <RewriteWidget hostElement={shadowHost} />
          </ErrorBoundary>,
        );
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });

    ui.mount();
  },
});
