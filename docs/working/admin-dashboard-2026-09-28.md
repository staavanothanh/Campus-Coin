# Admin dashboard — evidence ngày 2026-09-28

## Bổ sung quản trị tài khoản (cùng ngày)

- Backend: `GET /api/v1/admin/users` và `PATCH /api/v1/admin/users/{userId}` trong `src/routes/api.ts`, service `src/application/admin.service.ts`, repository `src/infrastructure/persistence/user.repository.ts`.
- Chính sách: admin-only (403 cho role khác), không tự disable tài khoản đang thao tác, reason bắt buộc 3–500, idempotent qua `withIdempotentMutation`, audit append-only `admin.user.status_change` có reason. Email trong danh sách được mask (`maskEmail`) — không trả email đầy đủ ra UI admin.
- OpenAPI: `docs/contracts/openapi.yaml` + `artifacts/openapi.json` + `artifacts/api.d.ts` đã regenerate bằng `npm run api:bundle` và `npm run api:types`.
- UI: tab “Tài khoản” trong `AdminScreen.tsx` (`src/web/features/admin/AccountStatusModal.tsx`), VI/EN, ẩn nút dừng cho chính tài khoản đang dùng, modal yêu cầu reason trước khi submit.

## Bổ sung Admin Metrics (§8 ADMIN-OPERATIONS)

- Backend: `GET /api/v1/admin/metrics` trong `src/routes/api.ts`, `getAdminMetrics` + `readAdminMetrics` (`src/application/admin.service.ts`, `src/infrastructure/persistence/admin.repository.ts`).
- Chỉ aggregate từ `users`, `issues`, `audit_events` — không đọc nội dung row, không trả tổng tiền user, không có tiền/ledger.
- UI: tab “Chỉ số vận hành” trong `AdminScreen.tsx` (`MetricsTab`), VI/EN, chia nhóm Accounts/Reports/Audit.

## Phạm vi

- Owner boundary: presentation/admin, theo `docs/ADMIN-OPERATIONS.md` và API contract hiện có.
- Source: `src/web/screens/AdminScreen.tsx`, `src/web/features/admin/`; navigation ở `src/web/App.tsx` chỉ hiện cho `admin`.
- Hàng đợi tự tải, cursor pagination, bộ lọc status/priority, chi tiết issue, triage, note append-only và audit chỉ đọc; copy VI/EN.
- Số liệu là counts của các trang đã tải, có nhãn phạm vi; không giả nhận tổng issue toàn hệ thống, latency/provider health hay tổng tiền của user.
- Không sửa API/domain/schema, migration, financial authority hoặc các thay đổi JEV ngoài scope.

## Evidence

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm run lint`: pass.
- `npm run api:validate`: exit 0, schema hợp lệ, còn 5 warnings 4xx đã ghi từ trước (không phải lỗi mới).
- `npm run api:bundle` + `npm run api:types`: pass, artifacts đã regenerate từ OpenAPI mới.
- `node --import tsx --test test/application/admin-user-management.test.js test/web/admin-model.test.js test/core-routes.test.ts`: 38 pass, 0 fail, 0 skip (trước khi thêm metrics); sau khi thêm metrics, `test/application/admin-user-management.test.js` là 8 pass gồm test `getAdminMetrics`.
- Playwright smoke (phần tài khoản, cùng ngày): list user (email mask), ẩn nút dừng cho tài khoản đang dùng, disable thành công với CSRF + Idempotency-Key + reason, copy EN. Không ghi DB, không session thật.
- `git diff --check`: pass; Git cảnh báo LF/CRLF ở các file working copy.
- Playwright smoke (phần dashboard, trước đó): intercept toàn bộ `/api/v1/**` với payload synthetic: triage `open` → `in_triage`, note lần đầu 503 rồi retry thành công với cùng idempotency key, audit đọc, copy EN và role `security` bị từ chối ở UI. Không ghi DB hay dùng session thật.
- Smoke phát hiện nút note ngoài viewport; modal đã có giới hạn chiều cao và cuộn.

## Còn thiếu / không suy diễn

- **Assign owner chưa có API/schema contract**: bảng `issues` không có cột assignee; thêm cột cần migration mới, nhưng target Aiven clone đang có `0032` mismatch + `0033` pending (docs yêu cầu dừng và kiểm tra thủ công trước). Không chạy migration; không tạo UI mô phỏng assign giả.
- **Content/category admin (§5) bị chặn bởi trigger `0027`**: trigger `trg_category_update_custom_owner_only` set `name_en = NULL` cho mọi UPDATE không phải custom category của chủ sở hữu → mọi thay đổi system category fail CHECK `chk_categories_name_en_nonempty`. Không bypass trigger; chưa có API/content versioning.
- **Incident/read-only path (§4, §7)**: không có bảng flag/incident; dựng control an toàn cần schema + quyết định vận hành, chưa làm.
- Assign owner trước đó chưa có trong danh sách; mục này bổ sung cho rõ.
- Quản trị tài khoản: chưa chạy test với tài khoản admin thật + DB thật (Aiven clone); chưa có CI run mới cho commit này. Email chỉ hiển thị dạng mask. Log/redaction phía server cho action mới `admin.user.status_change` và `maskEmail` cần được team review. Không disabled thử bất kỳ tài khoản thật nào trong task này.
- Metrics: counts là snapshot tại thời điểm tải; không suy diễn latency, provider health, JEV cost/fallback, restore result hay error rate vì chưa có nguồn đo.
- Content/version/approval, vận hành incident/read-only và metrics toàn hệ thống chưa có API để dựng control an toàn; không thêm control client tự authorize.
- Live admin/API/DB, owner/403 isolation và audit persistence chưa được chạy trong task này. Không suy ra backend authorization từ smoke có intercept. Hai entrypoint API có policy audit khác nhau; task UI không thay đổi policy server.
- Masking report/note đầu vào và privacy phía server cần được review riêng; cảnh báo UI không thay thế redaction hoặc authorization server.
- Không commit, push, deploy hoặc migration.
