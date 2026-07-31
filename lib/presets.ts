export interface RewritePreset {
  id: string;
  label: string;
  instruction: string;
}

export const DEFAULT_PRESETS: RewritePreset[] = [
  {
    id: 'concise',
    label: 'Concise',
    instruction:
      'Rewrite the following text to be more concise while preserving its meaning and tone.',
  },
  {
    id: 'formal',
    label: 'Formal',
    instruction: 'Rewrite the following text in a more formal, professional tone.',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    instruction:
      'Rewrite the following text in a warmer, more friendly and approachable tone.',
  },
  {
    id: 'fix-grammar',
    label: 'Fix Grammar',
    instruction:
      'Fix any grammar, spelling, and punctuation mistakes in the following text without changing its meaning or tone.',
  },
];
