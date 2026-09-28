import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Tag } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiRequestError } from '../api-client.js';
import type { ApiError, Category, Locale, TransactionType } from '../types.js';
import { ErrorBanner } from './ErrorBanner.js';

interface CategoryManagementPanelProps {
  locale: Locale;
  csrfToken: string;
}

interface CategoryDraft {
  nameEn: string;
  nameVi: string;
  appliesTo: TransactionType;
}

export function CategoryManagementPanel({ locale, csrfToken }: CategoryManagementPanelProps) {
  const isVi = locale === 'vi';
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [status, setStatus] = useState('');
  const [draft, setDraft] = useState<CategoryDraft>({
    nameEn: '',
    nameVi: '',
    appliesTo: 'payment',
  });
  const createRequest = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    void apiGet<Category[]>('/categories?includeDisabled=true')
      .then((data) => {
        if (mounted) setCategories(data);
      })
      .catch((requestError: unknown) => {
        if (!mounted) return;
        setError(requestError instanceof ApiRequestError
          ? requestError.apiError ?? (isVi ? 'Không tải được danh mục.' : 'Could not load categories.')
          : (isVi ? 'Không tải được danh mục.' : 'Could not load categories.'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, isVi, loadVersion]);

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (createBusy) return;

    const nameEn = draft.nameEn.trim();
    const nameVi = draft.nameVi.trim();
    if (!nameEn || !nameVi) {
      setError(isVi
        ? 'Hãy nhập tên danh mục bằng cả tiếng Việt và tiếng Anh.'
        : 'Enter the category name in both Vietnamese and English.');
      return;
    }

    const body = { nameEn, nameVi, appliesTo: draft.appliesTo };
    const signature = JSON.stringify(body);
    if (createRequest.current?.signature !== signature) {
      createRequest.current = { signature, key: crypto.randomUUID() };
    }
    setCreateBusy(true);
    setError(null);
    setStatus('');

    try {
      const category = await apiPost<Category>('/categories', body, {
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': createRequest.current.key,
      });
      setCategories((current) => [...current, category]);
      setDraft((current) => ({ ...current, nameEn: '', nameVi: '' }));
      createRequest.current = null;
      setStatus(isVi ? 'Đã tạo danh mục.' : 'Category created.');
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.isConflict) {
        setError(isVi
          ? 'Danh mục này đã tồn tại. Hãy chọn tên khác.'
          : 'This category already exists. Choose another name.');
      } else if (requestError instanceof ApiRequestError) {
        setError(requestError.apiError ?? (isVi ? 'Không tạo được danh mục.' : 'Could not create category.'));
      } else {
        setError(isVi ? 'Không tạo được danh mục.' : 'Could not create category.');
      }
    } finally {
      setCreateBusy(false);
    }
  }

  async function changeCategoryStatus(category: Category) {
    if (busyCategoryId !== null || category.isDefault || category.status === 'retired') return;

    const nextStatus = category.status === 'active' ? 'disabled' : 'active';
    setBusyCategoryId(category.id);
    setError(null);
    setStatus('');

    try {
      const updated = await apiPatch<Category>(`/categories/${encodeURIComponent(category.id)}`, {
        status: nextStatus,
      }, { 'X-CSRF-Token': csrfToken });
      setCategories((current) => current.map((item) => item.id === updated.id ? updated : item));
      setStatus(isVi
        ? (nextStatus === 'active' ? 'Đã bật lại danh mục.' : 'Đã tạm ẩn danh mục.')
        : (nextStatus === 'active' ? 'Category re-enabled.' : 'Category hidden.'));
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError
        ? requestError.apiError ?? (isVi ? 'Không cập nhật được danh mục.' : 'Could not update category.')
        : (isVi ? 'Không cập nhật được danh mục.' : 'Could not update category.'));
    } finally {
      setBusyCategoryId(null);
    }
  }

  return (
    <section className="settings-section-card category-management-panel">
      <div className="settings-section-header">
        <div className="settings-section-icon green">
          <Tag size={18} />
        </div>
        <div>
          <h3>{isVi ? 'Danh mục giao dịch' : 'Transaction categories'}</h3>
          <p className="settings-section-desc">
            {isVi
              ? 'Tạo danh mục riêng và tạm ẩn danh mục không còn dùng. Giao dịch cũ vẫn được giữ.'
              : 'Create personal categories or hide ones you no longer use. Past transactions stay unchanged.'}
          </p>
        </div>
        <button
          type="button"
          className="secondary-button category-toggle-button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? (isVi ? 'Thu gọn' : 'Close') : (isVi ? 'Quản lý' : 'Manage')}
        </button>
      </div>

      {isOpen && (
        <div className="category-management-content">
          <ErrorBanner error={error} locale={locale} />
          {status && <p className="category-status" role="status">{status}</p>}
          {loading && <p role="status">{isVi ? 'Đang tải danh mục…' : 'Loading categories…'}</p>}
          {!loading && error && categories.length === 0 && (
            <button type="button" className="secondary-button" onClick={() => setLoadVersion((value) => value + 1)}>
              {isVi ? 'Thử tải lại' : 'Retry'}
            </button>
          )}

          {!loading && categories.length > 0 && (
            <ul className="category-management-list" aria-label={isVi ? 'Danh sách danh mục' : 'Category list'}>
              {categories.map((category) => {
                const categoryName = isVi
                  ? (category.name.vi || category.name.en)
                  : (category.name.en || category.name.vi);
                const statusLabel = category.status === 'active'
                  ? (isVi ? 'Đang dùng' : 'Active')
                  : category.status === 'disabled'
                    ? (isVi ? 'Đang ẩn' : 'Hidden')
                    : (isVi ? 'Đã ngừng' : 'Retired');

                return (
                  <li className="category-management-row" key={category.id}>
                    <div className="category-management-details">
                      <strong>{categoryName}</strong>
                      <span>{category.appliesTo === 'income' ? (isVi ? 'Thu nhập' : 'Income') : (isVi ? 'Thanh toán' : 'Payment')}</span>
                      <span className="category-status-badge">{statusLabel}</span>
                      {category.isDefault && <span className="readonly-badge">{isVi ? 'Mặc định' : 'Default'}</span>}
                    </div>
                    {!category.isDefault && category.status !== 'retired' && (
                      <button
                        type="button"
                        className="secondary-button"
                        aria-label={category.status === 'active'
                          ? (isVi ? `Tạm ẩn ${categoryName}` : `Hide ${categoryName}`)
                          : (isVi ? `Bật lại ${categoryName}` : `Re-enable ${categoryName}`)}
                        disabled={busyCategoryId !== null}
                        onClick={() => void changeCategoryStatus(category)}
                      >
                        {busyCategoryId === category.id
                          ? (isVi ? 'Đang lưu…' : 'Saving…')
                          : category.status === 'active'
                            ? (isVi ? 'Tạm ẩn' : 'Hide')
                            : (isVi ? 'Bật lại' : 'Re-enable')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && categories.length === 0 && !error && (
            <p className="field-hint">{isVi ? 'Chưa có danh mục nào.' : 'No categories yet.'}</p>
          )}

          <form className="category-create-form" onSubmit={(event) => void createCategory(event)}>
            <h4>{isVi ? 'Thêm danh mục của bạn' : 'Add your category'}</h4>
            <div className="category-create-fields">
              <div className="settings-field">
                <label htmlFor="category-name-vi">{isVi ? 'Tên tiếng Việt' : 'Vietnamese name'}</label>
                <input
                  id="category-name-vi"
                  className="text-input"
                  value={draft.nameVi}
                  maxLength={80}
                  required
                  onChange={(event) => setDraft((current) => ({ ...current, nameVi: event.target.value }))}
                  disabled={createBusy}
                />
              </div>
              <div className="settings-field">
                <label htmlFor="category-name-en">{isVi ? 'Tên tiếng Anh' : 'English name'}</label>
                <input
                  id="category-name-en"
                  className="text-input"
                  value={draft.nameEn}
                  maxLength={80}
                  required
                  onChange={(event) => setDraft((current) => ({ ...current, nameEn: event.target.value }))}
                  disabled={createBusy}
                />
              </div>
              <div className="settings-field">
                <label htmlFor="category-applies-to">{isVi ? 'Dùng cho' : 'Used for'}</label>
                <select
                  id="category-applies-to"
                  className="text-input"
                  value={draft.appliesTo}
                  onChange={(event) => setDraft((current) => ({ ...current, appliesTo: event.target.value as TransactionType }))}
                  disabled={createBusy}
                >
                  <option value="payment">{isVi ? 'Thanh toán' : 'Payment'}</option>
                  <option value="income">{isVi ? 'Thu nhập' : 'Income'}</option>
                </select>
              </div>
            </div>
            <button type="submit" className="primary-button" disabled={createBusy}>
              {createBusy ? (isVi ? 'Đang tạo…' : 'Creating…') : (isVi ? 'Tạo danh mục' : 'Create category')}
            </button>
          </form>

          <p className="field-hint">
            {isVi
              ? 'Danh mục mặc định không thể sửa. Tạm ẩn chỉ ngăn chọn cho giao dịch mới; lịch sử và báo cáo cũ được giữ nguyên.'
              : 'Default categories cannot be changed. Hiding a category only removes it from new entries; history and past reports remain.'}
          </p>
        </div>
      )}
    </section>
  );
}
