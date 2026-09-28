import { useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { formatAmountInputVnd, formatAmountInputVndWithCaret } from '../format.js';
import type { Locale } from '../types.js';

type FormattedAmountInputOptions = {
  keepZeroWhenEmpty?: boolean;
};

export function useFormattedAmountInput(
  initialValue: string,
  locale: Locale,
  options: FormattedAmountInputOptions = {},
) {
  const [rawValue, setRawValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretPositionRef = useRef<number | null>(null);
  const previousInitialValueRef = useRef(initialValue);
  const [changeRevision, setChangeRevision] = useState(0);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = formatAmountInputVndWithCaret(
      event.currentTarget.value,
      event.currentTarget.selectionStart,
      locale,
    );
    const nextRawValue = options.keepZeroWhenEmpty && next.rawValue === '' ? '0' : next.rawValue;

    pendingCaretPositionRef.current = nextRawValue === '0' && next.rawValue === ''
      ? 1
      : next.caretPosition;
    setRawValue(nextRawValue);
    setChangeRevision(revision => revision + 1);
  }

  useLayoutEffect(() => {
    if (previousInitialValueRef.current === initialValue) return;

    previousInitialValueRef.current = initialValue;
    pendingCaretPositionRef.current = null;
    setRawValue(initialValue);
  }, [initialValue]);

  useLayoutEffect(() => {
    const caretPosition = pendingCaretPositionRef.current;
    pendingCaretPositionRef.current = null;
    if (caretPosition === null || !inputRef.current) return;

    const boundedCaretPosition = Math.min(caretPosition, inputRef.current.value.length);
    inputRef.current.setSelectionRange(boundedCaretPosition, boundedCaretPosition);
  }, [locale, rawValue, changeRevision]);

  return {
    rawValue,
    setRawValue,
    formattedValue: formatAmountInputVnd(rawValue, locale),
    inputRef,
    handleChange,
  };
}
