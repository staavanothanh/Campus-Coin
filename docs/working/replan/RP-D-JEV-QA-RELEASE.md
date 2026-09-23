# RP-D — Handoff JEV, QA và release

- **Chủ sở hữu human:** Developer D
- **Trạng thái:** Tư vấn đã hợp nhất; JEV chờ compatibility probe.
- **ADR:** [0006](../../adr/0006-optional-openrouter-jev.md), [0007](../../adr/0007-five-day-thin-slice.md).

## Bằng chứng

OpenRouter có tài liệu về typed JEV/System One/Decisions. Đây chỉ là evidence tài liệu; transport model, endpoint, quota, cost, latency và provider policy vẫn phải probe Day 1. Không gọi chat completion rồi parse prose.

## Use case và adapter

JEV chỉ category suggestion trước submit. Request server-only gồm transaction type, description đã redact, candidate opaque, locale và contract version. Response phải schema-validate Choice/probability/confidence, candidate membership, `other_or_uncertain`, cost và status. User confirm/override; domain mới commit.

Không gửi session, Google claim, user ID/email, balance, savings, amount, date, raw ledger, admin data hoặc secret. Không gọi trong DB money transaction.

## Chính sách runtime và QA

Default-off; timeout/rate/spend/concurrency/input bounded; không retry mặc định; kill switch. JEV off, unavailable, malformed, timeout, 402/403/404/413/429, low confidence hoặc privacy failure đều manual fallback. Log chỉ masked metadata.

Bộ synthetic/anonymized 50–100 ví dụ `en`/`vi`; đo accuracy, abstention, override, schema failure, fallback, p95 và cost. Day 4 chạy auth/domain/UI/restore/rollback với JEV off và so sánh money output.

## Release

JEV không đạt chỉ giữ off, không chặn core manual path. Auth/IDOR, ledger/savings, data loss, secret/PII, restore hoặc deploy-wide failure là NO-GO. Team Leader duyệt GO/NO-GO.
