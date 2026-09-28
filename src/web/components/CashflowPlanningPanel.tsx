import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { apiGet, apiPatch, apiPost } from '../api-client.js';
import { formatVnd } from '../format.js';
import type { Category, Locale } from '../types.js';
import { CalendarClock, CircleAlert, Plus, RefreshCw, Sparkles, Wallet } from 'lucide-react';

type PlanKind = 'obligation' | 'expected_income';
type PlanFrequency = 'once' | 'monthly';

interface CashflowPlan {
  id: string;
  kind: PlanKind;
  title: string;
  amountVnd: number;
  categoryId: string | null;
  frequency: PlanFrequency;
  startsOn: string;
  dueDay: number | null;
  reserveInForecast: boolean;
  isActive: boolean;
}

interface CashflowEvent {
  planId: string;
  kind: PlanKind;
  title: string;
  amountVnd: number;
  dueDate: string;
  reserveInForecast: boolean;
  reminderStatus: 'date_passed' | 'due_soon' | 'upcoming';
  isDueWithin10Days: boolean;
}

interface CashflowForecast {
  asOfDate: string;
  days: number;
  endDate: string;
  walletStatus: 'initialized' | 'not_initialized';
  currentWalletBalanceVnd: number | null;
  plannedIncomeVnd: number;
  plannedObligationsVnd: number;
  reservedObligationsVnd: number;
  unreservedObligationsVnd: number;
  projectedWalletBalanceVnd: number | null;
  events: CashflowEvent[];
  assumptions: string[];
}

interface CashflowWhatIf {
  paymentDate: string;
  hypotheticalPaymentVnd: number;
  baselineProjectedWalletBalanceVnd: number;
  scenarioProjectedWalletBalanceVnd: number;
  baselineProjectedWalletBalanceOnPaymentDateVnd: number;
  scenarioProjectedWalletBalanceOnPaymentDateVnd: number;
  baselineLowestProjectedWalletBalanceVnd: number;
  scenarioLowestProjectedWalletBalanceVnd: number;
}

interface CashflowReflectionPart {
  plannedVnd: number | null;
  plannedOccurrenceCount: number;
  plannedStatus: 'planned' | 'unplanned';
  recordedVnd: number | null;
  recordedTransactionCount: number;
  recordedStatus: 'recorded' | 'unrecorded';
  recordedMinusPlannedVnd: number | null;
}

interface CashflowReflection {
  month: string;
  income: CashflowReflectionPart;
  obligations: CashflowReflectionPart;
}

interface CashflowPlanningPanelProps {
  csrfToken: string;
  locale: Locale;
  categories: Category[];
}

const DEFAULT_DAYS = 30;
const FORECAST_DAY_OPTIONS = [30, 90, 180, 365] as const;
const HCMC_OFFSET_MS = 7 * 60 * 60 * 1000;

function todayInHcmc(): string {
  return new Date(Date.now() + HCMC_OFFSET_MS).toISOString().slice(0, 10);
}

function previousMonth(month: string): string {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  return monthNumber === 1
    ? `${year - 1}-12`
    : `${year}-${String(monthNumber - 1).padStart(2, '0')}`;
}

function formatPlanDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCashflowForecast(value: unknown): value is CashflowForecast {
  return isRecord(value)
    && Array.isArray(value.events)
    && (value.walletStatus === 'initialized' || value.walletStatus === 'not_initialized')
    && typeof value.asOfDate === 'string'
    && typeof value.endDate === 'string'
    && typeof value.days === 'number';
}

function isCashflowReflectionPart(value: unknown): value is CashflowReflectionPart {
  return isRecord(value)
    && (value.plannedVnd === null || typeof value.plannedVnd === 'number')
    && (value.recordedVnd === null || typeof value.recordedVnd === 'number')
    && (value.recordedMinusPlannedVnd === null || typeof value.recordedMinusPlannedVnd === 'number')
    && (value.plannedStatus === 'planned' || value.plannedStatus === 'unplanned')
    && (value.recordedStatus === 'recorded' || value.recordedStatus === 'unrecorded');
}

function isCashflowReflection(value: unknown): value is CashflowReflection {
  return isRecord(value)
    && typeof value.month === 'string'
    && isCashflowReflectionPart(value.income)
    && isCashflowReflectionPart(value.obligations);
}

export function CashflowPlanningPanel({ csrfToken, locale, categories }: CashflowPlanningPanelProps) {
  const isVi = locale === 'vi';
  const [plans, setPlans] = useState<CashflowPlan[]>([]);
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);
  const [reflection, setReflection] = useState<CashflowReflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(DEFAULT_DAYS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [planMessage, setPlanMessage] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [confirmDisablePlanId, setConfirmDisablePlanId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<PlanKind>('obligation');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<PlanFrequency>('monthly');
  const [startsOn, setStartsOn] = useState(todayInHcmc);
  const [categoryId, setCategoryId] = useState('');
  const [reserveInForecast, setReserveInForecast] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [whatIf, setWhatIf] = useState<CashflowWhatIf | null>(null);
  const [whatIfBusy, setWhatIfBusy] = useState(false);
  const requestNumber = useRef(0);
  const cancelDisableRef = useRef<HTMLButtonElement | null>(null);
  const disableButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const createKey = useRef<{ signature: string; key: string } | null>(null);
  const updateKey = useRef<{ signature: string; key: string } | null>(null);

  const loadData = useCallback(async () => {
    const requestId = ++requestNumber.current;
    setLoading(true);
    setError('');
    try {
      const [nextPlans, nextForecast, nextReflection] = await Promise.all([
        apiGet<CashflowPlan[]>('/cashflow/plans'),
        apiGet<CashflowForecast>(`/cashflow/forecast?days=${selectedDays}`),
        apiGet<CashflowReflection>(`/cashflow/reflection?month=${previousMonth(todayInHcmc().slice(0, 7))}`)
          .catch(() => null),
      ]);
      if (requestId !== requestNumber.current) return;
      if (!Array.isArray(nextPlans) || !isCashflowForecast(nextForecast)) {
        throw new Error('Cashflow API response does not match its contract');
      }
      setPlans(nextPlans);
      setForecast(nextForecast);
      setReflection(isCashflowReflection(nextReflection) ? nextReflection : null);
      setPaymentDate(nextForecast.asOfDate);
    } catch {
      if (requestId === requestNumber.current) {
        setError(isVi
          ? 'Chưa tải được kế hoạch dòng tiền. Hãy thử tải lại sau.'
          : 'Cash flow plans are unavailable. Please try again.');
      }
    } finally {
      if (requestId === requestNumber.current) setLoading(false);
    }
  }, [isVi, selectedDays]);

  useEffect(() => {
    void loadData();
    return () => { requestNumber.current += 1; };
  }, [loadData]);

  useEffect(() => {
    if (confirmDisablePlanId !== null) cancelDisableRef.current?.focus();
  }, [confirmDisablePlanId]);

  useEffect(() => {
    setShowAllEvents(false);
  }, [selectedDays]);

  function closeDisableConfirmation(planId: string) {
    setConfirmDisablePlanId(null);
    window.setTimeout(() => disableButtonRefs.current.get(planId)?.focus(), 0);
  }

  async function submitPlan(event: FormEvent) {
    event.preventDefault();
    if (busy || !title.trim() || !Number.isSafeInteger(Number(amount)) || Number(amount) < 1) return;

    const body = {
      kind,
      title: title.trim(),
      amountVnd: Number(amount),
      categoryId: kind === 'obligation' && categoryId ? Number(categoryId) : null,
      frequency,
      startsOn,
      dueDay: frequency === 'monthly' ? Number(startsOn.slice(-2)) : null,
      reserveInForecast: kind === 'obligation' && reserveInForecast,
    };
    const signature = JSON.stringify(body);
    if (createKey.current?.signature !== signature) {
      createKey.current = { signature, key: newIdempotencyKey() };
    }

    setBusy(true);
    setError('');
    try {
      await apiPost('/cashflow/plans', body, {
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': createKey.current.key,
      });
      createKey.current = null;
      setTitle('');
      setAmount('');
      setReserveInForecast(false);
      setShowForm(false);
      await loadData();
    } catch {
      setError(isVi
        ? 'Chưa lưu được kế hoạch. Kiểm tra thông tin rồi thử lại.'
        : 'The plan could not be saved. Check the details and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function updatePlan(plan: CashflowPlan, body: { reserveInForecast?: boolean; isActive?: boolean }) {
    if (busy) return;
    const signature = `${plan.id}:${JSON.stringify(body)}`;
    if (updateKey.current?.signature !== signature) {
      updateKey.current = { signature, key: newIdempotencyKey() };
    }
    setBusy(true);
    setError('');
    setPlanMessage('');
    try {
      await apiPatch(`/cashflow/plans/${plan.id}`, body, {
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': updateKey.current.key,
      });
      updateKey.current = null;
      if (body.isActive === true) {
        setPlanMessage(isVi ? `Đã bật lại “${plan.title}”.` : `“${plan.title}” is active again.`);
      } else if (body.isActive === false) {
        setPlanMessage(isVi
          ? `Đã tắt nhắc và dự báo cho “${plan.title}”. Bạn có thể bật lại trong danh sách kế hoạch đã tắt.`
          : `Reminders and forecasts are off for “${plan.title}”. You can turn it back on from disabled plans.`);
      }
      await loadData();
    } catch {
      setError(isVi
        ? 'Chưa cập nhật được kế hoạch. Hãy thử lại.'
        : 'The plan could not be updated. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function runWhatIf(event: FormEvent) {
    event.preventDefault();
    if (whatIfBusy || !forecast || forecast.walletStatus !== 'initialized') return;
    const amountVnd = Number(paymentAmount);
    if (!Number.isSafeInteger(amountVnd) || amountVnd < 1 || !paymentDate) return;

    setWhatIfBusy(true);
    setWhatIf(null);
    setError('');
    try {
      const result = await apiPost<CashflowWhatIf>('/cashflow/what-if', {
        amountVnd,
        paymentDate,
        days: forecast.days,
      }, { 'X-CSRF-Token': csrfToken });
      setWhatIf(result);
    } catch {
      setError(isVi
        ? 'Chưa tính được kịch bản. Hãy kiểm tra ngày và số tiền.'
        : 'The scenario could not be calculated. Check the date and amount.');
    } finally {
      setWhatIfBusy(false);
    }
  }

  const activePlans = plans.filter(plan => plan.isActive);
  const visiblePlans = showInactive ? plans : activePlans;
  const paymentCategories = categories.filter(category =>
    category.appliesTo === 'payment' && category.status === 'active' && /^\d+$/.test(category.id));
  const events = forecast?.events ?? [];
  const visibleEvents = showAllEvents ? events : events.slice(0, 8);
  const periodDays = forecast?.days ?? selectedDays;

  return (
    <section className="cashflow-planning panel" aria-labelledby="cashflow-planning-title">
      <div className="cashflow-heading">
        <div className="cashflow-heading-copy">
          <span className="cashflow-eyebrow"><Sparkles size={14} /> {isVi ? 'LẬP KẾ HOẠCH CÁ NHÂN' : 'PERSONAL PLANNING'}</span>
          <h3 id="cashflow-planning-title">{isVi ? 'Khoản cố định & dự báo dòng tiền' : 'Regular costs & cash flow forecast'}</h3>
          <p className="muted">
            {isVi
              ? `Khai báo khoản thu dự kiến và khoản phải trả để xem trước ${selectedDays} ngày. Đây là ước tính do bạn nhập, không tự trừ tiền.`
              : `Add expected income and planned bills to preview the next ${selectedDays} days. These are your estimates and never deduct money automatically.`}
          </p>
        </div>
        <div className="cashflow-heading-actions">
          <label className="cashflow-period-field">
            <span>{isVi ? 'Khoảng xem' : 'View period'}</span>
            <select aria-label={isVi ? 'Khoảng xem dự báo' : 'Forecast view period'} value={selectedDays} onChange={event => setSelectedDays(Number(event.target.value))}>
              {FORECAST_DAY_OPTIONS.map(days => (
                <option key={days} value={days}>
                  {days === 180
                    ? (isVi ? '180 ngày · khoảng 6 tháng' : '180 days · about 6 months')
                    : days === 365
                      ? (isVi ? '365 ngày · khoảng 1 năm' : '365 days · about 1 year')
                      : (isVi ? `${days} ngày` : `${days} days`)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary-button cashflow-refresh" onClick={() => void loadData()} disabled={loading || busy}>
            <RefreshCw size={15} /> {isVi ? 'Tải lại' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="cashflow-message error" role="status">{error}</p>}
      {planMessage && <p className="cashflow-message success" role="status" aria-live="polite">{planMessage}</p>}

      {loading ? (
        <p className="cashflow-message" role="status">{isVi ? 'Đang tải dự báo…' : 'Loading forecast…'}</p>
      ) : forecast ? (
        <>
          <div className="cashflow-summary-grid">
            <article className="cashflow-summary-card">
              <span><Wallet size={16} /> {isVi ? `Số dư dự kiến cuối ${periodDays} ngày` : `Projected balance after ${periodDays} days`}</span>
              <strong>{forecast.projectedWalletBalanceVnd === null
                ? (isVi ? 'Chưa có số dư ví' : 'Wallet not initialized')
                : formatVnd(forecast.projectedWalletBalanceVnd, locale)}</strong>
            </article>
            <article className="cashflow-summary-card">
              <span>{isVi ? 'Khoản thu dự kiến' : 'Expected income'}</span>
              <strong>{formatVnd(forecast.plannedIncomeVnd, locale)}</strong>
            </article>
            <article className="cashflow-summary-card">
              <span>{isVi ? 'Tổng khoản phải trả đã khai báo' : 'All planned bills'}</span>
              <strong>{formatVnd(forecast.plannedObligationsVnd, locale)}</strong>
            </article>
            <article className="cashflow-summary-card">
              <span>{isVi ? 'Khoản đã chọn tính trước' : 'Bills included in forecast'}</span>
              <strong>{formatVnd(forecast.reservedObligationsVnd, locale)}</strong>
            </article>
          </div>

          <p className="cashflow-note" role="note">
            {isVi
              ? 'Khoản đến hạn hôm nay vẫn hiện trong lịch, nhưng không cộng/trừ vào dự báo vì số dư ví đã phản ánh các giao dịch được ghi đến lúc tải. Nếu bạn chưa ghi giao dịch hôm nay, dự báo chưa tính khoản đó.'
              : 'Items due today remain in the schedule, but are not added to or subtracted from the forecast because the wallet balance already reflects transactions recorded up to load time. If you have not recorded today’s activity, the forecast does not include it.'}
          </p>

          {forecast.walletStatus === 'not_initialized' && (
            <p className="cashflow-note" role="status">
              {isVi
                ? 'Hãy khởi tạo số dư ví ở trang Tổng quan để xem con số dự kiến. Kế hoạch vẫn có thể được lưu trước.'
                : 'Set your starting wallet balance on Overview to see a projected amount. You can still save plans now.'}
            </p>
          )}

          <div className="cashflow-lower-grid">
            <div className="cashflow-card">
              <div className="cashflow-card-heading">
                <div>
                  <h4><CalendarClock size={17} /> {isVi ? 'Lịch sắp tới' : 'Upcoming schedule'}</h4>
                  <p className="muted">{isVi ? 'Nhắc trước 10 ngày; khoản dự kiến chưa phải giao dịch thực tế.' : 'Reminders appear 10 days ahead; planned items are not recorded transactions.'}</p>
                </div>
                <button type="button" className="primary-button cashflow-add-button" onClick={() => setShowForm(value => !value)}>
                  <Plus size={15} /> {showForm ? (isVi ? 'Đóng' : 'Close') : (isVi ? 'Thêm kế hoạch' : 'Add a plan')}
                </button>
              </div>

              {showForm && (
                <form className="cashflow-form" onSubmit={submitPlan}>
                  <div className="cashflow-form-grid">
                    <label>
                      <span>{isVi ? 'Loại kế hoạch' : 'Plan type'}</span>
                      <select value={kind} onChange={event => setKind(event.target.value as PlanKind)}>
                        <option value="obligation">{isVi ? 'Khoản phải trả' : 'Planned bill'}</option>
                        <option value="expected_income">{isVi ? 'Khoản thu dự kiến' : 'Expected income'}</option>
                      </select>
                    </label>
                    <label>
                      <span>{isVi ? 'Tên khoản' : 'Name'}</span>
                      <input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required />
                    </label>
                    <label>
                      <span>{isVi ? 'Số tiền (VND)' : 'Amount (VND)'}</span>
                      <input type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} required />
                    </label>
                    <label>
                      <span>{isVi ? 'Ngày đến hạn đầu tiên' : 'First due date'}</span>
                      <input type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)} required />
                    </label>
                    <label>
                      <span>{isVi ? 'Lặp lại' : 'Repeat'}</span>
                      <select value={frequency} onChange={event => setFrequency(event.target.value as PlanFrequency)}>
                        <option value="monthly">{isVi ? 'Hàng tháng' : 'Monthly'}</option>
                        <option value="once">{isVi ? 'Một lần' : 'Once'}</option>
                      </select>
                    </label>
                    {kind === 'obligation' && paymentCategories.length > 0 && (
                      <label>
                        <span>{isVi ? 'Danh mục (không bắt buộc)' : 'Category (optional)'}</span>
                        <select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                          <option value="">{isVi ? 'Chưa chọn' : 'No category'}</option>
                          {paymentCategories.map(category => (
                            <option key={category.id} value={category.id}>{category.name[locale]}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  {kind === 'obligation' && (
                    <label className="cashflow-check-row">
                      <input type="checkbox" checked={reserveInForecast} onChange={event => setReserveInForecast(event.target.checked)} />
                      <span>{isVi ? 'Tính trước khoản này trong số dư dự báo' : 'Include this bill in the projected balance'}</span>
                    </label>
                  )}
                  <p className="cashflow-note">
                    {kind === 'expected_income'
                      ? isVi
                        ? 'Khoản thu là ước tính do bạn khai báo, không được đảm bảo và không tạo income thật.'
                        : 'Expected income is your estimate. It is not guaranteed and does not create a real income entry.'
                      : isVi
                        ? 'Tùy chọn tính trước chỉ thay đổi dự báo. Nó không trừ ví, tạo payment hay thay đổi ngân sách.'
                        : 'Including a bill changes the forecast only. It does not deduct from your wallet, create a payment, or change a budget.'}
                  </p>
                  <div className="cashflow-form-actions">
                    <button type="button" className="secondary-button" onClick={() => setShowForm(false)} disabled={busy}>{isVi ? 'Hủy' : 'Cancel'}</button>
                    <button type="submit" className="primary-button" disabled={busy || !title.trim() || !amount}>
                      {busy ? (isVi ? 'Đang lưu…' : 'Saving…') : (isVi ? 'Lưu kế hoạch' : 'Save plan')}
                    </button>
                  </div>
                </form>
              )}

              <div className="cashflow-events-list">
                {events.length === 0 ? (
                  <p className="cashflow-empty">{isVi ? `Chưa có khoản nào trong ${periodDays} ngày tới.` : `No planned events in the next ${periodDays} days.`}</p>
                ) : visibleEvents.map(event => (
                  <div className="cashflow-event-row" key={`${event.planId}:${event.dueDate}`}>
                    <span className={`cashflow-event-icon ${event.kind === 'expected_income' ? 'income' : 'obligation'}`}>
                      {event.isDueWithin10Days ? <CircleAlert size={16} /> : <CalendarClock size={16} />}
                    </span>
                    <div className="cashflow-event-title">
                      <strong>{event.title}</strong>
                      <span>{formatPlanDate(event.dueDate, locale)} · {event.kind === 'expected_income' ? (isVi ? 'Dự kiến thu' : 'Expected income') : (isVi ? 'Khoản phải trả' : 'Planned bill')}</span>
                    </div>
                    <strong className={event.kind === 'expected_income' ? 'cashflow-income' : ''}>
                      {event.kind === 'expected_income' ? '+' : '−'}{formatVnd(event.amountVnd, locale)}
                    </strong>
                    {event.isDueWithin10Days && <span className="cashflow-due-badge">{isVi ? 'Sắp đến hạn' : 'Due soon'}</span>}
                  </div>
                ))}
                {events.length > 8 && (
                  <button type="button" className="cashflow-show-more" onClick={() => setShowAllEvents(value => !value)}>
                    {showAllEvents
                      ? (isVi ? 'Thu gọn lịch' : 'Show fewer events')
                      : (isVi ? `Hiện thêm ${events.length - 8} khoản` : `Show ${events.length - 8} more events`)}
                  </button>
                )}
              </div>
            </div>

            <div className="cashflow-card">
              <div className="cashflow-card-heading">
                <div>
                  <h4>{isVi ? 'Các khoản đã khai báo' : 'Your plans'}</h4>
                  <p className="muted">{isVi ? 'Bạn có thể dừng nhắc hoặc đổi cách tính dự báo bất kỳ lúc nào.' : 'You can stop reminders or change forecast choices at any time.'}</p>
                </div>
              </div>
              <label className="cashflow-check-row cashflow-inactive-toggle">
                <input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />
                <span>{isVi ? 'Hiện kế hoạch đã tắt' : 'Show disabled plans'}</span>
              </label>
              <div className="cashflow-plan-list">
                {visiblePlans.length === 0 ? (
                  <p className="cashflow-empty">{isVi ? 'Chưa khai báo khoản cố định nào.' : 'No plans have been added yet.'}</p>
                ) : visiblePlans.map(plan => (
                  <article className={`cashflow-plan-row ${plan.isActive ? '' : 'is-disabled'}`} key={plan.id}>
                    <div className="cashflow-event-title">
                      <strong>{plan.title}</strong>
                      <span>{plan.kind === 'expected_income' ? (isVi ? 'Thu dự kiến' : 'Expected income') : (isVi ? 'Khoản phải trả' : 'Planned bill')} · {plan.frequency === 'monthly' ? (isVi ? 'Hàng tháng' : 'Monthly') : (isVi ? 'Một lần' : 'Once')}</span>
                    </div>
                    <strong>{formatVnd(plan.amountVnd, locale)}</strong>
                    {plan.isActive && plan.kind === 'obligation' && (
                      <label className="cashflow-reserve-toggle">
                        <input type="checkbox" checked={plan.reserveInForecast} disabled={busy} onChange={event => void updatePlan(plan, { reserveInForecast: event.target.checked })} />
                        <span>{isVi ? 'Tính trước' : 'Include'}</span>
                      </label>
                    )}
                    {plan.isActive && confirmDisablePlanId === plan.id ? (
                      <div className="cashflow-inline-confirm" role="group" aria-live="polite" aria-label={isVi ? `Xác nhận tắt ${plan.title}` : `Confirm turning off ${plan.title}`}>
                        <p>{isVi
                          ? `Tắt “${plan.title}” khỏi nhắc nhở và dự báo?`
                          : `Turn off “${plan.title}” reminders and forecasts?`}</p>
                        <div className="cashflow-inline-actions">
                          <button ref={cancelDisableRef} type="button" className="secondary-button" disabled={busy} onClick={() => closeDisableConfirmation(plan.id)}>
                            {isVi ? 'Giữ lại' : 'Keep it'}
                          </button>
                          <button type="button" className="primary-button cashflow-confirm-button" disabled={busy} onClick={() => {
                            setConfirmDisablePlanId(null);
                            void updatePlan(plan, { isActive: false });
                          }}>
                            {isVi ? 'Xác nhận tắt' : 'Turn off'}
                          </button>
                        </div>
                      </div>
                    ) : plan.isActive ? (
                      <button
                        ref={element => {
                          if (element) disableButtonRefs.current.set(plan.id, element);
                          else disableButtonRefs.current.delete(plan.id);
                        }}
                        type="button"
                        className="cashflow-text-button"
                        disabled={busy}
                        onClick={() => {
                          setPlanMessage('');
                          setConfirmDisablePlanId(plan.id);
                        }}
                      >
                        {isVi ? 'Tắt nhắc' : 'Turn off reminder'}
                      </button>
                    ) : (
                      <button type="button" className="cashflow-text-button" disabled={busy} onClick={() => void updatePlan(plan, { isActive: true })}>
                        {isVi ? 'Bật lại' : 'Turn back on'}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>

          {forecast.walletStatus === 'initialized' && (
            <div className="cashflow-what-if-card">
              <div>
                <h4>{isVi ? 'Thử một khoản chi trước khi ghi' : 'Preview a payment before recording it'}</h4>
                <p className="muted">{isVi ? 'So sánh kịch bản giả định với kế hoạch hiện tại. Kết quả không lưu giao dịch và không quyết định thay bạn.' : 'Compare a hypothetical payment with your current plan. This does not save a transaction or decide for you.'}</p>
              </div>
              <form className="cashflow-what-if-form" onSubmit={runWhatIf}>
                <label>
                  <span>{isVi ? 'Số tiền (VND)' : 'Amount (VND)'}</span>
                  <input type="number" min="1" step="1" inputMode="numeric" value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} required />
                </label>
                <label>
                  <span>{isVi ? 'Ngày dự định chi' : 'Planned payment date'}</span>
                  <input type="date" min={forecast.asOfDate} max={forecast.endDate} value={paymentDate} onChange={event => setPaymentDate(event.target.value)} required />
                </label>
                <button type="submit" className="secondary-button" disabled={whatIfBusy || !paymentAmount || !paymentDate}>
                  {whatIfBusy ? (isVi ? 'Đang tính…' : 'Calculating…') : (isVi ? 'Xem thử' : 'Preview')}
                </button>
              </form>
              {whatIf && (
                <div className="cashflow-scenario" role="status" aria-live="polite">
                  <p>{isVi ? 'Số dư dự kiến cuối kỳ' : 'Projected end balance'}: <strong>{formatVnd(whatIf.baselineProjectedWalletBalanceVnd, locale)}</strong> → <strong>{formatVnd(whatIf.scenarioProjectedWalletBalanceVnd, locale)}</strong></p>
                  <p>{isVi ? 'Mức thấp nhất trong kỳ' : 'Lowest projected balance'}: <strong>{formatVnd(whatIf.baselineLowestProjectedWalletBalanceVnd, locale)}</strong> → <strong>{formatVnd(whatIf.scenarioLowestProjectedWalletBalanceVnd, locale)}</strong></p>
                </div>
              )}
            </div>
          )}

          {reflection && (
            <details className="cashflow-reflection">
              <summary>{isVi ? `Tháng trước: kế hoạch và khoản đã ghi (${reflection.month})` : `Last month: plans and recorded entries (${reflection.month})`}</summary>
              <p className="muted">
                {isVi
                  ? 'Tổng khoản đã ghi trong sổ được so với tổng kế hoạch. Đây không phải đối chiếu từng hóa đơn; dữ liệu chưa ghi nhận không được coi là bằng 0.'
                  : 'Recorded totals are compared with the plan totals. This does not match individual bills, and missing entries are not treated as zero.'}
              </p>
              <div className="cashflow-reflection-grid">
                {([
                  ['income', reflection.income],
                  ['obligations', reflection.obligations],
                ] as const).map(([key, part]) => (
                  <div key={key}>
                    <strong>{key === 'income' ? (isVi ? 'Thu nhập' : 'Income') : (isVi ? 'Khoản chi' : 'Payments')}</strong>
                    <span>{isVi ? 'Kế hoạch' : 'Planned'}: {part.plannedVnd === null ? (isVi ? 'Chưa khai báo' : 'Not planned') : formatVnd(part.plannedVnd, locale)}</span>
                    <span>{isVi ? 'Đã ghi' : 'Recorded'}: {part.recordedVnd === null ? (isVi ? 'Chưa ghi nhận' : 'Not recorded') : formatVnd(part.recordedVnd, locale)}</span>
                    {part.recordedMinusPlannedVnd !== null && (
                      <span>{isVi ? 'Chênh lệch ghi nhận - kế hoạch' : 'Recorded minus planned'}: {formatVnd(part.recordedMinusPlannedVnd, locale)}</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      ) : null}
    </section>
  );
}
