import { useEffect } from 'react';
import { CloseIcon, InfoIcon } from './icons';
import { useShortcutInfo } from '@/lib/shortcuts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: Props) {
  const shortcutInfo = useShortcutInfo();
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="about-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="about-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="about-modal-header">
          <div className="about-modal-title-group">
            <img src="/icon/32.png" alt="Rewriter AI" className="about-modal-logo" />
            <div>
              <h2 id="about-modal-title">About Rewriter AI</h2>
              <span className="about-modal-subtitle">Intention & Feature Guide</span>
            </div>
          </div>
          <button
            type="button"
            className="about-modal-close"
            onClick={onClose}
            aria-label="Close guide"
            title="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="about-modal-content">
          <div className="about-modal-section">
            <h3 className="about-modal-section-title">
              <InfoIcon size={15} /> Intention & Purpose
            </h3>
            <p className="about-modal-text">
              Rewriter AI is designed to bring seamless, high-quality AI writing assistance directly into your browser workflow. Transform text on any webpage without switching tabs, copy-pasting, or sacrificing key privacy.
            </p>
          </div>

          <div className="about-modal-section">
            <h3 className="about-modal-section-title">✨ Key Features</h3>
            <div className="about-modal-features">
              <div className="about-modal-feature">
                <div className="about-modal-feature-icon">⚡</div>
                <div>
                  <strong>Inline Web Rewriter & Keyboard Shortcut</strong>
                  <p>
                    Select text or focus any input box and press{' '}
                    {shortcutInfo.keys.map((k, i) => (
                      <span key={i}>
                        {i > 0 && '+'}
                        <kbd>{k}</kbd>
                      </span>
                    ))}{' '}
                    to trigger instant AI rewriting.
                  </p>
                </div>
              </div>

              <div className="about-modal-feature">
                <div className="about-modal-feature-icon">🤖</div>
                <div>
                  <strong>Multi-Provider AI Choice</strong>
                  <p>
                    Connect OpenAI (GPT-4o), Anthropic (Claude), Google Gemini, DeepSeek, or Groq with your own API keys.
                  </p>
                </div>
              </div>

              <div className="about-modal-feature">
                <div className="about-modal-feature-icon">🎯</div>
                <div>
                  <strong>Custom Presets & Writing Styles</strong>
                  <p>
                    Use built-in presets (Fix Grammar, Concise, Professional, Friendly) or create custom instructions and set default writing styles.
                  </p>
                </div>
              </div>

              <div className="about-modal-feature">
                <div className="about-modal-feature-icon">💬</div>
                <div>
                  <strong>Side-by-Side AI Chat</strong>
                  <p>
                    Switch between inline rewriting and interactive chat inside the extension popup for long-form brainstorming, code generation, or Q&A.
                  </p>
                </div>
              </div>

              <div className="about-modal-feature">
                <div className="about-modal-feature-icon">🔒</div>
                <div>
                  <strong>100% Privacy & Local Storage</strong>
                  <p>
                    Your API keys and data remain safely stored on your local browser storage. No middleman servers or third-party tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="about-modal-footer">
          <button type="button" className="about-modal-primary-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
