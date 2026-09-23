# ROADMAP — Campus Coin

## 1. Nguyên tắc lập lộ trình

Ưu tiên tính đúng đắn và dễ hiểu của ví/savings/ledger trước tính năng AI hoặc mở rộng. Mỗi phase phải giữ các bất biến trong `DOMAIN-MODEL.md`, không làm yếu authentication/least privilege và không biến sản phẩm thành ngân hàng, lending, BNPL/pay-later hay dịch vụ tư vấn tài chính.

## 2. MVP — đường dọc bắt buộc

### M0: Nền tảng an toàn

- React + TypeScript/TSX, Node.js API TypeScript và managed MySQL cloud.
- Environment/secret manager, TLS, migration, backup/restore staging, structured redacted logs.
- Server-side opaque session, local password registration/login, Google OAuth, account linking guard, OTP reset.
- Role `user`/limited admin, owner-scoped authorization, CSRF/rate limit/audit skeleton.

**Gate:** không có secret; auth flows có expiry/revoke; database restore được kiểm tra; tất cả API response lỗi tiếng Việt phù hợp.

### M1: Domain money tối thiểu

- Onboarding nhập initial wallet balance.
- Immutable ledger chỉ `income` và `payment`; category theo type.
- Payment wallet check với transaction/row lock và idempotency.
- Savings deposit/withdraw và optional monthly fixed auto-transfer, tách khỏi `income`/`payment` totals.
- Correction/reversal append-only, audit trail.

**Gate:** invariant/concurrency/correction acceptance trong `DOMAIN-MODEL.md`; payment thiếu ví bị reject, budget không can thiệp authorization.

### M2: Budget, dashboard và trải nghiệm tiếng Việt

- Monthly/category budgets, usage chỉ payment, threshold/overrun warning non-blocking.
- Dashboard wallet/savings/tổng income/payment, report period theo Asia/Ho_Chi_Minh, pie/bar switch.
- Dark/light dedicated button, responsive/accessibility baseline.
- Default category disable; custom category historical integrity.

**Gate:** report đối soát deterministic; pie/bar cùng số liệu; toàn bộ UI/content tiếng Việt, VND.

### M3: Report/admin vận hành

- User report/issue form, admin queue/status/notes/least privilege.
- Content/settings versioning, audit và incident/runbook tối thiểu.
- Gmail security email + optional notification setting, queue/retry/idempotency.

**Gate:** admin không sửa ledger; support detail masked; P0/P1 runbook và security escalation được diễn tập ở staging.

## 3. Phase sau MVP

### P1: JEV có kiểm soát

- Adapter contract/model registry và feature flag.
- Sync category suggestion với confidence/manual override/fallback.
- Async monthly summary từ aggregate, output validation, job idempotency/retry/dead-letter.
- Privacy consent/retention, synthetic evaluation, quality/safety dashboards.

**Exit:** tắt JEV không đổi money behavior; JEV không tự commit; factual cross-check pass; fallback rate và cost có budget.

### P2: Nhập/xuất và tiện ích

- CSV import preview + validation + user confirm; không auto-commit model output.
- PDF/image export có privacy warning và rate limit.
- Giao dịch lặp lại tạo rows riêng; không scheduler duplicate.
- Saved tips/insights và history stale/regenerate semantics.

### P3: Độ tin cậy và mở rộng

- Query/index tuning, read projection rebuild, point-in-time recovery drill.
- Cloudflare runtime evaluation nếu MySQL/session/job constraints được chứng minh.
- Accessibility audit, localization hardening nếu mở thêm locale (không đổi VND/Asia/Ho_Chi_Minh nếu chưa có quyết định).

## 4. Rủi ro và cách giảm thiểu

| Rủi ro | Tác động | Giảm thiểu | Owner gợi ý |
|---|---|---|---|
| Concurrent payment làm ví âm | Critical: sai money state | MySQL transaction + row lock + invariant/reconciliation | Domain/API |
| Sửa/xóa history để “sửa lỗi” | Mất audit/trust | Append-only reversal/correction + FK/audit | Domain/Ops |
| OAuth link nhầm account | Account takeover/privacy | state/PKCE/nonce, re-auth, không merge email-only | Auth |
| OTP abuse/account enumeration | Takeover/spam | hash-only, expiry, attempt/rate limits, generic response | Auth/Ops |
| JEV bịa số hoặc prompt injection | Sai insight/privacy | aggregate input, schema/factual checks, advisory only, fallback | AI |
| Managed DB outage/backup không restore | Mất availability/data | backup/PITR, restore drill, graceful read-only | Platform |
| Serverless connection exhaustion | lỗi ngẫu nhiên/latency | pooler/driver phù hợp, bounded concurrency, metrics | Platform |
| Email notification lộ dữ liệu | Privacy harm | minimize/mask, opt-in, security email split, provider controls | Auth/Ops |
| Admin over-privilege | Insider/privacy | scoped roles, break-glass audit/time limit, aggregate default | Ops |
| Terminology drift (`expense`, chi phí) | Người dùng hiểu sai domain | glossary/checklist/review docs và UI | Product |

## 5. Quyết định đã chốt và giả định

- MySQL managed cloud được chọn thay MongoDB do transaction, FK và report/ledger integrity.
- Opaque server session được chọn thay JWT browser session; JWT chỉ cân nhắc cho service-to-service thật sự.
- Vercel là deployment target MVP; provider cụ thể, pooler, email provider và JEV endpoint là chi tiết triển khai sau.
- Số dư ví ban đầu là baseline do user nhập, không biến thành `income`.
- Savings transfer là internal transfer riêng, không thêm transaction type thứ ba.
- Admin nhẹ và không có quyền sửa history; support data masked theo mặc định.
- JEV không authoritative; mọi output phải có fallback/manual override.
- CSV/PDF/recurring transaction/prediction không nằm trong core MVP trừ khi scope được re-approve.

## 6. Câu hỏi mở không blocking

1. Chọn nhà cung cấp MySQL managed, pooler và region cụ thể nào để đáp ứng latency/backup/budget? Có thể quyết định ở deployment planning.
2. Email OTP/Gmail-compatible provider nào, domain gửi và quota nào? Cần procurement/config, không đổi auth contract.
3. `jev` chạy self-hosted hay provider managed, model/version và retention cụ thể nào? Cần security/privacy review trước bật production.
4. Ngưỡng budget mặc định là 80/100% hay do user cấu hình hoàn toàn? Không ảnh hưởng rule warning non-blocking.
5. Có cần email verify bắt buộc trước login hay chỉ trước sensitive actions? Chọn theo threat/risk và UX pilot.
6. Có cần CSV/PDF/recurring trong release đầu tiên không? Đây là scope choice sau khi M0–M3 ổn định.
7. Quy trình break-glass của admin cần một hay hai người phê duyệt? Quyết định theo đội vận hành.

Các câu hỏi trên không cho phép thay đổi enum, immutable history, wallet/savings separation, VND, timezone, deterministic calculation hoặc out-of-scope banking/lending/BNPL. Nếu câu trả lời sau này làm thay đổi một invariant, phải cập nhật PRD, DOMAIN-MODEL, ARCHITECTURE và acceptance trước khi code.

## 7. Definition of ready/done cho phase

**Ready:** acceptance test, owner, data/privacy impact, migration/rollback note, UI Vietnamese copy và out-of-scope được ghi.

**Done:** implementation + focused tests/verification, migration/backup evidence, security review nếu auth/financial/PII, docs cập nhật, metrics/logs redacted và rollback/runbook. Không đánh dấu done chỉ vì UI scaffold hoặc model trả kết quả mẫu.
