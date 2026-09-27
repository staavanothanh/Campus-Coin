# Handoff: xác minh lỗi CI do migration trùng version

> Mục tiêu: nhờ dev đang xử lý CI xác nhận hoặc bác bỏ nguyên nhân bên dưới bằng log job đầy đủ. Đây là chẩn đoán cần xác minh, chưa phải quyết định sửa migration.
> Snapshot đã kiểm tra: `origin/main` tại commit `913886f618b584be513bf49ca20bf0319d5dfe6f` (`merge: integrate cleaned candidate runtime`, 2026-09-27 11:34 +07:00).
> Lịch sử — đã giải quyết trên nhánh nguồn: tài liệu này chẩn đoán CI trên `main` trước khi xử lý. Sau đó `main` đã sửa lịch sử migration trùng ở commit `8b625e7`; nhánh `hiep` có một migration cho mỗi version `0001`–`0010`. Không dùng checklist dưới đây như việc đang mở; chỉ đối chiếu nếu CI hiện tại tái hiện lỗi tương tự.

## Bằng chứng hiện có

- [Campus Coin CI run 36296283802](https://github.com/staavanothanh/Campus-Coin/actions/runs/36296283802) thất bại tại bước `npm run db:datatest`. Các bước trước đó gồm `npm ci`, typecheck, build, OpenAPI validation/generation và unit tests đều pass.
- [MySQL Integration run 36296283822](https://github.com/staavanothanh/Campus-Coin/actions/runs/36296283822) pass `npm ci`, typecheck và `npm test`; bước `MySQL domain integration` cùng các bước MySQL chạy sau đó đều thất bại.
- Trong snapshot `main` có hai migration cùng version `0004`:
  - `db/migrations/0004_email_auth.sql`
  - `db/migrations/0004_idempotency_owner_key.sql`
- Có hai migration cùng version `0005`:
  - `db/migrations/0005_auth_rate_limits.sql`
  - `db/migrations/0005_wallet_baseline_boundary.sql`
- [`scanMigrationDir()`](https://github.com/staavanothanh/Campus-Coin/blob/913886f618b584be513bf49ca20bf0319d5dfe6f/src/infrastructure/db/migration-engine.ts#L157) chủ động ném `MigrationError` khi gặp version trùng. [`datatest/run.ts`](https://github.com/staavanothanh/Campus-Coin/blob/913886f618b584be513bf49ca20bf0319d5dfe6f/datatest/run.ts#L110) gọi bộ quét này trước khi chạy SQL datatest.

Điều này khiến migration trùng version là nguyên nhân có khả năng cao giải thích cả hai workflow. Bản xem xét hiện có trạng thái bước lỗi và source code; cần mở log job để xác nhận thông báo lỗi thực tế.

## Việc cần xác nhận

1. Mở log của bước `npm run db:datatest` và bước `MySQL domain integration`; ghi lại lỗi đầu tiên chính xác. Xác nhận lỗi có nêu `duplicate migration version 0004` hoặc `0005` không.
2. Kiểm tra các bước MySQL phía sau có cùng dừng vì migration discovery/initialization hay còn lỗi độc lập khác.
3. Đối chiếu hai parent của merge và lịch sử từng migration để xác định nhánh nào sở hữu mỗi thay đổi, database nào đã apply version/checksum nào, và nội dung nào đã được phát hành.
4. Đề xuất một chuỗi migration liên tục, không trùng version, cùng kế hoạch cập nhật baseline/fixtures/tests nếu cần.
5. Sau khi thống nhất phương án, chạy lại hai workflow và gửi kết quả pass/fail kèm link run mới.

## Ràng buộc khi xử lý

- Không chạy migration hoặc datatest có khả năng tạo/xóa database trên DB dùng chung; dùng MySQL disposable/local được cấu hình riêng.
- Không sửa nội dung, đổi tên hoặc tái sử dụng version của migration đã apply trên database dùng chung trước khi đối chiếu `schema_migrations`, checksum và baseline.
- Không xóa migration chỉ để làm CI pass. Giữ đầy đủ thay đổi nghiệp vụ của cả hai nhánh và thể hiện thứ tự phụ thuộc rõ ràng.

## Nội dung phản hồi cần gửi lại

- **Kết luận:** xác nhận hay bác bỏ lỗi migration trùng version.
- **Lỗi đầu tiên trong log:** tên job/bước và thông báo lỗi.
- **Kế hoạch sửa:** migration/version nào sẽ được giữ, chuyển tiếp hoặc baseline hóa; database nào có thể đã bị ảnh hưởng.
- **Bằng chứng sau sửa:** link hai workflow mới và trạng thái migration-test trên database disposable.
