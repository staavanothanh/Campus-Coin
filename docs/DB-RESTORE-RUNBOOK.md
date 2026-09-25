# Runbook restore MySQL vào môi trường cô lập

Runbook này không chọn provider hoặc khẳng định backup/TLS đã hoạt động. Chỉ dùng sau khi Team Leader/DBA phê duyệt backup source và target cô lập. Không restore đè staging đang dùng chung hoặc production.

## Điều kiện trước khi chạy

- Có change/incident ID, người phê duyệt, backup identifier và recovery point do provider xác nhận.
- Target là database/service cô lập, không chứa production credentials cho write path và không được app user truy cập.
- Operator có quyền provider restore; `cc_migrate` và `cc_runtime` dùng đúng mục đích, không dùng provider admin cho runtime.
- CA bundle lấy từ secret manager/provider console; không commit, in hoặc chép vào evidence.
- Ghi lại MySQL version, charset/collation và migration revision mong đợi từ nguồn chuẩn.

## Thực hiện

1. Tạo hoặc chọn target cô lập và xác nhận lại environment/identifier với người phê duyệt. Không chạy `db:migrate` trong rehearsal restore trừ khi có migration approval riêng.
2. Khôi phục backup theo tài liệu và công cụ chính thức của provider vào target mới. Ghi backup ID, point-in-time, thời gian bắt đầu/kết thúc và kết quả; không ghi endpoint/password/token.
3. Cấp environment chỉ trỏ tới target restore qua secret manager. Đặt TLS mode đã được phê duyệt (`verify-ca` nếu provider cấp CA riêng); không dùng `disabled` cho cloud.
4. Với migration/DBA principal, chạy `npm run db:preflight` rồi `npm run db:status`. Xác nhận TLS handshake/cipher, MySQL version, charset, bounded pool, schema tồn tại và migration/checksum không drift. Không tiếp tục khi check fail.
5. Với DBA principal, kiểm tra `SHOW GRANTS` của runtime/migration roles và `information_schema.TRIGGERS` trong schema target. Trigger `DEFINER` phải là migration principal được provision và principal đó phải còn tồn tại với quyền tối thiểu cần cho trigger. Không ghi password hoặc CA material vào evidence.
6. Chuyển environment sang `cc_runtime` và chạy `npm run db:reconcile`. Mismatch hoặc DB error là fail-closed; không mở write path.
7. Nếu có approved synthetic identity, chạy read-only application smoke qua đúng network/runtime path, gồm readiness và các financial reads owner-scoped. Không dùng PII thật hoặc tạo mutation tùy tiện trên bản restore.
8. Chỉ đóng rehearsal khi restore, migration state, grants/trigger review, reconcile và read-only smoke đều pass. Giữ bản restore đến khi evidence được review; sau đó xóa target cô lập theo quy trình provider đã duyệt.

Sau mỗi migration/reconcile/restore và khi `db_operation_logs` đã tồn tại, operator có thể ghi outcome metadata bằng `npm run db:operation-log -- <project-key> <environment> <operation> <outcome> <duration-ms> <migration-version|-> <external-reference|-> <error-code|->`. Dùng principal `cc_ops`; `error-code` phải là code ổn định, không truyền raw error text. CI run IDs/logs vẫn được lưu ở GitHub. Nếu DB mất kết nối hoặc migration log table chưa được tạo, ghi nhận sự kiện ở external change/evidence store.

`npm run test:mysql:required` và `db:datatest` tạo schema/test fixtures riêng. Chúng xác minh migration/domain/harness trên disposable database nhưng **không** chạy trên dữ liệu vừa restore và không thay thế bước reconcile/read-only smoke ở target restore.

## Evidence cần lưu

Lưu trong kho evidence có ACL phù hợp, tham chiếu bằng run/change ID trong `docs/DELIVERY-PLAN.md`; không đưa secrets, CA bytes, endpoint đầy đủ hoặc PII vào repo.

| Evidence | Nội dung tối thiểu |
|---|---|
| Approval/source | Change ID, người phê duyệt, provider backup identifier, recovery point |
| Target | Environment label và isolated target ID, không ghi credential |
| Restore | Bắt đầu/kết thúc, trạng thái provider, MySQL version |
| Connectivity | Thực hiện từ network phù hợp, TLS mode và negotiated cipher; CA provenance được xác nhận riêng |
| Schema | `db:preflight`, `db:status`, applied version/checksum và trigger/DEFINER review |
| Least privilege | `SHOW GRANTS` đã redact credential; runtime không có DDL/DELETE/projection UPDATE |
| Reconcile | `checkedUsers`, mismatch counts, exit status và thời điểm chạy |
| Smoke | Read-only route/result, synthetic identity reference, không lưu response chứa dữ liệu user |
| Decision | Pass/fail, residual issues, reviewer và quyết định mở/không mở write path |

## Điều kiện dừng

- Không rõ backup source, recovery point, target isolation hoặc quyền operator.
- TLS/CA, migration checksum, trigger definer hoặc grants không khớp cấu hình đã duyệt.
- Reconcile mismatch, owner-scope failure, projection inconsistency hoặc append-only invariant failure.
- Restore cần sửa/xóa ledger hoặc audit để “làm sạch”. Dừng, giữ evidence, mở incident và dùng correction/reversal append-only theo domain contract.
