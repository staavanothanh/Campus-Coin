# ADR-0003: Cloud MySQL qua cổng kiểm chứng

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận có điều kiện
- **Người quyết định:** Team Leader (người dùng)

## Bối cảnh

Ledger bất biến, wallet, savings, khóa dòng, khóa ngoại và báo cáo theo tháng phù hợp với cơ sở dữ liệu quan hệ. Sản phẩm yêu cầu triển khai cloud/free tier nhưng chưa được phép đoán provider, region, quota hoặc backup.

## Quyết định

Dùng một MySQL managed trên cloud sau khi kiểm chứng provider và region ở Day 1: TLS, quota, connection limit, latency, Vercel connectivity, backup/export/restore và hành vi engine/ORM. Production không dùng database local.

## Phương án bị loại

- **MongoDB làm nguồn authoritative:** không phù hợp bằng MySQL cho khóa dòng, FK và transaction tiền.
- **Database local production:** không đáp ứng persistence, backup và vận hành.
- **Chọn vendor trước khi có evidence:** tạo claim không kiểm chứng về quota, SLA hoặc restore.

## Hệ quả

Developer B sở hữu schema, migration, transaction và restore. Nếu không có free tier đủ ổn định, Team Leader phải chọn candidate khác đã kiểm chứng hoặc duyệt paid alternative; không âm thầm hạ yêu cầu.

## Rủi ro và kiểm chứng

Backup/restore isolated, connection pool serverless, migration preflight và reconciliation phải có evidence trước GO.
