import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api.js';
import { formatVnd } from '../format.js';
import type { Locale } from '../types.js';

interface CashflowPlan {
  id: string;
  kind: 'obligation' | 'expected_income';
  title: string;
  amountVnd: number;
  frequency: 'once' | 'monthly';
  startsOn: string;
  dueDay: number | null;
  reserveInForecast: boolean;
  isActive: boolean;
}

function todayInHcmc(): string {
  const HCMC_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
  return new Date(Date.now() + HCMC_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

export function CashflowPlanningPanel({ csrfToken, locale, refreshKey, onChanged }: { csrfToken: string; locale: Locale; refreshKey: number; onChanged(): void }) {
  const isVi = locale === 'vi';
  const [plans, setPlans] = useState<CashflowPlan[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<CashflowPlan['kind']>('obligation');
  const [frequency, setFrequency] = useState<CashflowPlan['frequency']>('monthly');
  const [startsOn, setStartsOn] = useState(todayInHcmc);
  const [reserveInForecast, setReserveInForecast] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const createKey = useRef<{ signature: string; key: string } | null>(null);
  const updateKey = useRef<{ signature: string; key: string } | null>(null);

  async function loadPlans() {
    setState('loading');
    try {
      const result = await apiRequest<CashflowPlan[]>('/cashflow/plans');
      if (!Array.isArray(result)) throw new Error('Invalid cashflow plan response');
      setPlans(result);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  useEffect(() => { void loadPlans(); }, [refreshKey, retryKey]);

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountVnd = Number(amount);
    if (!title.trim() || !Number.isSafeInteger(amountVnd) || amountVnd < 1 || busy) return;
    const body = {
      kind,
      title: title.trim(),
      amountVnd,
      categoryId: null,
      frequency,
      startsOn,
      dueDay: frequency === 'monthly' ? Number(startsOn.slice(-2)) : null,
      reserveInForecast: kind === 'obligation' && reserveInForecast,
    };
    const signature = JSON.stringify(body);
    if (createKey.current?.signature !== signature) createKey.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setMessage('');
    try {
      await apiRequest<CashflowPlan>('/cashflow/plans', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken,
          'idempotency-key': createKey.current.key,
        },
        body: JSON.stringify(body),
      });
      createKey.current = null;
      setTitle('');
      setAmount('');
      setReserveInForecast(false);
      await loadPlans();
      onChanged();
      setMessage(isVi ? 'Đã lưu kế hoạch.' : 'Plan saved.');
    } catch {
      setMessage(isVi ? 'Chưa lưu được kế hoạch. Hãy kiểm tra thông tin và thử lại.' : 'Could not save the plan. Check the details and retry.');
    } finally {
      setBusy(false);
    }
  }

  async function updatePlan(plan: CashflowPlan, changes: { reserveInForecast?: boolean; isActive?: boolean }) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const signature = `${plan.id}:${JSON.stringify(changes)}`;
    if (updateKey.current?.signature !== signature) updateKey.current = { signature, key: crypto.randomUUID() };
    try {
      await apiRequest<CashflowPlan>(`/cashflow/plans/${encodeURIComponent(plan.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken, 'idempotency-key': updateKey.current.key },
        body: JSON.stringify(changes),
      });
      updateKey.current = null;
      await loadPlans();
      onChanged();
    } catch {
      setMessage(isVi ? 'Chưa cập nhật được kế hoạch.' : 'Could not update the plan.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel cashflow-panel">
    <div className="panel-heading"><div><h2>{isVi ? 'Kế hoạch dòng tiền' : 'Cashflow plans'}</h2><p className="muted">{isVi ? 'Chỉ dùng để tham khảo; không tạo giao dịch hoặc trừ tiền.' : 'Guidance only; plans never create transactions or deduct money.'}</p></div>
      {state === 'error' && <button type="button" className="text-button" onClick={() => setRetryKey(key => key + 1)}><RefreshCw size={15} />{isVi ? 'Thử lại' : 'Retry'}</button>}
    </div>
    {state === 'loading' && <p role="status" className="muted">{isVi ? 'Đang tải…' : 'Loading…'}</p>}
    {state === 'error' && <p role="alert">{isVi ? 'Không tải được kế hoạch.' : 'Plans are unavailable.'}</p>}
    {state === 'ready' && <>
      <form className="cashflow-plan-form" onSubmit={event => void submitPlan(event)}>
        <label>{isVi ? 'Tên khoản' : 'Plan title'}<input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>{isVi ? 'Số tiền (VND)' : 'Amount (VND)'}<input required type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label>{isVi ? 'Loại kế hoạch' : 'Plan type'}<select value={kind} onChange={event => setKind(event.target.value as CashflowPlan['kind'])}><option value="obligation">{isVi ? 'Khoản phải trả' : 'Obligation'}</option><option value="expected_income">{isVi ? 'Thu nhập dự kiến' : 'Expected income'}</option></select></label>
        <label>{isVi ? 'Lịch' : 'Schedule'}<select value={frequency} onChange={event => setFrequency(event.target.value as CashflowPlan['frequency'])}><option value="monthly">{isVi ? 'Hàng tháng' : 'Monthly'}</option><option value="once">{isVi ? 'Một lần' : 'One-time'}</option></select></label>
        <label>{isVi ? 'Ngày bắt đầu/đến hạn' : 'Start/due date'}<input required type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)} /></label>
        {kind === 'obligation' && <label><input type="checkbox" checked={reserveInForecast} onChange={event => setReserveInForecast(event.target.checked)} />{isVi ? 'Tính trước trong dự báo' : 'Reserve in forecast'}</label>}
        <button type="submit" className="primary-button" disabled={busy}><Plus size={16} />{isVi ? 'Thêm kế hoạch' : 'Add plan'}</button>
      </form>
      {message && <p role="status" className="form-message">{message}</p>}
      {plans.length === 0 ? <p className="empty-state">{isVi ? 'Chưa có kế hoạch.' : 'No plans yet.'}</p> : <ul className="cashflow-event-list">
        {plans.map(plan => <li key={plan.id}>
          <span>{plan.title} · {plan.frequency === 'monthly' ? (isVi ? 'Hàng tháng' : 'Monthly') : plan.startsOn}</span>
          <strong>{formatVnd(plan.amountVnd, locale)}</strong>
          {plan.isActive && plan.kind === 'obligation' && <label><input type="checkbox" checked={plan.reserveInForecast} disabled={busy} onChange={() => void updatePlan(plan, { reserveInForecast: !plan.reserveInForecast })} />{isVi ? 'Tính trước' : 'Include'}</label>}
          <button type="button" className="text-button" disabled={busy} onClick={() => void updatePlan(plan, { isActive: !plan.isActive })}>{plan.isActive ? (isVi ? 'Tắt' : 'Disable') : (isVi ? 'Bật lại' : 'Reactivate')}</button>
        </li>)}
      </ul>}
    </>}
  </section>;
}
