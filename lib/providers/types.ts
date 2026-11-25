export type Provider =
  | 'openai'
  | 'gemini'
  | 'anthropic'
  | 'xai'
  | 'openrouter'
  | 'groq'
  | 'mistral';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ValidateKeyResult {
  ok: boolean;
  error?: string;
}

export interface ProviderClient {
  chat(apiKey: string, model: string, messages: ChatMessage[]): Promise<string>;
  rewrite(
    apiKey: string,
    model: string,
    text: string,
    instruction: string,
    deepPolish?: boolean,
  ): Promise<string>;
  validateKey(apiKey: string): Promise<ValidateKeyResult>;
}

export class ProviderError extends Error {
  constructor(
    public provider: Provider,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function buildRewriteMessages(
  text: string,
  instruction: string,
  deepPolish?: boolean,
): ChatMessage[] {
  const thinkingPrompt = deepPolish
    ? `[Smart Thinking & High-Precision Polish Mode Enabled]\nInstructions: First think step-by-step to analyze context, tone, and core meaning. Remove redundancy, refine sentence structures, and ensure flawless clarity and impact.\n\n`
    : '';

  const formattingInstruction = `SMART FORMATTING RULES:
1. FORMATTING ADAPTATION: If the instruction requests or implies a formatting change (e.g. "convert to bullet list", "make a numbered list", "put in code block", "underline key terms", "add line breaks between sections", "make headings bold"), intelligently transform the output using rich formatting tags (bullets -, 1., <u>underline</u>, **bold**, *italic*, \`\`\`code blocks\`\`\`).
2. FORMATTING PRESERVATION: If no formatting change is requested, strictly maintain the original structural layout and formatting (bullet points, numbered lists, line breaks, paragraph separations, code blocks, underlines <u>text</u>, bold **text**, and italics *text*).
3. NEWLINES & PARAGRAPHS: Always preserve line breaks, double newlines, and paragraph structures so text does not get collapsed into a single line.`;

  return [
    {
      role: 'user',
      content: `${thinkingPrompt}${instruction}\n\n${formattingInstruction}\n\nReturn ONLY the rewritten text result, with no introductory text, surrounding quotation marks, or meta explanations.\n\nOriginal Text:\n${text}`,
    },
  ];
}
