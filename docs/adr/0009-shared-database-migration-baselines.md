# ADR-0009: Baseline hội tụ migration trên database shared

- **Ngày:** 2026-09-25
- **Trạng thái:** Đề xuất (chờ Team Leader chấp nhận trước khi apply lên Aiven)
- **Người quyết định:** Team Leader

## Bối cảnh

Database `campus_coin` trên Aiven là shared: một migration chain khác đã apply `0004_email_auth.sql` và `0005_auth_rate_limits.sql`, trùng version với `0004`/`0005` của chain Campus Coin. Engine fail-closed đúng (checksum mismatch) và không có đường bypass. Probe read-only ngày 2026-09-25 xác minh trên MySQL 8.4.8:

- DDL đã apply của `0001`/`0003` ≡ intent file hiện tại (đối chiếu từng bảng; lệch duy nhất ở ledger là index của chính `0003`). Mismatch hai version này chỉ ở cấp file (nội dung lúc apply khác), không ở semantics.
- Objects của `0004`/`0005` chain mình **không tồn tại**; version đã bị chain khác chiếm.
- Test data chain mình đã dọn có kiểm soát (Phase 1); seeds và tables chain khác nguyên vẹn.

## Quyết định

1. Giữ nguyên files/versions hiện tại (không move, không sửa file đã apply) để fresh-install và CI không đổi.
2. Thêm `db/baselines.json` khai báo hai loại slot, có checksum pin và lý do:
   - `external`: version thuộc chain khác; row đã apply phải khớp checksum pin (vắng mặt trên DB fresh cũng sạch). Khi slot external khớp pin, **file local cùng version được bỏ qua** — DDL hội tụ do DBA apply thủ công có duyệt và verify từng câu, không auto-apply (mục 4).
   - `historical`: version có file local; row đã apply sạch khi khớp checksum file **hoặc** checksum lịch sử đã pin (chỉ sau khi DBA đối chiếu DDL như trên).
3. Engine enforce: contiguity strict như cũ; `appliedMissing` vẫn fail-closed với version lạ chưa khai; checksum ngoài pin vẫn mismatch. Không có bypass im lặng: mọi chấp nhận đều nằm trong file review được.
4. DDL còn thiếu của `0004`/`0005` trên Aiven do DBA chạy thủ công đúng nội dung file hiện tại (đã duyệt từng câu), rồi verify objects tồn tại bằng read-only probe trước khi chạy `migrate up` tiếp. Không sửa file migration đã apply để khớp checksum, không UPDATE tay `schema_migrations` ngoài cơ chế baseline.

## Phương án bị loại

- **Sửa file `0001`/`0003`/`0004`/`0005` cho khớp checksum đã ghi:** phá lịch sử, vỡ fresh-install và CI.
- **Move DDL `0004`/`0005` sang version mới (`0031`/`0032`):** vỡ thứ tự phụ thuộc (file `0006`+ cần parent index của `0004`/`0005` nhưng chạy trước), buộc procedure-guard phức tạp hai đường.
- **UPDATE tay `schema_migrations`:** history surgery không review được, không tái hiện trên DB mới.
- **DROP/recreate database:** shared DB còn tables và dữ liệu chain khác.
- **Nhân bản DDL `0004`/`0005` vào migration mới giữ nguyên file cũ:** tạo hai nguồn sự thật cho cùng objects và lỗi duplicate trên DB fresh.

## Hệ quả

`db/baselines.json` là code review được; CI fresh (không có slot external) vẫn chạy strict. Áp dụng lên Aiven cần provision `cc_migrate`/`cc_runtime`, apply `0006`–`0032` bằng migration role, review grants/trigger `DEFINER`, reconcile và restore rehearsal — các bước này vẫn operator-gated theo `docs/DB-RESTORE-RUNBOOK.md`.

## Rủi ro và kiểm chứng

Sai pin checksum hoặc khai external nhầm version sẽ hợp thức hóa drift lạ. Giảm thiểu: pin checksum lấy trực tiếp từ `schema_migrations` (read-only probe), đối chiếu DDL trước khi pin `historical`, unit test cho mọi nhánh accept/reject, và full gate MySQL phải xanh sau thay đổi.
