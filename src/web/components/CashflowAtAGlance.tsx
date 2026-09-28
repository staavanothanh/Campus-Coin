import { useEffect, useState } from 'react';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api.js';
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

export function CashflowAtAGlance({ locale, refreshKey }: { locale: Locale; refreshKey: number }) {
  const isVi = locale === 'vi';
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setState('loading');
    void apiRequest<CashflowForecast>('/cashflow/forecast?days=30')
      .then((result) => {
        if (!isCurrent) return;
        setForecast(result);
        setState('ready');
      })
      .catch(() => {
        if (isCurrent) setState('error');
      });
    return () => { isCurrent = false; };
  }, [refreshKey, retryKey]);

  return <section className="panel cashflow-panel" aria-busy={state === 'loading'}>
    <div className="panel-heading">
      <div><h2>{isVi ? 'Dòng tiền sắp tới' : 'Upcoming cashflow'}</h2>
        <p className="muted">{isVi ? 'Dự báo tham khảo, không ghi ledger và không authorize payment.' : 'Guidance only; does not write the ledger or authorize payments.'}</p>
      </div>
      {state !== 'ready' && <button type="button" className="text-button" disabled={state === 'loading'} onClick={() => setRetryKey((key) => key + 1)}>
        <RefreshCw size={15} aria-hidden="true" />{isVi ? 'Thử lại' : 'Retry'}
      </button>}
    </div>
    {state === 'loading' && <p role="status" className="muted">{isVi ? 'Đang tải…' : 'Loading…'}</p>}
    {state === 'error' && <p role="alert" className="form-message">{isVi ? 'Chưa tải được dự báo dòng tiền.' : 'Cashflow forecast is unavailable.'}</p>}
    {state === 'ready' && forecast && <>
      <p>{isVi ? 'Số dư dự kiến cuối kỳ' : 'Projected balance at period end'}: <strong>{forecast.projectedWalletBalanceVnd === null ? (isVi ? 'Chưa khởi tạo ví' : 'Wallet not initialized') : formatVnd(forecast.projectedWalletBalanceVnd, locale)}</strong></p>
      {forecast.events.length === 0 ? <p className="empty-state">{isVi ? 'Chưa có khoản dự kiến.' : 'No planned events.'}</p> :
        <ul className="cashflow-event-list">{forecast.events.slice(0, 5).map((event) => <li key={`${event.planId}-${event.dueDate}`}>
          <CalendarClock size={16} aria-hidden="true" />
          <span>{event.title} · {event.dueDate}</span>
          <strong>{formatVnd(event.amountVnd, locale)}</strong>
          <span className="visually-hidden">{event.kind === 'expected_income' ? (isVi ? 'Thu dự kiến' : 'Expected income') : (isVi ? 'Khoản phải trả' : 'Obligation')}</span>
        </li>)}</ul>}
    </>}
  </section>;
}
