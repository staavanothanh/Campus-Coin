# Aiven Database Handoff — Deploy Vercel

## Connection Info

| Item | Value |
|---|---|
| Host | `mysql-13ae44c9-meoluoitt1-e4a2.i.aivencloud.com` |
| Port | `11673` |
| Database | `campus_coin` |
| User | `avnadmin` |
| SSL | `verify-ca` |
| CA cert | `ca.pem` (in repo root) |

## Status

- 3 migrations applied: `0001_initial_schema.sql`, `0002_seed_default_categories.sql`, `0003_ledger_owner_reference_index.sql`
- 11 system categories seeded
- Database ready for API deployment

## Vercel Setup

1. **Static IP / IP Allowlist**: Vercel serverless functions dùng dynamic IP. Cần:
   - Aiven Static IP addon (nếu có), hoặc
   - Allowlist Vercel egress IP ranges trong Aiven console, hoặc
   - Dùng Vercel Fluid Compute + static egress nếu plan hỗ trợ

2. **Environment variables** trong Vercel project settings:
   ```
   CAMPUS_COIN_DB_HOST=mysql-13ae44c9-meoluoitt1-e4a2.i.aivencloud.com
   CAMPUS_COIN_DB_PORT=11673
   CAMPUS_COIN_DB_NAME=campus_coin
   CAMPUS_COIN_DB_USER=avnadmin
   CAMPUS_COIN_DB_PASSWORD=<từ Aiven console>
   CAMPUS_COIN_DB_SSL=verify-ca
   CAMPUS_COIN_DB_CA_PATH=ca.pem
   ```

3. **ca.pem**: Upload như Vercel secret file hoặc đưa vào repo (đã có sẵn ở root)

## Notes

- `avnadmin` là admin role — production nên tạo least-privilege role `cc_runtime` + `cc_migrate` (xem `db/grants.example.sql`)
- Database `campus_coin` đã tạo sẵn, không cần CREATE DATABASE lại
- Xem thêm `db/README.md` cho connection pool config và migration workflow
