import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, type User } from '../auth/auth.api';
import { errorText, type Language } from '../../app/text';
import { domainErrorText, domainText } from './domain.text';
import { domainApi, type Budget, type BudgetSummary, type Category, type Dashboard, type MonthlyReport, type Transaction, type TransactionType } from './domain.api';
import { formatVnd, hcmDateTimeLocal, hcmDateTimeToIso, hcmMonthKey } from './domain.format';

type View = 'overview' | 'history' | 'report';

interface Props {
  user: User;
  language: Language;
  googleEnabled: boolean;
  googleLinked: boolean;
  authBusy: boolean;
  authMessage: string;
  authMessageKind: 'error' | 'status';
  onLogout: () => void;
  onConnectGoogle: () => void;
  onSessionExpired: () => void;
}

export function DomainDashboard(props: Props) {
  const { user, language, googleEnabled, googleLinked, authBusy, authMessage, authMessageKind } = props;
  const t = domainText[language];
  const [view, setView] = useState<View>('overview');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(authMessage);
  const [error, setError] = useState(authMessageKind === 'error' ? authMessage : '');
  const [entryType, setEntryType] = useState<TransactionType>('payment');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => hcmDateTimeLocal());
  const [description, setDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [savingsDirection, setSavingsDirection] = useState<'deposit' | 'withdraw'>('deposit');
  const [savingsAmount, setSavingsAmount] = useState('');
  const [savingsNote, setSavingsNote] = useState('');
  const [history, setHistory] = useState<Transaction[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => hcmMonthKey());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetCategoryId, setBudgetCategoryId] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportLoadFailed, setReportLoadFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reportRequestId = useRef(0);
  const transactionKey = useRef('');
  const baselineKey = useRef('');
  const savingsKey = useRef('');
  const budgetKey = useRef('');

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (authMessage) {
      setNotice(authMessage);
      setError(authMessageKind === 'error' ? authMessage : '');
    }
  }, [authMessage, authMessageKind]);

  function handleError(problem: unknown) {
    if (problem instanceof ApiError && problem.status === 401) {
      props.onSessionExpired();
      return;
    }
    if (problem instanceof ApiError) {
      const domainMessage = domainErrorText(problem.code, language);
      if (domainMessage) {
        setNotice(domainMessage);
        setError(domainMessage);
        return;
      }
      const authMessage = errorText[language][problem.code];
      const message = problem.status >= 500 ? t.serverError : authMessage || t.genericError;
      setNotice(message);
      setError(message);
      return;
    }
    setNotice(t.genericError);
    setError(t.genericError);
  }

  async function loadDashboard() {
    setError('');
    setLoading(true);
    try {
      const [nextDashboard, nextCategories] = await Promise.all([
        domainApi.getDashboard(),
        domainApi.getCategories(),
      ]);
      setDashboard(nextDashboard);
      setCategories(nextCategories);
    } catch (problem) {
      handleError(problem);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(cursor?: string, append = false) {
    setError('');
    setHistoryLoadFailed(false);
    setHistoryBusy(true);
    try {
      const result = await domainApi.getTransactions(cursor);
      setHistory(current => append ? [...current, ...result.data] : result.data);
      setHistoryCursor(result.meta.cursor);
      setHasMoreHistory(result.meta.hasNext);
    } catch (problem) {
      setHistoryLoadFailed(true);
      handleError(problem);
    } finally {
      setHistoryBusy(false);
    }
  }

  async function loadReport(month: string) {
    const requestId = reportRequestId.current + 1;
    reportRequestId.current = requestId;
    setError('');
    setReportLoadFailed(false);
    setReportBusy(true);
    try {
      const [nextReport, nextBudgets, nextBudgetSummary] = await Promise.all([
        domainApi.getMonthlyReport(month),
        domainApi.getBudgets(month),
        domainApi.getBudgetSummary(month),
      ]);
      if (requestId === reportRequestId.current) {
        setReport(nextReport);
        setBudgets(nextBudgets);
        setBudgetSummary(nextBudgetSummary);
      }
    } catch (problem) {
      if (requestId === reportRequestId.current) {
        setReportLoadFailed(true);
        handleError(problem);
        setReport(null);
        setBudgets([]);
        setBudgetSummary(null);
      }
    } finally {
      if (requestId === reportRequestId.current) setReportBusy(false);
    }
  }

  async function refreshCurrentView() {
    const requests = [loadDashboard()];
    if (view === 'history') requests.push(loadHistory());
    if (view === 'report' && dashboard?.wallet) requests.push(loadReport(reportMonth));
    await Promise.all(requests);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (view === 'history') void loadHistory();
  }, [view]);

  useEffect(() => {
    if (view === 'report' && dashboard?.wallet) void loadReport(reportMonth);
  }, [view, reportMonth, dashboard?.wallet]);

  const matchingCategories = categories.filter(category => category.appliesTo === entryType && category.status === 'active');
  const paymentCategories = categories.filter(category => category.appliesTo === 'payment' && category.status === 'active');

  useEffect(() => {
    if (!matchingCategories.some(category => category.id === categoryId)) {
      setCategoryId(matchingCategories[0]?.id || '');
    }
  }, [categories, entryType, categoryId]);

  useEffect(() => {
    if (!paymentCategories.some(category => category.id === budgetCategoryId)) {
      setBudgetCategoryId(paymentCategories[0]?.id || '');
    }
  }, [categories, budgetCategoryId]);

  useEffect(() => {
    const existing = budgets.find(item => item.categoryId === budgetCategoryId);
    setBudgetLimit(existing ? String(existing.limitVnd) : '');
  }, [budgetCategoryId, budgets]);

  function nameForCategory(id: string) {
    const category = categories.find(item => item.id === id);
    return category?.name[language] || category?.name.en || id;
  }

  async function initializeWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const balance = Number(initialBalance);
    if (!Number.isSafeInteger(balance) || balance < 0) {
      setError(t.amountInvalid);
      setNotice(t.amountInvalid);
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    if (!baselineKey.current) baselineKey.current = crypto.randomUUID();
    try {
      await domainApi.initializeWallet(balance, baselineKey.current);
      baselineKey.current = '';
      setNotice(t.initialized);
      setInitialBalance('');
      await loadDashboard();
    } catch (problem) {
      if (problem instanceof ApiError && problem.code === 'WALLET_ALREADY_INITIALIZED') {
        handleError(problem);
        await loadDashboard();
        return;
      }
      handleError(problem);
    } finally {
      setBusy(false);
    }
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountVnd = Number(amount);
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) {
      setError(t.amountInvalid);
      setNotice(t.amountInvalid);
      return;
    }
    if (!categoryId) {
      setError(t.requiredCategory);
      setNotice(t.requiredCategory);
      return;
    }

    let occurredAtIso: string;
    try {
      occurredAtIso = hcmDateTimeToIso(occurredAt);
    } catch {
      setError(t.dateInvalid);
      setNotice(t.dateInvalid);
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    if (!transactionKey.current) transactionKey.current = crypto.randomUUID();
    try {
      const result = await domainApi.createTransaction({
        type: entryType,
        amountVnd,
        categoryId,
        occurredAt: occurredAtIso,
        description: description.trim(),
      }, transactionKey.current);
      transactionKey.current = '';
      setAmount('');
      setDescription('');
      setOccurredAt(hcmDateTimeLocal());
      setNotice(entryType === 'payment' && result.budgetWarning.isOverrun ? t.transactionOverrun : t.saved);
      await loadDashboard();
      if (view === 'history') await loadHistory();
      if (view === 'report') await loadReport(reportMonth);
    } catch (problem) {
      handleError(problem);
    } finally {
      setBusy(false);
    }
  }

  async function saveSavingsTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountVnd = Number(savingsAmount);
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) {
      setError(t.amountInvalid);
      setNotice(t.amountInvalid);
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    if (!savingsKey.current) savingsKey.current = crypto.randomUUID();
    try {
      await domainApi.createSavingsTransfer({
        direction: savingsDirection,
        amountVnd,
        note: savingsNote.trim(),
      }, savingsKey.current);
      savingsKey.current = '';
      setSavingsAmount('');
      setSavingsNote('');
      setNotice(t.transferSaved);
      await loadDashboard();
    } catch (problem) {
      handleError(problem);
    } finally {
      setBusy(false);
    }
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limitVnd = Number(budgetLimit);
    if (!budgetCategoryId || !Number.isSafeInteger(limitVnd) || limitVnd < 0) {
      setError(t.amountInvalid);
      setNotice(t.amountInvalid);
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    if (!budgetKey.current) budgetKey.current = crypto.randomUUID();
    try {
      await domainApi.upsertBudget(budgetCategoryId, reportMonth, limitVnd, budgetKey.current);
      budgetKey.current = '';
      setNotice(t.budgetSaved);
      await loadReport(reportMonth);
    } catch (problem) {
      handleError(problem);
    } finally {
      setBusy(false);
    }
  }

  function changeTransaction(setter: (value: string) => void, value: string) {
    transactionKey.current = '';
    setter(value);
  }

  function transactionLabel(type: TransactionType) {
    return type === 'income' ? t.income : t.payment;
  }

  function formattedDate(value: string) {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }

  function transactionRows(rows: Transaction[]) {
    return rows.map(item => <tr key={item.id}>
      <td><time dateTime={item.occurredAt}>{formattedDate(item.occurredAt)}</time></td>
      <td><span className={`typeMark typeMark-${item.type}`}>
        {transactionLabel(item.type)}{item.role === 'original' ? '' : ` · ${t.roleCorrection}`}
      </span></td>
      <td>{nameForCategory(item.categoryId)}{item.description ? <small className="rowNote">{item.description}</small> : null}</td>
      <td className="moneyCell">{formatVnd(item.amountVnd, language)}</td>
    </tr>);
  }

  return <section className="domainShell" aria-labelledby="domain-title">
    <header className="domainHeader">
      <div>
        <p className="eyebrow">{t.welcome}</p>
        <h1 id="domain-title" ref={headingRef} tabIndex={-1}>{t.hello}, {user.displayName}</h1>
        <p className="accountEmail">{user.email}</p>
      </div>
      <div className="accountActions">
        {googleLinked
          ? <span className="connectedMark" role="status">{t.googleConnected}</span>
          : googleEnabled && <button className="quietButton" type="button" disabled={authBusy || busy} onClick={props.onConnectGoogle}>{t.connectGoogle}</button>}
        <button className="quietButton" type="button" disabled={authBusy || busy} onClick={props.onLogout}>{t.logout}</button>
      </div>
    </header>

    <nav className="domainNav" aria-label={t.mainNavigation}>
      {(['overview', 'history', 'report'] as const).map(item => <button
        key={item}
        type="button"
        className={view === item ? 'domainNavActive' : ''}
        disabled={busy}
        aria-current={view === item ? 'page' : undefined}
        onClick={() => { setView(item); setNotice(''); setError(''); }}
      >{t[item]}</button>)}
      <button type="button" className="refreshButton" title={t.reload} disabled={busy || loading || historyBusy || reportBusy} onClick={() => void refreshCurrentView()}>{t.reload}</button>
    </nav>

    {notice && <p className={error ? 'domainAlert' : 'domainNotice'} role={error ? 'alert' : 'status'}>{notice}</p>}
    {loading
      ? <p className="stateText" role="status">{t.loading}</p>
      : error && !dashboard
        ? <section className="statePanel"><p role="alert">{t.loadError}</p><button className="quietButton" type="button" onClick={() => void loadDashboard()}>{t.retry}</button></section>
        : !dashboard?.wallet
          ? <section className="startPanel">
            <p className="eyebrow">{t.currentMonth}</p>
            <h2>{t.setOpening}</h2>
            <p>{t.openingHint}</p>
            <form className="domainForm startForm" onSubmit={initializeWallet}>
              <label>{t.openingBalance}
                <input type="number" min="0" step="1" inputMode="numeric" value={initialBalance} onChange={event => { baselineKey.current = ''; setInitialBalance(event.target.value); }} required disabled={busy} />
              </label>
              <button className="primaryButton" type="submit" disabled={busy}>{busy ? t.saving : t.initialize}</button>
            </form>
          </section>
          : view === 'overview'
            ? <>
              <div className="balanceStrip">
                <div>
                  <p className="eyebrow">{t.balance}</p>
                  <p className="balanceValue">{formatVnd(dashboard.wallet.availableBalanceVnd, language)}</p>
                </div>
                {dashboard.savings && <div className="savingsValue"><span>{t.savings}</span><strong>{formatVnd(dashboard.savings.balanceVnd, language)}</strong></div>}
              </div>
              {dashboard.currentMonth && <div className="summaryLine" aria-label={t.currentMonth}>
                <div><span>{t.opening}</span><strong>{formatVnd(dashboard.currentMonth.openingWalletBalanceVnd, language)}</strong></div>
                <div><span>{t.income}</span><strong className="positiveMoney">+{formatVnd(dashboard.currentMonth.totalIncomeVnd, language)}</strong></div>
                <div><span>{t.payment}</span><strong className="negativeMoney">−{formatVnd(dashboard.currentMonth.totalPaymentVnd, language)}</strong></div>
                <div><span>{t.closing}</span><strong>{formatVnd(dashboard.currentMonth.closingWalletBalanceVnd, language)}</strong></div>
              </div>}

              <div className="domainColumns">
                <section className="entrySection" aria-labelledby="entry-title">
                  <h2 id="entry-title">{t.addTransaction}</h2>
                  <form className="domainForm" onSubmit={saveTransaction}>
                    <fieldset className="typeChoices" disabled={busy}>
                      <legend>{t.transactionType}</legend>
                      <label className={entryType === 'income' ? 'choiceActive choiceIncome' : ''}>
                        <input type="radio" name="transaction-type" value="income" checked={entryType === 'income'} onChange={() => { transactionKey.current = ''; setEntryType('income'); }} />
                        {t.income}
                      </label>
                      <label className={entryType === 'payment' ? 'choiceActive choicePayment' : ''}>
                        <input type="radio" name="transaction-type" value="payment" checked={entryType === 'payment'} onChange={() => { transactionKey.current = ''; setEntryType('payment'); }} />
                        {t.payment}
                      </label>
                    </fieldset>
                    <label>{t.amount}
                      <input type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={event => changeTransaction(setAmount, event.target.value)} required disabled={busy} />
                    </label>
                    <label>{t.category}
                      <select value={categoryId} onChange={event => changeTransaction(setCategoryId, event.target.value)} required disabled={busy || matchingCategories.length === 0}>
                        {matchingCategories.length === 0 && <option value="">{t.emptyCategory}</option>}
                        {matchingCategories.map(category => <option key={category.id} value={category.id}>{category.name[language] || category.name.en}</option>)}
                      </select>
                    </label>
                    <label>{t.occurredAt}
                      <input type="datetime-local" value={occurredAt} onChange={event => changeTransaction(setOccurredAt, event.target.value)} required disabled={busy} />
                    </label>
                    <label>{t.description}
                      <input type="text" maxLength={500} value={description} placeholder={t.descriptionHint} onChange={event => changeTransaction(setDescription, event.target.value)} disabled={busy} />
                    </label>
                    <button className="primaryButton" type="submit" disabled={busy || matchingCategories.length === 0}>{busy ? t.saving : t.save}</button>
                  </form>
                </section>

                <section className="recentSection" aria-labelledby="recent-title">
                  <div className="sectionHeading"><h2 id="recent-title">{t.recentTransactions}</h2><button className="inlineButton" type="button" disabled={busy} onClick={() => setView('history')}>{t.history}</button></div>
                  {dashboard.recentTransactions.length === 0
                    ? <p className="emptyState">{t.noTransactions}</p>
                    : <div className="tableScroll"><table className="moneyTable"><caption className="visuallyHidden">{t.tableCaption}</caption><thead><tr><th>{t.date}</th><th>{t.type}</th><th>{t.category}</th><th>{t.amountColumn}</th></tr></thead><tbody>{transactionRows(dashboard.recentTransactions)}</tbody></table></div>}
                  {dashboard.savings && <section className="savingsEntry" aria-labelledby="savings-title">
                    <h2 id="savings-title">{t.moveSavings}</h2>
                    <p className="savingsBalance">{t.savings}: <strong>{formatVnd(dashboard.savings.balanceVnd, language)}</strong></p>
                    <form className="domainForm" onSubmit={saveSavingsTransfer}>
                      <fieldset className="typeChoices" disabled={busy}>
                        <legend>{t.transfer}</legend>
                        <label className={savingsDirection === 'deposit' ? 'choiceActive choiceIncome' : ''}>
                          <input type="radio" name="savings-direction" checked={savingsDirection === 'deposit'} onChange={() => { savingsKey.current = ''; setSavingsDirection('deposit'); }} />{t.deposit}
                        </label>
                        <label className={savingsDirection === 'withdraw' ? 'choiceActive choicePayment' : ''}>
                          <input type="radio" name="savings-direction" checked={savingsDirection === 'withdraw'} onChange={() => { savingsKey.current = ''; setSavingsDirection('withdraw'); }} />{t.withdraw}
                        </label>
                      </fieldset>
                      <label>{t.amount}
                        <input type="number" min="1" step="1" inputMode="numeric" value={savingsAmount} onChange={event => { savingsKey.current = ''; setSavingsAmount(event.target.value); }} required disabled={busy} />
                      </label>
                      <label>{t.description}
                        <input type="text" maxLength={500} value={savingsNote} onChange={event => { savingsKey.current = ''; setSavingsNote(event.target.value); }} disabled={busy} />
                      </label>
                      <button className="primaryButton" type="submit" disabled={busy}>{busy ? t.saving : t.transfer}</button>
                    </form>
                  </section>}
                </section>
              </div>
            </>
            : view === 'history'
              ? <section className="tableSection" aria-labelledby="history-title">
                <div className="sectionHeading"><div><p className="eyebrow">{t.allTransactions}</p><h2 id="history-title">{t.history}</h2></div><button className="quietButton" type="button" disabled={historyBusy} onClick={() => void loadHistory()}>{t.reload}</button></div>
                {historyLoadFailed && <section className="statePanel"><p role="alert">{t.loadError}</p><button className="quietButton" type="button" disabled={historyBusy} onClick={() => void loadHistory()}>{t.retry}</button></section>}
                {!historyLoadFailed && historyBusy && history.length === 0
                  ? <p className="stateText" role="status">{t.loading}</p>
                  : !historyLoadFailed && history.length === 0
                    ? <p className="emptyState">{t.noTransactions}</p>
                    : history.length > 0 && <div className="tableScroll"><table className="moneyTable"><caption className="visuallyHidden">{t.tableCaption}</caption><thead><tr><th>{t.date}</th><th>{t.type}</th><th>{t.category}</th><th>{t.amountColumn}</th></tr></thead><tbody>{transactionRows(history)}</tbody></table></div>}
                {hasMoreHistory && <button className="loadMoreButton" type="button" disabled={historyBusy} onClick={() => void loadHistory(historyCursor || undefined, true)}>{historyBusy ? t.loading : t.loadMore}</button>}
              </section>
              : <section className="reportSection" aria-labelledby="report-title">
                <div className="sectionHeading reportHeading"><div><p className="eyebrow">{t.currentMonth}</p><h2 id="report-title">{t.report}</h2></div><label className="monthPicker">{t.chooseMonth}<input type="month" value={reportMonth} disabled={busy} onChange={event => {
                  const nextMonth = event.target.value;
                  if (nextMonth && nextMonth !== reportMonth) {
                    budgetKey.current = '';
                    reportRequestId.current += 1;
                    setReport(null);
                    setBudgets([]);
                    setBudgetSummary(null);
                    setReportLoadFailed(false);
                    setReportBusy(true);
                    setReportMonth(nextMonth);
                  }
                }} /></label></div>
                {reportBusy
                  ? <p className="stateText" role="status">{t.loading}</p>
                  : reportLoadFailed
                    ? <section className="statePanel"><p role="alert">{t.loadError}</p><button className="quietButton" type="button" onClick={() => void loadReport(reportMonth)}>{t.retry}</button></section>
                  : report
                    ? <>
                      <div className="reportTotals">
                        <div><span>{t.opening}</span><strong>{formatVnd(report.openingWalletBalanceVnd, language)}</strong></div>
                        <div><span>{t.income}</span><strong className="positiveMoney">{formatVnd(report.totalIncomeVnd, language)}</strong></div>
                        <div><span>{t.payment}</span><strong className="negativeMoney">{formatVnd(report.totalPaymentVnd, language)}</strong></div>
                        <div><span>{t.closing}</span><strong>{formatVnd(report.closingWalletBalanceVnd, language)}</strong></div>
                      </div>
                      <section className="budgetSection" aria-labelledby="budget-title">
                        <div className="sectionHeading"><h3 id="budget-title">{t.budgetTitle}</h3>{budgetSummary && <span>{budgetSummary.exceededCategoryCount} {t.budgetOverrunCount}</span>}</div>
                        <form className="budgetForm" onSubmit={saveBudget}>
                          <h4>{t.setBudget}</h4>
                          <label>{t.category}
                            <select value={budgetCategoryId} disabled={busy || paymentCategories.length === 0} onChange={event => {
                              budgetKey.current = '';
                              setBudgetCategoryId(event.target.value);
                              const existing = budgets.find(item => item.categoryId === event.target.value);
                              setBudgetLimit(existing ? String(existing.limitVnd) : '');
                            }}>
                              {paymentCategories.length === 0 && <option value="">{t.emptyCategory}</option>}
                              {paymentCategories.map(category => <option key={category.id} value={category.id}>{category.name[language] || category.name.en}</option>)}
                            </select>
                          </label>
                          <label>{t.budgetLimit}
                            <input type="number" min="0" step="1" inputMode="numeric" value={budgetLimit} onChange={event => { budgetKey.current = ''; setBudgetLimit(event.target.value); }} required disabled={busy} />
                          </label>
                          <button className="quietButton" type="submit" disabled={busy || paymentCategories.length === 0}>{busy ? t.saving : t.saveBudget}</button>
                        </form>
                        {budgets.length === 0
                          ? <p className="emptyState">{t.noBudgets}</p>
                          : <ul className="budgetList">{budgets.map(item => {
                            const progress = item.limitVnd === 0
                              ? item.isOverrun ? 100 : 0
                              : Math.min(100, Math.round(item.usedVnd / item.limitVnd * 100));
                            return <li key={item.categoryId}>
                              <div className="budgetRow"><strong>{nameForCategory(item.categoryId)}</strong><span>{formatVnd(item.usedVnd, language)} / {formatVnd(item.limitVnd, language)}</span></div>
                              <progress aria-label={`${nameForCategory(item.categoryId)}: ${t.budgetTotal}`} max="100" value={progress} />
                              <small className={item.isOverrun ? 'budgetOverrun' : 'budgetWithin'}>{item.isOverrun ? t.exceeded : t.withinBudget}</small>
                            </li>;
                          })}</ul>}
                      </section>
                      <section className="budgetSection" aria-labelledby="category-breakdown-title">
                        <h3 id="category-breakdown-title">{t.categoryBreakdown}</h3>
                        {report.categoryBreakdown.length === 0
                          ? <p className="emptyState">{t.noTransactions}</p>
                          : <div className="tableScroll"><table className="moneyTable"><caption className="visuallyHidden">{t.categoryBreakdown}</caption><thead><tr><th>{t.category}</th><th>{t.amountColumn}</th></tr></thead><tbody>{report.categoryBreakdown.map(row => <tr key={row.categoryId}><td>{nameForCategory(row.categoryId)}</td><td className="moneyCell">{formatVnd(row.amountVnd, language)}</td></tr>)}</tbody></table></div>}
                      </section>
                    </>
                    : <p className="emptyState">{t.noReport}</p>}
              </section>}
  </section>;
}
