import assert from 'node:assert/strict';
import test from 'node:test';
import { formatVnd, hcmDateTimeLocal, hcmDateTimeToIso, hcmMonthKey } from '../src/features/domain/domain.format.ts';

test('tháng báo cáo dùng múi giờ Hồ Chí Minh', () => {
  assert.equal(hcmMonthKey(new Date('2026-12-31T17:30:00.000Z')), '2027-01');
});

test('ô thời gian hiển thị giờ Hồ Chí Minh và gửi instant tương ứng', () => {
  const date = new Date('2026-09-27T04:15:00.000Z');
  assert.equal(hcmDateTimeLocal(date), '2026-09-27T11:15');
  assert.equal(hcmDateTimeToIso('2026-09-27T11:15'), '2026-09-27T04:15:00.000Z');
});

test('từ chối ngày giờ không tồn tại thay vì tự đổi sang ngày khác', () => {
  assert.throws(() => hcmDateTimeToIso('2026-02-30T11:15'));
  assert.throws(() => hcmDateTimeToIso('2026-09-27T25:15'));
});

test('định dạng VND không tạo phần thập phân', () => {
  assert.equal(formatVnd(15000, 'vi'), new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(15000));
  assert.equal(formatVnd(15000, 'en'), new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(15000));
});
