import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, CircleAlert, RefreshCw } from 'lucide-react';
import { apiGet, apiPatch } from '../api-client.js';
import { formatVnd } from '../format.js';
import type { Locale } from '../types.js';

interface CashflowEvent {
  planId: string;
  kind: 'obligation' | 'expected_income';
  title: string;
  amountVnd: number;
  dueDate: string;
  reserveInForecast: boolean;
  isDueWithin10Days: boolean;
}

interface CashflowForecast {
  asOfDate: string;
  endDate: string;
  projectedWalletBalanceVnd: number | null;
  events: CashflowEvent[];
}

interface CashflowAtAGlanceProps {
  csrfToken: string;
  locale: Locale;
  balanceVersion: number | undefined;
  onViewPlans: () => void;
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric', month: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T12:00:00+07:00`));
}

function isForecast(value: unknown): value is CashflowForecast {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CashflowForecast>;
  return typeof candidate.asOfDate === 'string'
    && typeof candidate.endDate === 'string'
    && Array.isArray(candidate.events);
}

export function CashflowAtAGlance({ csrfToken, locale, balanceVersion, onViewPlans }: CashflowAtAGlanceProps) {
  const isVi = locale === 'vi';
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const requestNumber = useRef(0);
  const updateKey = useRef<{ signature: string; key: string } | null>(null);

  const loadForecast = useCallback(async () => {
    const requestId = ++requestNumber.current;
    setLoading(true);
    setError(false);
    try {
      const result = await apiGet<unknown>('/cashflow/forecast?days=30');
      if (requestId !== requestNumber.current) return;
      if (!isForecast(result)) throw new Error('Forecast response does not match its contract');
      setForecast(result);
    } catch {
      if (requestId === requestNumber.current) {
        setForecast(null);
        setError(true);
      }
    } finally {
      if (requestId === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForecast();
    return () => { requestNumber.current += 1; };
  }, [loadForecast, balanceVersion]);

  async function toggleReserve(event: CashflowEvent) {
    if (busyPlanId !== null) return;
    const body = { reserveInForecast: !event.reserveInForecast };
    const signature = `${event.planId}:${body.reserveInForecast}`;
    if (updateKey.current?.signature !== signature) {
      updateKey.current = { signature, key: crypto.randomUUID() };
    }
    setBusyPlanId(event.planId);
    try {
      await apiPatch(`/cashflow/plans/${event.planId}`, body, {
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': updateKey.current.key,
      });
      updateKey.current = null;
      await loadForecast();
    } catch {
      setError(true);
    } finally {
      setBusyPlanId(null);
    }
  }

  const upcomingBills = (forecast?.events ?? []).filter(event => event.kind === 'obligation').slice(0, 4);

  return (
    <section className="cashflow-digest panel" aria-labelledby="cashflow-digest-title">
      <div className="cashflow-digest-heading">
        <div>
          <h2 id="cashflow-digest-title">{isVi ? 'Khoản cố định sắp tới' : 'Upcoming planned bills'}</h2>
          <p className="muted">
            {isVi
              ? 'Dự báo dùng số dư ví mới nhất và các khoản kế hoạch từ ngày mai. Chọn khoản muốn tính trước; không có khoản nào tự động bị trừ.'
              : 'The forecast uses your latest wallet balance and planned items from tomorrow onward. Choose bills to include; nothing is deducted automatically.'}
          </p>
        </div>
        <button type="button" className="cashflow-digest-link" onClick={onViewPlans}>
          {isVi ? 'Quản lý kế hoạch' : 'Manage plans'}
        </button>
      </div>

      {loading ? (
        <p className="cashflow-digest-status" role="status">{isVi ? 'Đang cập nhật dự báo…' : 'Updating forecast…'}</p>
      ) : error || !forecast ? (
        <p className="cashflow-digest-status" role="status">
          {isVi ? 'Chưa tải được kế hoạch. Bạn vẫn có thể ghi chép thu chi bình thường.' : 'Plans are unavailable. You can continue recording income and payments.'}
          <button type="button" onClick={() => void loadForecast()}><RefreshCw size={13} /> {isVi ? 'Thử lại' : 'Retry'}</button>
        </p>
      ) : (
        <>
          <p className="cashflow-digest-total">
            <span>{isVi ? 'Dự kiến cuối 30 ngày' : 'Projected at day 30'}</span>
            <strong>{forecast.projectedWalletBalanceVnd === null
              ? (isVi ? 'Chưa khởi tạo ví' : 'Wallet not initialized')
              : formatVnd(forecast.projectedWalletBalanceVnd, locale)}</strong>
          </p>
          <p className="cashflow-note" role="note">
            {isVi
              ? 'Khoản đến hạn hôm nay vẫn hiện trong lịch, nhưng không tính vào số dư dự kiến để tránh tính hai lần với giao dịch đã ghi.'
              : 'Items due today remain in the schedule, but are excluded from the projected balance to avoid counting recorded transactions twice.'}
          </p>
          {upcomingBills.length === 0 ? (
            <p className="cashflow-digest-status">{isVi ? 'Chưa có khoản phải trả nào được khai báo.' : 'No planned bills have been added.'}</p>
          ) : (
            <ul className="cashflow-digest-list">
              {upcomingBills.map(event => (
                <li key={`${event.planId}:${event.dueDate}`}>
                  <span className={`cashflow-digest-icon ${event.isDueWithin10Days ? 'due-soon' : ''}`} aria-hidden="true">
                    {event.isDueWithin10Days ? <CircleAlert size={16} /> : <CalendarClock size={16} />}
                  </span>
                  <span className="cashflow-digest-name">
                    <strong>{event.title}</strong>
                    <small>{formatDate(event.dueDate, locale)}{event.isDueWithin10Days ? ` · ${isVi ? 'Còn tối đa 10 ngày' : 'Due within 10 days'}` : ''}</small>
                  </span>
                  <strong className="cashflow-digest-amount">{formatVnd(event.amountVnd, locale)}</strong>
                  <label className="cashflow-digest-reserve">
                    <input
                      type="checkbox"
                      checked={event.reserveInForecast}
                      disabled={busyPlanId !== null}
                      onChange={() => void toggleReserve(event)}
                    />
                    <span>{isVi ? 'Tính trước' : 'Include'}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
