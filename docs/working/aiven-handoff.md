# Aiven Database Handoff — Deploy Vercel

## Connection Info

Các giá trị provider phải được lấy lại từ Aiven console tại thời điểm provision/deploy; không ghi endpoint, admin user hoặc CA vào working docs.

| Item | Value |
|---|---|
| Host | `<verify from Aiven console>` |
| Port | `<verify from Aiven console>` |
| Database | `<verify from Aiven console>` |
| Runtime user | `cc_runtime` (least privilege; không dùng provider admin) |
| Migration user | `cc_migrate` (chỉ dùng cho migration/DDL) |
| SSL | `verify-ca` (production target) |
| CA cert | Provider-managed secret; không commit vào repo |

## Status

- Cần xác minh trực tiếp trên provider sau mỗi thay đổi: migration `0001`–`0030` (kèm repair `0011` đã duyệt theo DELIVERY-PLAN BLK-MIG-02), seed category, connectivity và readiness.
- Chưa có evidence trong working docs để claim database đã sẵn sàng cho production.
- Không tạo PR hoặc chạy migration production khi endpoint, role, CA và grant chưa được Team Leader xác nhận.

## Vercel Setup

1. **Static IP / IP Allowlist**: Vercel serverless functions dùng dynamic IP. Cần chọn và ghi evidence cho một trong các phương án:
   - Aiven Static IP addon nếu khả dụng;
   - allowlist egress của Vercel nếu provider hỗ trợ và có IP ổn định;
   - Vercel compute/egress phù hợp với provider plan.

2. **Environment variables** trong Vercel project settings:

   ```text
   CAMPUS_COIN_DB_HOST=<verify from Aiven console>
   CAMPUS_COIN_DB_PORT=<verify from Aiven console>
   CAMPUS_COIN_DB_NAME=<verify from Aiven console>
   CAMPUS_COIN_DB_USER=cc_runtime
   CAMPUS_COIN_DB_PASSWORD=<secret manager>
   CAMPUS_COIN_DB_SSL=verify-ca
   CAMPUS_COIN_DB_CA_PATH=<provider CA secret file>
   ```

3. `CAMPUS_COIN_DB_MIGRATE_USER` và `CAMPUS_COIN_DB_MIGRATE_PASSWORD` chỉ dùng ở môi trường migration/DBA, không đưa vào runtime Vercel. CA phải được cấp hình như secret/file deployment và không commit.

## Notes

- Provider admin user chỉ dùng cho provisioning/audit theo chính sách DBA; không dùng làm runtime hoặc migration credential lâu dài.
- `cc_runtime` và `cc_migrate` phải được provision theo `db/grants.example.sql` sau khi blocker least-privilege được chốt.
- Xem thêm `db/README.md` cho connection pool config, TLS và migration workflow.
