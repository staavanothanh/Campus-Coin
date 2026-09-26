import { useEffect, useState } from 'react';
import { apiGet } from '../api-client.js';
import type { Category, TransactionType, Locale } from '../types.js';
import { Tag, ChevronDown } from 'lucide-react';

interface CategorySelectProps {
  appliesTo: TransactionType;
  value: string;
  onChange: (categoryId: string) => void;
  onOtherChange?: (isOther: boolean, defaultOtherId?: string) => void;
  locale: Locale;
  label: string;
  placeholder: string;
  disabled?: boolean;
}

const PRESET_CATEGORIES: Record<TransactionType, Array<{ nameEn: string; nameVi: string }>> = {
  payment: [
    { nameEn: 'Food & Dining', nameVi: 'Ăn uống' },
    { nameEn: 'Transport', nameVi: 'Di chuyển' },
    { nameEn: 'Shopping', nameVi: 'Mua sắm' },
    { nameEn: 'Rent & Utilities', nameVi: 'Nhà ở & Tiền phòng' },
    { nameEn: 'Education', nameVi: 'Học tập & Sách vở' },
    { nameEn: 'Entertainment', nameVi: 'Giải trí & Phim ảnh' },
    { nameEn: 'Healthcare & Medical', nameVi: 'Sức khỏe & Y tế' },
    { nameEn: 'Bills & Subscriptions', nameVi: 'Hóa đơn & Tiện ích' },
    { nameEn: 'Sports & Fitness', nameVi: 'Thể thao & Tập gym' },
    { nameEn: 'Savings & Investment', nameVi: 'Tiết kiệm & Đầu tư' },
    { nameEn: 'Gifts & Donations', nameVi: 'Quà tặng & Đóng góp' },
  ],
  income: [
    { nameEn: 'Salary', nameVi: 'Tiền lương' },
    { nameEn: 'Allowance', nameVi: 'Trợ cấp gia đình' },
    { nameEn: 'Scholarship', nameVi: 'Học bổng' },
    { nameEn: 'Part-time & Freelance', nameVi: 'Làm thêm & Freelance' },
    { nameEn: 'Gift & Bonus', nameVi: 'Quà tặng & Thưởng' },
    { nameEn: 'Investments & Interest', nameVi: 'Đầu tư & Tiền lãi' },
    { nameEn: 'Secondhand Sales', nameVi: 'Bán đồ cũ' },
  ]
};

export function CategorySelect({
  appliesTo,
  value,
  onChange,
  onOtherChange,
  locale,
  label,
  placeholder,
  disabled,
}: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasError(false);

    apiGet<Category[]>(`/categories?appliesTo=${appliesTo}`)
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [appliesTo]);

  const activeCategories = categories.filter((c) => c.status === 'active');

  // Identify "Other" / "Khác" category in the DB
  const dbOtherCategory = activeCategories.find((c) => {
    const vi = (c.name.vi || '').toLowerCase().trim();
    const en = (c.name.en || '').toLowerCase().trim();
    return vi === 'khác' || vi === 'khac' || en.includes('other');
  });

  const defaultOtherId = dbOtherCategory ? String(dbOtherCategory.id) : (appliesTo === 'income' ? '4' : '11');

  // Non-other DB categories
  const regularDbCategories = activeCategories.filter((c) => c.id !== dbOtherCategory?.id);

  // Combine with presets if not already in DB
  const presets = PRESET_CATEGORIES[appliesTo] || [];
  const displayItems: Array<{ id: string; label: string; isOther?: boolean }> = [];

  // Add DB categories first
  regularDbCategories.forEach((cat) => {
    displayItems.push({
      id: String(cat.id),
      label: locale === 'vi' ? (cat.name.vi || cat.name.en) : cat.name.en,
    });
  });

  // Add presets that are not already present in regular DB categories
  presets.forEach((preset) => {
    const alreadyExists = regularDbCategories.some((cat) => {
      const dbVi = (cat.name.vi || '').toLowerCase().trim();
      const dbEn = (cat.name.en || '').toLowerCase().trim();
      return dbVi === preset.nameVi.toLowerCase().trim() || dbEn === preset.nameEn.toLowerCase().trim();
    });

    if (!alreadyExists) {
      displayItems.push({
        id: `preset:${preset.nameEn}:${preset.nameVi}`,
        label: locale === 'vi' ? preset.nameVi : preset.nameEn,
      });
    }
  });

  // Always put "Khác" at the very end
  const otherLabel = locale === 'vi' ? 'Khác (Tự điền...)' : 'Other (Custom...)';
  displayItems.push({
    id: defaultOtherId,
    label: otherLabel,
    isOther: true,
  });

  const placeholderText = loading
    ? (locale === 'vi' ? 'Đang tải danh mục...' : 'Loading categories...')
    : hasError
      ? '\u26A0 ' + placeholder
      : placeholder;

  function handleSelect(selectedValue: string) {
    onChange(selectedValue);
    const isOther = selectedValue === defaultOtherId || selectedValue === 'other';
    if (onOtherChange) {
      onOtherChange(isOther, defaultOtherId);
    }
  }

  return (
    <div className="category-select-group">
      <label htmlFor="category-select-input" className="category-select-label">
        <span>{label}</span> <span className="req-dot">*</span>
      </label>
      <div className="custom-select-wrapper">
        <div className="select-left-icon" aria-hidden="true">
          <Tag size={17} />
        </div>
        <select
          id="category-select-input"
          required
          value={value}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={disabled || loading}
          aria-busy={loading}
          className="styled-category-select"
        >
          <option value="" disabled>
            {placeholderText}
          </option>
          {displayItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="select-chevron-icon" aria-hidden="true">
          <ChevronDown size={17} />
        </div>
      </div>
    </div>
  );
}
