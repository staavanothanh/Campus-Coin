# Campus Coin — Chỉ mục quyết định

> Ngày chuẩn hóa: 2026-09-24 · Người quyết định: Team Leader (người dùng) · SRS gốc không sửa.

Các quyết định chi tiết được chuẩn hóa theo ADR trong [`docs/adr/README.md`](./adr/README.md). File này là bảng tra nhanh, không phải bản sao thứ hai của toàn bộ lý do.

| ADR | Quyết định | Trạng thái | Hệ quả chính |
|---|---|---|---|
| [0001](./adr/0001-google-oauth-only.md) | Chỉ Google OAuth | Đã chấp nhận | Không local password, linking, OTP/reset, Gmail inbox hoặc Gmail cá nhân |
| [0002](./adr/0002-opaque-browser-session.md) | Opaque browser session | Đã chấp nhận | Owner lấy từ session; JWT browser không dùng trong MVP |
| [0003](./adr/0003-cloud-mysql-validation-gate.md) | Cloud MySQL | Đã chấp nhận có điều kiện | Provider/region/free-tier/restore phải được kiểm chứng Day 1 |
| [0004](./adr/0004-vercel-domain-no-custom-email.md) | Domain Vercel | Đã chấp nhận | Custom email domain và notification không chặn launch |
| [0005](./adr/0005-immutable-money-domain.md) | Miền tiền bất biến | Đã chấp nhận | `income`/`payment`, VND nguyên, savings tách riêng, budget warning-only |
| [0006](./adr/0006-optional-openrouter-jev.md) | JEV tùy chọn qua OpenRouter | Đã chấp nhận có điều kiện | Default-off, typed probe, manual fallback, không money authority |
| [0007](./adr/0007-five-day-thin-slice.md) | Thin-slice 4–5 ngày | Đã chấp nhận | Bốn developer; Team Leader sở hữu tích hợp và GO/NO-GO |
| [0008](./adr/0008-runtime-row-authorization-boundary.md) | Row-level owner authorization | Đã chấp nhận | Service/session enforce owner; DB enforce integrity, runtime credential là backend-trusted |

## Quản trị quyết định

Thay đổi auth mode, ledger invariant, JEV authority, provider/domain hoặc scope cut phải có ADR mới hoặc ADR thay thế. Provider, model, quota, cost, SLA, backup/RPO/RTO và latency chỉ là sự thật sau khi có evidence từ account/docs/runtime. Không dùng handoff cũ để mở lại local auth, OTP, Gmail hoặc JEV bắt buộc.
