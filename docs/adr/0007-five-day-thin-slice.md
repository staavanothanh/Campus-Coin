# ADR-0007: Phạm vi thin-slice năm ngày và quyền sở hữu

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader (người dùng)

## Bối cảnh

MVP cần đưa lên production trong bốn đến năm ngày với bốn developer và một Team Leader. Phạm vi phải đủ nhỏ để kiểm chứng auth, money invariant, restore và rollback thay vì mở rộng tính năng chưa an toàn.

## Quyết định

- **Developer A:** Google OAuth, session, CSRF/origin, owner scope, Vercel/platform.
- **Developer B:** MySQL, schema/migration, immutable ledger, wallet/savings/budget/category, report và restore.
- **Developer C:** React, trạng thái UI, `en`/`vi`, VND/HCMC, accessibility, dashboard/report/admin.
- **Developer D:** OpenRouter/JEV tùy chọn, QA, smoke, observability, deploy/rollback.
- **Team Leader:** scope lock, quyết định contract, chấp nhận evidence và GO/NO-GO.

Ngày 0 khóa scope; Day 1 kiểm chứng dependency; Day 2–4 tích hợp và smoke; Day 5 chỉ release hoặc stabilization, không mở feature mới.

## Phạm vi bị loại

Local auth, linking, OTP/reset, Gmail inbox, email security, banking, payment thật, lending, BNPL, interest, multi-currency, CSV/PDF, recurring, prediction, complex AI summary/chat, enterprise admin và custom email domain.

## Hệ quả

Các lane có thể chạy song song nhưng A/B là contract upstream cho C/D. Không specialist nào có quyền release.

## Rủi ro và kiểm chứng

Mọi gate critical/high chưa đạt đều là NO-GO. Scope cut không được làm yếu auth, owner scope, ledger, savings, VND/HCMC hoặc restore.
