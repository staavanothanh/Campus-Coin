import type { BudgetWarning, Locale } from '../types.js';
import { formatVnd } from '../format.js';

interface BudgetWarningBannerProps {
  warning: BudgetWarning;
  locale: Locale;
}

/**
 * Budget overrun warning banner.
 * Shown after a transaction is created when the budget category has been exceeded.
 * Budget overrun is warning-only — it does not block the payment.
 */
export function BudgetWarningBanner({ warning, locale }: BudgetWarningBannerProps) {
  if (!warning.isOverrun) return null;

  const used = formatVnd(warning.usedVnd, locale);
  const limit = formatVnd(warning.limitVnd, locale);

  return (
    <div className="budget-warning-banner" role="status">
      <p>
        {locale === 'vi'
          ? `\u26A0 Ngân sách vượt mức: đã dùng ${used} / giới hạn ${limit}`
          : `\u26A0 Budget exceeded: used ${used} / limit ${limit}`}
      </p>
    </div>
  );
}
