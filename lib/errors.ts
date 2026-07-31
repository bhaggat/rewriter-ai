/** Plain-language fallback for a failed HTTP response, used when the provider's own error body has no usable message. */
export function friendlyStatusMessage(status: number, providerLabel: string): string {
  if (status === 401 || status === 403) {
    return `${providerLabel} rejected the API key. Check that it's correct and still active.`;
  }
  if (status === 404) {
    return `${providerLabel} couldn't find the selected model. Try a different model.`;
  }
  if (status === 429) {
    return `${providerLabel} is rate-limiting this key. Wait a moment and try again.`;
  }
  if (status >= 500) {
    return `${providerLabel} is temporarily unavailable. Try again shortly.`;
  }
  return `${providerLabel} request failed (${status}).`;
}

/** Best-effort plain-language message for a caught value of unknown shape (network errors, thrown non-Errors, etc). */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return 'Could not reach the network. Check your connection and try again.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
