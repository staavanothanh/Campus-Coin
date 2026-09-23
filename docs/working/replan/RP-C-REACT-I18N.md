# RP-C — Handoff React, i18n và accessibility

- **Human owner:** Developer C
- **Trạng thái:** Tư vấn đã hợp nhất; không sửa source trong handoff.
- **ADR:** [0005](../../adr/0005-immutable-money-domain.md), [0007](../../adr/0007-five-day-thin-slice.md).

## Authority

Browser chỉ render API-authoritative values. Không tính balance/budget, không submit final balance, không authorize payment, không gọi OpenRouter trực tiếp và không giữ secret. Query cache phải clear/isolate khi sign-out/session change.

## Screen/state thin slice

Sign-in Google; wallet onboarding; dashboard; add income/payment; history; savings; category/budget; report với pie/bar và table; user report; admin queue; settings locale/theme. Mỗi màn hình có loading, empty, success, validation, 401, 403, retry và server error phù hợp.

Payment thiếu ví là error; budget overrun là warning không chặn. Savings transfer hiển thị riêng. History không có edit/delete; category disabled vẫn đọc được. Admin chỉ issue/status/note, 403 server-enforced.

## i18n và accessibility

Mọi visible label, heading, validation, error, success, warning, chart/table và aria name có `en`/`vi`. Locale không đổi enum/formula/audit. Amount integer VND; date/month HCMC. Dark/light và language là hai control độc lập. Semantic form, label, keyboard/focus, live region, contrast, table alternative và reduced motion bắt buộc.

## JEV-off

Flag off/unavailable/timeout/schema/low-confidence thì không hiện spinner AI; manual category picker luôn dùng được. Suggestion phải label rõ, user confirm/override, không tạo row.

## Handoff

C nhận session/error contract từ A/B và JEV status từ D. C cung cấp route/state matrix, bilingual smoke và accessibility evidence. Không tự quyết định balance hoặc authorization.
