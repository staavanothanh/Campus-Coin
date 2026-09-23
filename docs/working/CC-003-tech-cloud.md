# CC-003 — Handoff công nghệ, cloud và database

- **Chủ sở hữu human:** Developer B; phối hợp A/D.
- **Trạng thái:** Tư vấn đã tích hợp; provider/region vẫn chờ Day 1.
- **Quyết định:** [ADR-0003](../adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](../adr/0004-vercel-domain-no-custom-email.md).

## Kiến trúc triển khai

React/TypeScript và Node API/TypeScript chạy trên Vercel-provided domain; cloud MySQL qua TLS. Provider, region, quota, connection, latency, backup/restore và engine behavior không được đoán.

## Lý do chọn MySQL

MySQL/InnoDB phù hợp transaction tiền, FK, wallet row lock, immutable references và monthly report. MongoDB không được chọn làm authoritative source cho MVP. Local database không được dùng production.

## Nguyên tắc dữ liệu

- VND integer/exact decimal; không FLOAT/DOUBLE và không JS number cho authoritative arithmetic.
- Technical instant UTC-compatible; local month/date theo `Asia/Ho_Chi_Minh`.
- Migrations versioned, non-destructive; runtime role không UPDATE/DELETE ledger/audit.
- Pool serverless bounded; secrets chỉ ở Vercel env.
- Backup/restore rehearsal trong DB cô lập và reconciliation từ immutable ledger.

## Day-1 evidence

Developer B ghi provider docs/account evidence, TLS, limits, Vercel connectivity, restore/export, migration preflight và expected latency. Nếu free tier không đủ ổn định, Team Leader chọn candidate đã kiểm chứng khác hoặc duyệt paid alternative.

## Handoff

B cung cấp migration/version, API contract, health/readiness, restore smoke và DB error boundary cho D; owner-scoped read model cho C. A sở hữu session/env; D sở hữu release. Chi tiết chuẩn ở `ARCHITECTURE.md`, `DOMAIN-MODEL.md` và `DELIVERY-PLAN.md`.
