# CC-004 — Handoff JEV và vận hành admin

- **Chủ sở hữu human:** Developer D cho JEV/QA; Team Leader duyệt scope.
- **Trạng thái:** Tư vấn đã tích hợp; JEV vẫn chờ probe Day 1.
- **Quyết định:** [ADR-0006](../adr/0006-optional-openrouter-jev.md) và ranh giới `ADMIN-OPERATIONS.md`.

## JEV

JEV chỉ gợi ý category từ candidate set cho `income`/`payment`. Backend-only, OpenRouter typed System One/Decisions, default-off, user confirmation bắt buộc. Không gửi balance, ledger, session, Google claims, secret hoặc PII thừa. Không gọi trong money transaction.

Probe phải ghi endpoint, transport model, typed response, error, `usage.cost`, latency, quota và provider privacy. Không được thay bằng chat completion/prose parsing. Lỗi hoặc policy không đạt trả manual picker; core money path vẫn chạy.

## QA tối thiểu

- JEV off: tạo income/payment, wallet/savings/budget/report không đổi.
- JEV success: suggestion hợp lệ, user override/confirm được.
- JEV malformed, timeout, quota, low confidence, privacy failure: fallback manual.
- Không raw prompt/response/secret/balance/ledger trong log.

## Admin

Admin chỉ triage report/issue, status, priority, note và content setting được cấp quyền. Không sửa/xóa/reverse ledger, đổi balance, bypass insufficient funds hoặc xóa audit. Break-glass cần reason, approval, time limit và audit.

## Handoff

D nhận API/session boundary từ A/B, UI state từ C và release gate từ Team Leader. D chuẩn bị redacted observability, health, kill switch, rollback và evidence. Chi tiết chuẩn ở `AI-JEV.md`, `ADMIN-OPERATIONS.md` và `DELIVERY-PLAN.md`.
