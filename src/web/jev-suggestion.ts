import type { CategorySuggestion } from './types.js';

export function isApplicableCategorySuggestion(
  suggestion: CategorySuggestion | null,
  isManualOverride: boolean,
  availableCategoryIds: readonly string[],
): suggestion is CategorySuggestion & { status: 'suggested'; categoryId: string } {
  return suggestion?.status === 'suggested'
    && suggestion.categoryId !== null
    && !isManualOverride
    && availableCategoryIds.includes(suggestion.categoryId);
}
