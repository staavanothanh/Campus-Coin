# ADMIN-OPERATIONS — Quản trị và vận hành

## 1. Mục tiêu

Admin của Campus Coin là vai trò vận hành nhẹ: tiếp nhận và xử lý report/issue về trải nghiệm app, theo dõi trạng thái, ghi note nội bộ và quản lý một số cấu hình nội dung/setting được phê duyệt. Admin không phải teller, không điều chỉnh số dư, không sửa lịch sử `income`/`payment`, không truy cập tài chính rộng hơn nhu cầu xử lý.

App vẫn là sản phẩm quản lý thu nhập và thanh toán của sinh viên; admin console không biến sản phẩm thành ngân hàng, lending, BNPL hay payment operation.

## 2. Vai trò và least privilege

| Vai trò | Quyền | Không được |
|---|---|---|
| `user` | Tạo/xem dữ liệu của mình; quản lý category/budget/savings theo domain; gửi report | Xem user khác; sửa/xóa ledger history; bypass ví |
| `support_admin` | Đọc queue report đã mask; đổi status/priority; ghi note; phản hồi template được duyệt | Xem raw ledger/số dư mặc định; sửa financial data; cấp role |
| `content_admin` | Quản lý template/thông báo/danh mục mặc định theo version và approval; xem metrics tổng hợp | Sửa transaction/category reference lịch sử; truy cập PII không cần |
| `ops_admin` | Quản lý setting vận hành, feature flag, job retry/incident theo audit; xem metadata masked | Xóa audit, thay đổi money rules trực tiếp, dùng JEV để authorize |
| `admin_owner` | Quản lý role/approval/break-glass theo quy trình | Không được bỏ qua append-only/audit hoặc tự phê duyệt hành động nhạy cảm |

MVP có thể gộp support/content/ops vào một admin account giới hạn, nhưng permission phải tách ở API và audit như các scope độc lập. Deny-by-default; không tin role do client gửi.

## 3. Report/issue workflow

```text
User gửi report
  -> validate + rate limit + redact/PII warning
  -> tạo case (new)
  -> triage: priority/category/owner (triaged)
  -> điều tra tối thiểu, note nội bộ (investigating)
  -> phản hồi/sửa content/config hoặc liên kết incident (resolved)
  -> user xác nhận/timeout (closed)
```

Trạng thái tối thiểu: `new`, `triaged`, `investigating`, `waiting_user`, `resolved`, `closed`, `reopened`, `spam`. Mọi chuyển trạng thái ghi actor, timestamp, reason và correlation ID. Không xóa case; spam/PII cần redact theo retention và giữ audit event.

Report form nên có loại issue, mô tả tiếng Việt, bước tái hiện, thiết bị/browser tùy chọn và consent đính kèm screenshot. Không yêu cầu user gửi password, OTP, cookie, token hoặc toàn bộ ledger. Nếu user tự dán secret, admin phải mask/redact và trigger security handling.

### Triage

- `P0`: nghi ngờ unauthorized access, mất toàn vẹn ledger, lộ secret/PII hoặc payment/savings invariant sai; khóa workflow liên quan nếu cần, escalation security/owner ngay.
- `P1`: nhiều user không tạo payment, auth outage, email reset hỏng, JEV gây output nguy hiểm; owner và incident note.
- `P2`: lỗi chức năng giới hạn, report/notification sai, category/budget UX.
- `P3`: câu hỏi, copy, enhancement, cosmetic.

Severity không tự cấp quyền xem financial detail. Khi điều tra, dùng event ID/aggregate metric và dữ liệu synthetic trước; break-glass phải có lý do, approval và thời hạn.

## 4. Xử lý report tài chính an toàn

Nếu report nói sai số dư, thiếu payment hoặc correction:

1. Support admin xác nhận case và xin thông tin tối thiểu (case ID, thời điểm, message lỗi), không yêu cầu export đầy đủ.
2. Kiểm tra audit/transaction metadata đã mask hoặc chuyển owner có scope financial-support riêng; không SQL update/delete.
3. Chạy đối soát domain/projection từ ledger immutable; nếu sai thật, mở correction/incident workflow có approval.
4. Correction luôn append-only, reason + actor + original reference; user được thông báo ngắn gọn.
5. Đóng case chỉ khi acceptance/reconciliation evidence được lưu.

Admin không được “sửa cho khớp” bằng cách đổi amount/category/date của bản ghi cũ. Không dùng JEV để xác định bản ghi đúng.

## 5. Content và operational settings

Content admin có thể version hóa danh mục mặc định, template email/notification, copy cảnh báo budget và feature flags được phép. Thay đổi phải:

- Có schema/preview, Vietnamese copy review và effective time.
- Không thay đổi enum `income`/`payment`, công thức money hoặc ranh giới savings.
- Không xóa category có historical FK; disable/retire theo domain policy.
- Có audit before/after metadata, người phê duyệt và rollback version an toàn.
- Không dùng template để quảng cáo ngân hàng, vay, BNPL/pay-later hoặc tư vấn tài chính được chứng nhận.

## 6. Audit và dữ liệu admin

Audit event append-only tối thiểu cho: login/admin role change, report state/note, break-glass access, content setting change, correction request/approval, JEV job retry, email resend và export. Record actor, scope, target type/id, action, reason, request/correlation ID, result và timestamp theo `Asia/Ho_Chi_Minh` khi hiển thị.

Không ghi password, OTP, session cookie, Google token, JEV secret hoặc raw personal description vào admin note/log. Financial detail mặc định masked/aggregated; access cụ thể cần scope, justification và time limit. Retention, deletion/redaction theo policy nhưng không xóa audit cần thiết để giữ chain-of-custody.

## 7. Incident và vận hành

- **Auth/email:** kiểm tra provider status, rate limit, queue; không tắt security control để “gửi cho nhanh”.
- **Ledger/payment:** ưu tiên read-only/disable write path nếu invariant bị đe dọa; không rollback bằng cách xóa rows; preserve evidence.
- **JEV:** tắt adapter/feature flag, fallback manual; ledger vẫn hoạt động.
- **DB/backup:** bảo vệ read/write, kiểm tra restore staging, đối soát projection; không chạy destructive SQL production.
- **Notification:** resend idempotent, tôn trọng opt-out; security email vẫn theo policy.

Runbook phải có owner, điều kiện escalation, expected evidence và cách khôi phục; không đặt credential thật trong docs.

## 8. Báo cáo người dùng và metrics

User report/dashboard có thể hiển thị tổng `income`, `payment`, wallet, savings, budget usage của chính user; admin metrics toàn hệ thống chỉ aggregate: active users, case counts, JEV fallback rate, email failure rate, payment rejection counts và latency. Không hiển thị admin “tổng tiền mọi user” như một tính năng mặc định nếu không phục vụ vận hành hợp pháp.

## 9. Acceptance criteria

1. Admin có thể tạo/triage/assign/update status/note một report mà không sửa ledger.
2. Report không yêu cầu password/OTP/token; input được validate/rate-limit và PII được mask.
3. Support admin mặc định không thấy raw transaction detail/số dư; break-glass có reason, approval/time-bound audit.
4. Content setting/category default thay đổi có version, approval, audit và không phá FK/lịch sử.
5. Payment/savings/ledger anomaly có incident path read-only/append-only; không có raw SQL correction.
6. JEV/email/DB failures có runbook, owner, retry/fallback; admin không cấp quyền cho model.
7. Metrics admin là aggregate cần thiết và các timestamp hiển thị theo `Asia/Ho_Chi_Minh`.
8. Tất cả UI admin tiếng Việt và thông điệp không quảng bá banking/lending/BNPL/pay-later.

## 10. Out-of-scope

- Admin sửa/xóa/hard-delete transaction, thay số dư ví/savings, bypass payment check hoặc xóa audit.
- Admin xem toàn bộ tài chính user không có case/scope/approval.
- Moderation mạng xã hội, marketplace, thu hộ, thanh toán thật, cấp tín dụng.
- Tự động quyết định severity/correction bằng JEV mà không có người chịu trách nhiệm.
