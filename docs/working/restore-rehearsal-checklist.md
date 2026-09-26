# Checklist diễn tập restore MySQL — Campus Coin

- **Owner:** Developer B (lane MySQL/database).
- **Loại:** working artifact (checklist thực thi + evidence), không phải nguồn quyết định.
- **Nguồn canonical:** [`docs/DB-RESTORE-RUNBOOK.md`](../DB-RESTORE-RUNBOOK.md), [`docs/ADMIN-OPERATIONS.md`](../ADMIN-OPERATIONS.md), [`db/README.md`](../../db/README.md), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).
- **Liên quan blocker:** `BLK-MIG-02` (production leg), `BLK-RECON-01` (reconcile trên target restore), `BLK-OPSLOG-01` (`db_operation_logs`/`cc_ops`).
- **Trạng thái:** chưa thực hiện; đã chuẩn bị checklist nhưng còn thiếu backup identifier/recovery point, target cô lập và operator/provider approval.

Checklist này không thay thế runbook. Khi có mâu thuẫn, `docs/DB-RESTORE-RUNBOOK.md` và quyết định Team Leader có quyền ưu tiên.

## 0. Quy tắc an toàn (đọc trước)

- Không restore đè staging/production đang dùng chung; chỉ dùng target cô lập.
- Không ghi endpoint đầy đủ, password, token, CA bytes hoặc PII vào repo/checklist/evidence.
- Không chạy `db:migrate` trong rehearsal trừ khi có migration approval riêng.
- Không dùng provider admin làm runtime credential; runtime là `cc_runtime`, migration là `cc_migrate`, ops-log là `cc_ops`.
- Không sửa/xóa ledger/audit để "làm sạch"; mismatch phải fail closed và mở incident.

## 1. Chuẩn bị (trước khi chạy)

- [ ] Có change/incident ID và người phê duyệt (Team Leader/DBA).
- [ ] Có backup identifier + recovery point do provider xác nhận; ghi lại MySQL version và migration revision mong đợi.
- [ ] Target restore là database/service **cô lập**, không chứa credential write path, app user không truy cập được.
- [ ] `cc_migrate`/`cc_runtime` đã provision đúng `db/grants.example.sql`; `cc_ops` provision nếu sẽ ghi operation log.
- [ ] CA bundle lấy từ secret manager/provider console (không commit); xác nhận provenance + mode TLS đã duyệt.
- [ ] Có synthetic identity cho read-only smoke (không dùng PII thật).
- [ ] Kho evidence có ACL phù hợp; biết nơi lưu (không lưu trong repo).

## 2. Thực hiện restore

1. [ ] Xác nhận lại environment/identifier target với người phê duyệt.
2. [ ] Khôi phục backup bằng công cụ chính thức của provider vào target mới.
3. [ ] Ghi: backup ID, point-in-time, start/end, kết quả, MySQL version. Không ghi endpoint/password/token.
4. [ ] Cấp environment chỉ trỏ target restore qua secret manager; TLS mode đã duyệt (`verify-ca` nếu provider cấp CA riêng; không dùng `disabled` cho cloud).

## 3. Kiểm chứng kết nối và migration state

Chạy bằng principal migration/DBA:

- [ ] `npm run db:preflight`
  - Kỳ vọng: env shape ok; `connect + TLS handshake` ok; cipher negotiated; MySQL >= 8.0.16; database tồn tại; migration files vs `schema_migrations` không drift.
  - Lưu: TLS mode + negotiated cipher, MySQL version, applied/pending.
- [ ] `npm run db:status`
  - Kỳ vọng: applied/pending khớp revision nguồn; checksum không mismatch.
  - Dừng nếu checksum drift hoặc version lạ.

## 4. Review grants và trigger DEFINER

Bằng DBA principal:

- [ ] `SHOW GRANTS` cho `cc_runtime`/`cc_migrate` (đã redact credential): runtime **không** có DDL/DELETE/TRIGGER/REFERENCES/SUPER, **không** có UPDATE `available_balance_vnd`/`balance_vnd`; chỉ UPDATE `updated_at`/`description` phục vụ locking read.
- [ ] `information_schema.TRIGGERS` trong schema target: liệt kê DEFINER; trigger `DEFINER` phải là migration principal đã provision và principal đó còn tồn tại với quyền tối thiểu cho trigger.
- [ ] Xác nhận bộ append-only guards + boundary/projection triggers đủ theo revision (không thiếu).

## 5. Reconcile trên target restore (fail closed)

Chuyển environment sang `cc_runtime`:

- [ ] `npm run db:reconcile`
  - Kỳ vọng: `walletMismatches=0`, `savingsMismatches=0`, `status=pass`.
  - Lưu: `checkedUsers`, mismatch counts, exit status, thời điểm.
- [ ] Nếu mismatch/DB error: dừng, giữ evidence, mở incident, **không** mở write path.

## 6. Read-only application smoke

- [ ] Qua đúng network/runtime path (không dùng PII thật, không tạo mutation tùy tiện).
- [ ] Kiểm tra readiness (`SELECT 1` qua pool) và các financial read owner-scoped với synthetic identity.
- [ ] Không lưu response chứa dữ liệu user; chỉ lưu route/result reference.

## 7. Ghi operation log (nếu `db_operation_logs` đã tồn tại)

Dùng `cc_ops` (INSERT-only), sau migration/reconcile/restore:

```bash
npm run db:operation-log -- <project-key> <environment> <operation> <outcome> <duration-ms> <migration-version|-> <external-reference|-> <error-code|->
```

- [ ] Chỉ alias project/environment, operation/outcome, duration, migration version, external reference, stable error code.
- [ ] Không truyền raw error text, endpoint, secret hoặc PII.
- [ ] Nếu DB/table chưa sẵn sàng: ghi sự kiện ở external change/evidence store thay vì bỏ qua.

## 8. Quyết định và dọn dẹp

- [ ] Chỉ đóng rehearsal khi restore + migration state + grants/trigger review + reconcile + read-only smoke đều pass.
- [ ] Giữ bản restore đến khi evidence được review.
- [ ] Sau review: xóa target cô lập theo quy trình provider đã duyệt.
- [ ] Ghi pass/fail, residual issues, reviewer và quyết định mở/không mở write path.

## 9. Evidence tối thiểu (điền khi chạy thật)

| Evidence | Nội dung cần ghi | Đã có? |
|---|---|---|
| Approval/source | Change ID, người phê duyệt, backup ID, recovery point | [ ] |
| Target | Environment label + isolated target ID (không credential) | [ ] |
| Restore | Start/end, trạng thái provider, MySQL version | [ ] |
| Connectivity | TLS mode, negotiated cipher, CA provenance (xác nhận riêng) | [ ] |
| Schema | `db:preflight`/`db:status`: applied version/checksum, trigger/DEFINER review | [ ] |
| Least privilege | `SHOW GRANTS` đã redact; runtime không DDL/DELETE/projection UPDATE | [ ] |
| Reconcile | `checkedUsers`, mismatch counts, exit status, thời điểm | [ ] |
| Smoke | Read-only route/result, synthetic identity reference | [ ] |
| Decision | Pass/fail, residual issues, reviewer, quyết định mở/không mở write path | [ ] |

## 10. Điều kiện dừng (fail closed)

- Không rõ backup source/recovery point/target isolation/quyền operator.
- TLS/CA, migration checksum, trigger definer hoặc grants không khớp cấu hình đã duyệt.
- Reconcile mismatch, owner-scope failure, projection inconsistency hoặc append-only invariant failure.
- Restore đòi sửa/xóa ledger/audit để "làm sạch".

## 11. Ghi chú phạm vi

- `npm run test:mysql:required` và `db:datatest` tạo schema fixture riêng; chúng xác minh migration/domain/harness trên disposable DB nhưng **không** chạy trên dữ liệu vừa restore và không thay thế bước reconcile/read-only smoke ở target restore.
- `db:preflight` giữ read-only; CI run ID/log vẫn ở GitHub Actions.
