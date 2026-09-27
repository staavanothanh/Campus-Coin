export interface JevCategoryCandidate {
  id: string;
  semanticLabel: string;
  active: true;
  appliesTo: Array<'income' | 'payment'>;
}

export interface JevCategorySuggestionInput {
  transactionType: 'income' | 'payment';
  descriptionRedacted: string;
  locale: 'en' | 'vi';
  candidates: JevCategoryCandidate[];
}

export type JevCategorySuggestionResult =
  | { status: 'suggested'; categoryId: string; confidence: number; reasonCode: null }
  | { status: 'manual'; categoryId: null; confidence: number | null; reasonCode: 'low_confidence' | 'timeout' | 'quota' | 'schema' | 'privacy' | null }
  | { status: 'disabled'; categoryId: null; confidence: null; reasonCode: 'flag_off' | null }
  | { status: 'unavailable'; categoryId: null; confidence: null; reasonCode: null };

export interface JevCategorySuggestionService {
  suggest(input: JevCategorySuggestionInput): Promise<JevCategorySuggestionResult>;
}

export function createCategorySuggestionService(options?: {
  enabled?: boolean;
  minimumConfidence?: number | null;
  maxCandidates?: number | null;
  adapter?: { decide(input: unknown): Promise<unknown> };
}): JevCategorySuggestionService;

export function createCategorySuggestionServiceFromEnvironment(options?: {
  env?: NodeJS.ProcessEnv;
  loadEnvFile?: () => void;
  fetchImpl?: typeof fetch;
  logger?: Console;
}): JevCategorySuggestionService;
