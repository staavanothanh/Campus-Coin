# Quản trị và vận hành — Campus Coin

## 1. Mục tiêu và ranh giới

Admin là vai trò vận hành nhẹ: tiếp nhận report/issue, triage, cập nhật trạng thái, ghi note nội bộ và quản lý cấu hình nội dung đã được cấp quyền. Admin không là teller, không điều chỉnh số dư, không sửa/xóa ledger, không bypass payment check và không xem toàn bộ tài chính user nếu không có scope hợp lệ.

## 2. Vai trò least privilege

| Vai trò | Được phép | Không được phép |
|---|---|---|
| Support | Xem issue đã mask, hỏi thêm thông tin, cập nhật trạng thái | Xem raw ledger/balance hoặc đổi tiền |
| Ops/content | Quản lý category/copy/feature flag được cấp quyền, có version/audit | Xóa category đã tham chiếu hoặc đổi invariant |
| Security/owner | Xử lý incident, break-glass có reason/time-bound | Tắt kiểm soát để “sửa nhanh” |
| Admin | Chỉ scope được cấp và audit đầy đủ | Sửa ledger, balance, audit hoặc JEV authority |

## 3. Report/issue workflow

```text
User gửi report
  -> validate + rate limit + mask PII
  -> tạo case append-only
  -> triage priority/status
  -> assign owner
  -> note/audit
  -> resolve hoặc escalate incident
```

- `P0`: nghi IDOR, mất ledger integrity, lộ secret/PII hoặc payment/savings invariant sai; disable write path nếu cần và escalate ngay.
- `P1`: auth outage, nhiều user không tạo payment, provider failure ảnh hưởng core path.
- `P2`: lỗi trải nghiệm, copy, category hoặc report không khẩn cấp.

Report không yêu cầu password, OTP, cookie, token hoặc full ledger. Input phải validate, rate-limit và redact.

## 4. Xử lý report tài chính

Nếu user báo sai số dư, thiếu payment hoặc correction: không sửa trực tiếp. Thu thập case ID, request/correlation ID, thời điểm và dữ liệu tối thiểu; chuyển Developer B kiểm tra projection/ledger. Correction chỉ qua domain command append-only có reason và audit. Không raw SQL delete/update để sửa.

## 5. Content và setting

Category mặc định, copy cảnh báo và feature flag phải có version, owner, reason, approval và audit. Disable/retire phải giữ history. Không bật JEV bằng client flag. JEV luôn default-off và không có money authority.

## 6. Audit và privacy

Audit append-only tối thiểu ghi actor, scope, target, action, reason, request/correlation ID, outcome và timestamp. Không ghi password, OTP, cookie, token, OAuth code, secret, raw JEV prompt/response hoặc financial detail không cần thiết. Break-glass cần reason, approval, time limit và review.

## 7. Incident và rollback

- **Auth/IDOR:** chặn access, revoke session, preserve evidence, escalate Developer A.
- **Ledger/payment/savings:** chuyển read-only hoặc disable write; không xóa row; reconcile từ immutable ledger.
- **JEV/privacy/cost:** tắt JEV trước; manual picker vẫn phải hoạt động.
- **DB/deploy:** dùng known-good deployment và runbook restore; Team Leader quyết định rollback/NO-GO.

## 8. Metrics

Chỉ thu aggregate cần cho vận hành: issue counts, auth failures, payment rejection, latency, JEV fallback/cost bucket, restore result và error rate. Không hiển thị tổng tiền của mọi user như một tính năng admin mặc định.

## 9. Tiêu chí chấp nhận

1. Admin triage/assign/status/note được issue mà không sửa ledger.
2. Report không yêu cầu secret và được mask/rate-limit.
3. Admin API server-enforce 403 và least privilege.
4. Category/content changes có version/audit và không phá history.
5. Payment/savings anomaly có incident path append-only/read-only.
6. JEV/email/provider lỗi không làm hỏng money path.

## 10. Ngoài phạm vi

Admin sửa/xóa transaction, đổi balance, bypass payment, xóa audit, đọc toàn bộ tài chính user, đọc Gmail, dùng Gmail cá nhân, hoặc trao autonomous money authority cho JEV.
