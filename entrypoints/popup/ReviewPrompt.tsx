import { useEffect, useState } from "react";

const STORAGE_KEY = "reviewPromptState";
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const STORE_REVIEW_URL =
  "https://chromewebstore.google.com/detail/rewriter-ai/dfeikdphcfjnkdeolkcnblpdokkcddlm/reviews";

interface ReviewPromptState {
  installedAt: number;
  dismissedAt?: number;
  reviewed?: boolean;
  neverAsk?: boolean;
}

const RATING_LABELS = [
  "",
  "Needs work",
  "Could be better",
  "It's good",
  "Really like it!",
  "Love it!",
];

function isEligible(state: ReviewPromptState, now: number): boolean {
  if (state.reviewed || state.neverAsk) return false;
  if (now - state.installedAt < TEN_DAYS_MS) return false;
  if (state.dismissedAt && now - state.dismissedAt < SNOOZE_MS) return false;
  return true;
}

export default function ReviewPrompt() {
  const [visible, setVisible] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);

  useEffect(() => {
    if (typeof browser === "undefined" || !browser.storage?.local) return;

    browser.storage.local
      .get(STORAGE_KEY)
      .then((res) => {
        const now = Date.now();
        const existing = res[STORAGE_KEY] as ReviewPromptState | undefined;

        if (!existing?.installedAt) {
          return browser.storage.local.set({
            [STORAGE_KEY]: { installedAt: now },
          });
        }

        if (isEligible(existing, now)) {
          setVisible(true);
        }
        return undefined;
      })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  const updateState = (patch: Partial<ReviewPromptState>) => {
    if (typeof browser === "undefined" || !browser.storage?.local) return;
    browser.storage.local
      .get(STORAGE_KEY)
      .then((res) => {
        const current = (res[STORAGE_KEY] as ReviewPromptState) || {
          installedAt: Date.now(),
        };
        return browser.storage.local.set({
          [STORAGE_KEY]: { ...current, ...patch },
        });
      })
      .catch(() => {});
  };

  const handleReviewClick = (stars?: number) => {
    if (stars) setSelectedStar(stars);
    updateState({ reviewed: true });
    if (typeof browser !== "undefined" && browser.tabs?.create) {
      browser.tabs.create({ url: STORE_REVIEW_URL }).catch(() => {});
    } else {
      window.open(STORE_REVIEW_URL, "_blank", "noopener,noreferrer");
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    updateState({ dismissedAt: Date.now() });
    setVisible(false);
  };

  const handleNeverAsk = () => {
    updateState({ neverAsk: true });
    setVisible(false);
  };

  const activeStars = hoveredStar || selectedStar;

  return (
    <div
      className="review-prompt"
      role="region"
      aria-label="Rate Rewriter AI"
    >
      <button
        type="button"
        className="review-prompt__close"
        onClick={handleDismiss}
        aria-label="Remind me later"
        title="Remind me later"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      <div className="review-prompt__header">
        <div className="review-prompt__title">Enjoying Rewriter AI?</div>
        <div className="review-prompt__subtitle">
          {activeStars > 0
            ? RATING_LABELS[activeStars]
            : "Tap a star to leave a quick review on Chrome Web Store."}
        </div>
      </div>

      <div className="review-prompt__controls">
        <div
          className="review-prompt__stars"
          onMouseLeave={() => setHoveredStar(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= activeStars;
            return (
              <button
                key={star}
                type="button"
                className={`review-prompt__star${filled ? " is-filled" : ""}`}
                onMouseEnter={() => setHoveredStar(star)}
                onClick={() => handleReviewClick(star)}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    fill={filled ? "#f5b301" : "none"}
                    stroke={filled ? "#f5b301" : "currentColor"}
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="review-prompt__cta"
          onClick={() => handleReviewClick()}
        >
          Leave a Review ↗
        </button>
      </div>

      <div className="review-prompt__footer">
        <button
          type="button"
          className="review-prompt__link"
          onClick={handleDismiss}
        >
          Maybe later
        </button>
        <button
          type="button"
          className="review-prompt__link"
          onClick={handleNeverAsk}
        >
          Don&apos;t ask again
        </button>
      </div>
    </div>
  );
}
