# Handoff tích hợp replan

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã hợp nhất tài liệu; implementation và release còn chờ human gate.

## Nguồn

Đã đọc RP-A đến RP-D, bảng replan và canonical docs. ADR và quyết định Team Leader là nguồn ưu tiên. Handoff chỉ là tư vấn; các assumption auth/email cũ bị supersede bởi Google OAuth-only.

## Kế hoạch A/B/C/D

- **A:** OAuth callback, claims, opaque session, CSRF/origin, owner scope, Vercel/env.
- **B:** MySQL, schema/migration, immutable ledger, wallet/savings/budget/category, report/restore.
- **C:** React, route/state, `en`/`vi`, VND/HCMC, chart/table, accessibility/admin.
- **D:** OpenRouter JEV optional, typed probe, fallback, QA, observability, deploy/rollback.
- **Team Leader:** scope, contract, provider/model evidence, tích hợp và GO/NO-GO.

## Dependency

```text
Day 0 Team Leader khóa scope/API
  ├─> A OAuth/session
  ├─> B domain/MySQL
  ├─> C UI (tiêu thụ A/B contract)
  └─> D JEV-off/QA (tiêu thụ A/B contract)
A+B -> C/D -> Day-4 smoke -> Day-5 GO/NO-GO
```

## Gate

Day 1 kiểm chứng OAuth/Vercel, MySQL/restore, API và typed JEV. Day 2 kiểm tra session, transaction, idempotency, atomicity. Day 3 kiểm UI/admin/security/fallback. Day 4 integrated smoke, privacy, restore, rollback. Day 5 release hoặc defer.

## Blocker

MySQL/provider/restore, OAuth/IDOR, domain invariant, secret/PII, accessibility, rollback và production smoke là launch gates. JEV chưa kiểm chứng chỉ block JEV enablement; giữ flag off. Không provider/model/cost/SLA/RPO/RTO claim khi chưa có evidence.
