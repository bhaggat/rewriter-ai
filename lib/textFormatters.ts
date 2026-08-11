export interface TextMetrics {
  words: number;
  characters: number;
  sentences: number;
  readingTimeSeconds: number;
}

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Calculates text statistics (words, characters, sentences, est. reading time).
 */
export function getTextMetrics(text: string): TextMetrics {
  const trimmed = text.trim();
  if (!trimmed) {
    return { words: 0, characters: 0, sentences: 0, readingTimeSeconds: 0 };
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const characters = text.length;
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length || 1;
  // Average reading speed: 200 words per minute (3.33 words per sec)
  const readingTimeSeconds = Math.max(1, Math.round(words / 3.33));

  return { words, characters, sentences, readingTimeSeconds };
}

/**
 * Formats text into Title Case.
 */
export function toTitleCase(text: string): string {
  const smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v|vs|via)$/i;

  return text.replace(/\w\S*/g, (word, index) => {
    if (index > 0 && smallWords.test(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/**
 * Formats text into Sentence case.
 */
export function toSentenceCase(text: string): string {
  return text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

/**
 * Formats text as a bulleted list.
 */
export function formatAsBulletList(text: string): string {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // If already bulleted/numbered, replace prefix
      const cleaned = trimmed.replace(/^([-*•]|\d+\.)\s*/, '');
      return `• ${cleaned}`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Formats text as a numbered list.
 */
export function formatAsNumberedList(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines
    .map((line, idx) => {
      const cleaned = line.trim().replace(/^([-*•]|\d+\.)\s*/, '');
      return `${idx + 1}. ${cleaned}`;
    })
    .join('\n');
}

/**
 * Formats text as markdown code block.
 */
export function formatAsCodeBlock(text: string): string {
  return `\`\`\`\n${text.trim()}\n\`\`\``;
}

/**
 * Formats text as markdown blockquote.
 */
export function formatAsMarkdownQuote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/**
 * Cleans extra spaces, tabs, and multiple blank lines.
 */
export function cleanWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface DiffStats {
  addedWords: number;
  removedWords: number;
  unchangedWords: number;
  similarity: number;
}

/**
 * Calculates metrics (added words, removed words, similarity percentage) from diff parts.
 */
export function computeDiffStats(diffParts: DiffPart[]): DiffStats {
  let addedWords = 0;
  let removedWords = 0;
  let unchangedWords = 0;

  for (const part of diffParts) {
    const wordCount = part.value.split(/\s+/).filter(Boolean).length;
    if (part.added) {
      addedWords += wordCount;
    } else if (part.removed) {
      removedWords += wordCount;
    } else {
      unchangedWords += wordCount;
    }
  }

  const denominator = Math.max(unchangedWords + addedWords, unchangedWords + removedWords);
  const similarity = denominator > 0 ? Math.round((unchangedWords / denominator) * 100) : 100;

  return { addedWords, removedWords, unchangedWords, similarity };
}

/**
 * Reconstructs text based on diff parts and rejected part indices (for interactive cherry-picking).
 */
export function buildCherryPickedText(diffParts: DiffPart[], rejectedIndices: Set<number>): string {
  return diffParts
    .map((part, idx) => {
      const isRejected = rejectedIndices.has(idx);
      if (part.added) {
        // Rejected additions are omitted
        return isRejected ? '' : part.value;
      }
      if (part.removed) {
        // Rejected removals are kept in original state
        return isRejected ? part.value : '';
      }
      return part.value;
    })
    .join('');
}

function tokenize(text: string): string[] {
  return text.match(/[\w']+|[^\w\s]+|\s+/g) || [];
}

/**
 * Computes word and punctuation level diff between original and modified text.
 */
export function computeTextDiff(original: string, modified: string): DiffPart[] {
  const origTokens = tokenize(original);
  const modTokens = tokenize(modified);

  const lcs = getLCS(origTokens, modTokens);
  const rawParts: DiffPart[] = [];

  let i = 0;
  let j = 0;
  let l = 0;

  while (i < origTokens.length || j < modTokens.length) {
    if (l < lcs.length && origTokens[i] === lcs[l] && modTokens[j] === lcs[l]) {
      rawParts.push({ value: origTokens[i]! });
      i++;
      j++;
      l++;
    } else {
      let removedStr = '';
      while (i < origTokens.length && (l >= lcs.length || origTokens[i] !== lcs[l])) {
        removedStr += origTokens[i];
        i++;
      }
      if (removedStr) {
        rawParts.push({ value: removedStr, removed: true });
      }

      let addedStr = '';
      while (j < modTokens.length && (l >= lcs.length || modTokens[j] !== lcs[l])) {
        addedStr += modTokens[j];
        j++;
      }
      if (addedStr) {
        rawParts.push({ value: addedStr, added: true });
      }
    }
  }

  const mergedParts: DiffPart[] = [];
  for (const part of rawParts) {
    const last = mergedParts[mergedParts.length - 1];
    if (last && Boolean(last.added) === Boolean(part.added) && Boolean(last.removed) === Boolean(part.removed)) {
      last.value += part.value;
    } else {
      mergedParts.push({ ...part });
    }
  }

  return mergedParts;
}

function getLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]!);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

