export type TransactionPayloadInput = {
  type: 'income' | 'payment';
  amount: string;
  categoryId: string;
  occurredAt: string;
  description?: string;
};
export type TransactionPayload = {
  type: TransactionPayloadInput['type'];
  amountVnd: number;
  categoryId: string;
  occurredAt: string;
  description?: string;
  confirmedCategorySuggestion?: boolean;
};

export type WalletBaselinePayload = { initialBalanceVnd: number };

export function parseAmountVnd(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function parseInitialBalanceVnd(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function serializeWalletBaseline(value: string): WalletBaselinePayload | null {
  const initialBalanceVnd = parseInitialBalanceVnd(value);
  return initialBalanceVnd === null ? null : { initialBalanceVnd };
}

export function isCategoryId(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) return false;
  return Number.isSafeInteger(Number(value));
}


export function serializeTransactionPayload(input: TransactionPayloadInput): TransactionPayload | null {
  const amountVnd = parseAmountVnd(input.amount);
  const categoryId = input.categoryId.trim();
  const description = input.description?.trim();

  if (!amountVnd || !isCategoryId(categoryId) || (description && description.length > 500)) return null;

  return {
    type: input.type,
    amountVnd,
    categoryId,
    occurredAt: input.occurredAt,
    ...(description ? { description } : {})
  };
}


export function retryPayloadAfterTransactionFailure<T>(payload: T, status: number | undefined): T | null {
  return shouldRetainTransactionPayload(status) ? payload : null;
}
export function shouldRetainTransactionPayload(status: number | undefined): boolean {
  return status === undefined || status === 408 || status >= 500;
}
