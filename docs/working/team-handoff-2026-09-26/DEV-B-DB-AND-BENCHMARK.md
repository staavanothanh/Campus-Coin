# Developer B — DB clone, owner tests và benchmark

## 1. Xác nhận DB kiểm thử

1. Xác nhận clone là database riêng cho Campus Coin, không dùng `defaultdb`, production hoặc dữ liệu thật.
2. Xác nhận tên schema, migration `0001`–`0005`, quyền test tạo/xóa schema tạm, TLS/CA, runtime role least-privilege và backup/restore.
3. Gửi cho Team Leader kết quả `db:status`, `db:preflight`, MySQL version, grants đã che thông tin nhạy cảm và kết quả restore. Không gửi secret/CA private.

Sau khi clone được xác nhận, đặt các biến môi trường trong terminal riêng theo [DB-STAGING-TESTING.md](../../DB-STAGING-TESTING.md), rồi chạy:

```powershell
$env:CAMPUS_COIN_TEST_DB = "1"
$env:CAMPUS_COIN_DB_NAME = "<ten-schema-clone-da-xac-nhan>"
npm run db:datatest
node --import tsx --test test/auth.mysql.integration.test.ts
```

Harness test tạo schema tạm. Không chạy lệnh trên target chưa xác nhận hoặc database dùng chung. Ba regression case mới kiểm tra user B không thể tạo correction trên transaction của A, PATCH category của A, hoặc gắn issue vào `relatedTransactionId` của A.

## 2. Benchmark có thể giải thích và chạy lại

Benchmark giúp nhóm tìm bottleneck và giải thích database design; rubric không cho điểm benchmark riêng. Không trình bày số local cũ như kết quả cloud.

1. Dùng dữ liệu synthetic trong clone; ghi commit, MySQL version/region, số users/rows và index đang có.
2. Đo dashboard, danh sách giao dịch có pagination, report tháng và payment read/write. Chạy cùng một kích thước dữ liệu và quy trình warm-up/lặp lại.
3. Lưu query plan (`EXPLAIN ANALYZE` khi query chỉ đọc an toàn), p50/p95, request concurrency và lỗi. Không chạy `EXPLAIN ANALYZE` trên mutation.
4. Ghi connection limit mỗi function, tổng connection quan sát được và headroom DB khi chạy tải. `attachDatabasePool` đóng connection idle trước khi function suspend; nó không thay cho phép đo tổng connection khi nhiều instance cùng chạy.
5. Gửi bảng kết quả, command/script dùng, giới hạn phép đo và đề xuất index cụ thể. Không thêm index nếu chưa có query plan chứng minh vấn đề.

## 3. Evidence cần trả

- Tên clone đã xác nhận (không kèm credential), migration count, TLS, grants và backup/restore result.
- Kết quả `db:datatest` và Auth MySQL integration trên clone hoặc link CI tương ứng.
- Bảng benchmark gồm commit, MySQL region/version, synthetic row count, concurrency, warm-up, số lần chạy, p50/p95, query plan và connection headroom.
