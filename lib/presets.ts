export interface RewritePreset {
  id: string;
  label: string;
  instruction: string;
}

export const DEFAULT_PRESETS: RewritePreset[] = [
  {
    id: 'fix-grammar',
    label: 'Fix Grammar',
    instruction:
      'Fix any grammar, spelling, and punctuation mistakes in the following text without changing its meaning or tone.',
  },
  {
    id: 'concise',
    label: 'Concise',
    instruction:
      'Rewrite the following text to be more concise while preserving its core meaning.',
  },
  {
    id: 'formal',
    label: 'Formal',
    instruction: 'Rewrite the following text in a more formal, professional, and polished tone.',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    instruction:
      'Rewrite the following text in a warmer, more friendly, and approachable tone.',
  },
  {
    id: 'simplify',
    label: 'Simplify',
    instruction:
      'Simplify the following text so that it is easy to understand for anyone, using clear language.',
  },
  {
    id: 'bullet-list',
    label: 'Bullet Points',
    instruction:
      'Format and rewrite the key points of the following text as a clean, well-structured bulleted list.',
  },
  {
    id: 'pro-email',
    label: 'Email',
    instruction:
      'Format and rewrite the following text into a professional, clear, and well-structured email message.',
  },
  {
    id: 'persuasive',
    label: 'Persuasive',
    instruction:
      'Rewrite the following text in a compelling, persuasive, and engaging manner.',
  },
  {
    id: 'expand',
    label: 'Expand',
    instruction:
      'Expand the following text with additional context, smooth transitions, and helpful detail while maintaining clarity.',
  },
];

