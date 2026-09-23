# CC-003 — Handoff công nghệ, cloud, cơ sở dữ liệu và xác thực

> **Chủ sở hữu:** TechCloud  
> **Mục đích:** cung cấp quyết định tích hợp cho React + Node.js API + TypeScript/TSX Campus Coin.  
> **Phạm vi thay đổi:** chỉ tạo handoff này; không sửa mã nguồn, SRS gốc hoặc tài liệu canonical.

## 1. Phạm vi và giả định

Handoff đối chiếu SRS tiếng Việt: kiến trúc ba tầng (React/frontend, Node/API, dữ liệu), đăng ký/đăng nhập và quản lý phiên, giao dịch, ngân sách, báo cáo, AI tùy chọn, CSV, quản trị, yêu cầu bảo mật/sẵn sàng. SRS nêu cơ sở dữ liệu quan hệ và liệt kê MySQL/MongoDB như các lựa chọn; đây là quyết định đề xuất, không phải ràng buộc phải dùng một vendor cụ thể.

Các bất biến sản phẩm đã khóa được áp dụng xuyên suốt: UI/nội dung có locale `en`/`vi` và nút chuyển riêng; tiền **VND**; timezone nghiệp vụ `Asia/Ho_Chi_Minh`; transaction_type chỉ `income` và `payment` (không dùng `expense`/“chi phí” làm type); lịch sử transaction append-only/immutable; wallet tách savings; payment chỉ trừ wallet và không vượt số dư; budget chỉ tính payment và chỉ cảnh báo, không chặn; không ngân hàng/cho vay/BNPL; deterministic money logic authoritative, AI advisory.

Giả định: API chạy Node.js runtime; database managed có TLS, backup/PITR và HA tùy tier; traffic ban đầu vừa/nhỏ nhưng ledger phải giữ lâu dài; provider/region cuối cùng còn chờ ngân sách và yêu cầu lưu trú dữ liệu.

## 2. Quyết định đề xuất

| Hạng mục | Quyết định | Trade-off chính |
|---|---|---|
| Frontend/API | Vercel cho React TSX và Node.js TypeScript API; API dùng **Node runtime**, không Edge cho đường MySQL TCP | Preview/rollback tốt, nhưng serverless có thể tạo nhiều connection; phải dùng connector/proxy và pool giới hạn |
| Database | **Managed MySQL 8.x (ưu tiên 8.4 LTS), InnoDB, utf8mb4, TLS** | ACID/FK/reporting mạnh và portable; cần migration có kỷ luật, xử lý lock/deadlock và chi phí instance tối thiểu |
| Auth browser/API | **Opaque server-side session**; hash token trong DB; cookie `__Host-`, HttpOnly, Secure, Path=/, SameSite=Lax; CSRF + Origin/Referer check | Thu hồi tức thời và phù hợp local/OAuth; mỗi request cần session lookup/connection |
| JWT | Không dùng cho browser/API hiện tại; chỉ cân nhắc khi có mobile/external API/worker consumer cụ thể | Tránh denylist/refresh/key-rotation phức tạp và claim quyền cũ |
| Cloud thay thế | Cloudflare Pages/Workers chỉ là phương án có điều kiện sau spike compatibility; không đổi DB sang D1 chỉ vì edge | Edge tốt cho static/latency nhưng Node/ORM/MySQL driver và transaction nhiều bảng phải được kiểm chứng |

## 3. Ma trận MySQL và MongoDB

| Tiêu chí | MySQL managed/InnoDB | MongoDB managed | Kết luận Campus Coin |
|---|---|---|---|
| Atomicity | ACID nhiều bảng, row lock và isolation trưởng thành; có thể khóa wallet, insert ledger, cập nhật số dư, ghi idempotency trong một commit | Một document atomic; multi-document transaction có nhưng cần session/giới hạn/chi phí và vận hành riêng | **MySQL thắng** vì payment cần bảo toàn nhiều quan hệ trong một transaction |
| Append-only ledger | PK/FK/unique/check, quyền runtime chỉ INSERT/đọc ledger và audit guardrail rõ | Có schema validation nhưng thiếu FK; bất biến phụ thuộc application/role ở nhiều đường ghi | MySQL dễ bảo vệ và audit hơn |
| Relational integrity | FK user/category/wallet, unique theo owner/tháng/category, check type/amount; index FK | Reference chỉ là quy ước; denormalization dễ orphan/drift | MySQL phù hợp ownership bắt buộc |
| Reporting/budget | `SUM`, `GROUP BY`, join/filter date/category, 6-month trend tự nhiên; đo được bằng `EXPLAIN` | Aggregation mạnh nhưng $lookup/denormalized counters và consistency phức tạp hơn | MySQL phù hợp dashboard SRS |
| Schema/migration | Migration versioned, expand–contract, backfill riêng; cần tránh DDL lock lớn | Linh hoạt field nhưng schema drift/backfill/index lifecycle tự quản lý | MySQL kỷ luật hơn cho ledger lâu dài |
| Cloud/chi phí/ops | Nhiều managed provider, HA/replica/TLS/backup/PITR; chi phí dễ dự đoán nhưng không luôn scale-to-zero; serverless cần pool/proxy | Atlas tương đối tiện; tier/replica/index/RAM có thể tăng chi phí; lock-in document semantics | MySQL giảm rủi ro delivery; đặt budget alert/connection cap |
| Scale tương lai | Scale dọc/HA trước; replica chỉ cho report chấp nhận lag; sharding/partition chỉ sau số liệu | Scale ngang dễ hơn với document phù hợp, nhưng không cần đánh đổi ledger integrity sớm | MySQL đủ cho phạm vi hiện tại |

**Trade-off được chấp nhận:** MySQL có primary write bottleneck/chi phí tối thiểu và migration khó hơn MongoDB. Đổi lại, ACID + FK + SQL reporting bảo vệ đúng đắn tiền và giảm rủi ro drift. Không chọn MongoDB làm DB authoritative của ledger/budget.

## 4. Bất biến dữ liệu và money path

- Amount là số nguyên VND: ưu tiên SQL `BIGINT` (hoặc `DECIMAL(...,0)` nếu ORM yêu cầu), không `FLOAT`/`DOUBLE`; TypeScript dùng `bigint`/`decimal`, JSON serialize tiền dạng chuỗi khi cần, không dùng JS `number` cho phép tính authoritative.
- Tách `occurred_on` (ngày nghiệp vụ theo `Asia/Ho_Chi_Minh`) khỏi `created_at_utc`/`updated_at_utc` (instant kỹ thuật UTC). Không tính tháng theo timezone máy chủ.
- DB/API check đúng hai type `income`/`payment`; không tạo alias `expense`, “chi phí”, `debit` hoặc type thứ ba.
- Ledger gốc không UPDATE/DELETE bởi runtime role. Sửa/xóa theo ngôn ngữ SRS phải là bản ghi hiệu chỉnh/bù trừ append-only, có `correction_of_id`, lý do và actor; không xóa lịch sử để làm số dư khớp.
- Wallet và savings là aggregate/ledger tách biệt. Payment chỉ khóa và trừ wallet; không tự động rút savings.
- Payment service chạy transaction ngắn: validate session/owner/category/amount → kiểm tra idempotency key (duy nhất theo user/operation) → `SELECT wallet ... FOR UPDATE` → income cộng, payment kiểm tra số dư rồi trừ hoặc từ chối atomic → insert immutable ledger + audit → commit. Không gọi AI/email/webhook bên trong transaction; retry deadlock là retry toàn bộ transaction với budget hữu hạn và cùng idempotency key.
- Budget tổng hợp chỉ `SUM(payment)` đúng owner/category/tháng; vượt budget vẫn ghi nếu wallet đủ, cảnh báo là side effect/read model. Không dùng read replica để kiểm tra số dư hoặc read-after-write.
- Index tối thiểu theo owner/date/type/category, FK và unique key; dùng explicit columns/keyset pagination và `EXPLAIN`, tránh `SELECT *`, deep `OFFSET` và index tùy tiện.

## 5. Ma trận auth và quyết định

| Tiêu chí | Opaque server-side session | JWT thuần | Hybrid |
|---|---|---|---|
| Thu hồi/đổi quyền | Revoke DB ngay theo user/device/session; rotate tại điểm nhạy cảm | Access token còn hiệu lực đến expiry nếu không denylist; refresh rotation tăng vận hành | Linh hoạt nhưng hai vòng đời/trạng thái |
| XSS/CSRF | HttpOnly không đọc được bằng JS; vẫn bắt buộc CSRF/Origin | localStorage dễ lộ qua XSS; Authorization header giảm CSRF nhưng client phải giữ token | Browser vẫn cần session an toàn |
| OAuth/local/admin | Một session model chung, mapping/linking/audit rõ | Phải đồng bộ issuer/subject/claims/refresh | Nhiều policy hơn |
| Serverless | DB lookup và pool là chi phí cần quản lý | Ít lookup nhưng key rotation/denylist/claims phức tạp | Cả hai chi phí |
| Quyết định | **Chọn hiện tại** | Chưa triển khai | Chỉ lộ trình tương lai |

Chi tiết bắt buộc:

- Token ngẫu nhiên tối thiểu 256 bit; chỉ lưu hash token + user/device metadata, created/last-seen, idle/absolute expiry, revoked-at. Cookie `__Host-...`: `HttpOnly; Secure; Path=/; SameSite=Lax`; không localStorage/sessionStorage.
- State-changing requests có CSRF token độc lập và Origin/Referer policy; CORS chỉ allow origin frontend. Rotate session sau login/OAuth/link/reset/đổi quyền; revoke ở logout, password reset và vô hiệu hóa user.
- Local auth dùng Argon2id ưu tiên (bcrypt nếu policy runtime yêu cầu), reset token một lần và expiry ngắn. OAuth callback server-side dùng state + PKCE một lần; identity key `(provider, subject)` unique; verified email/linking phải explicit, không tự ghép account chỉ vì chuỗi email. Admin có route/permission riêng, API luôn authorize theo user/role.
- JWT chỉ mở khi consumer cụ thể xuất hiện: access ngắn hạn, issuer/audience/expiry, signing-key rotation, refresh rotation/revocation; không thêm “cho tương lai”.

## 6. Topology triển khai



```text
Browser --HTTPS/cookie/CSRF--> Vercel CDN + React (vi-VN)
                                  |
                                  v
                       Vercel Node.js API functions
                                  | TLS, bounded pool/proxy
                                  v
                 Managed MySQL primary (InnoDB, HA/Multi-AZ)
                                  |
                   optional replica: reports only, lag-tolerant
```

Frontend/API cùng pipeline preview/production; deployment artifact có thể rollback. Không chạy MySQL TCP driver trên Edge. Chọn DB region gần người dùng (ví dụ Singapore nếu đáp ứng residency/giá), private networking/proxy nếu provider hỗ trợ. Nếu public endpoint thì TLS + network policy; không nhúng DB/OAuth/AI secret vào bundle. Pool module-level chỉ khi driver hỗ trợ serverless, connection limit thấp, connect/query timeout, pre-ping/recycle; theo dõi pool wait/connection exhaustion. Không dùng queue in-memory hoặc retry vô hạn.

Cloudflare Pages/Workers chỉ được chọn sau spike kiểm chứng Node API, session lookup, MySQL HTTP/TCP connector, multi-table transaction, migration, timeout, logs/rollback và cost. D1/SQLite không đáp ứng lựa chọn MySQL.

## 7. Secrets, migration, backup, availability và observability

- Env/secret manager tách development, preview/staging, production; validate schema lúc startup/deploy (`NODE_ENV`, `DATABASE_URL`, `APP_TIME_ZONE=Asia/Ho_Chi_Minh`, `CURRENCY=VND`, OAuth/session secrets, origins, timeout/connection limits). Thiếu secret phải fail fast; preview không dùng production DB/secret. Tách runtime DB role (least privilege, không UPDATE/DELETE ledger) khỏi migration/admin role; TLS bắt buộc.
- Mọi schema change là migration versioned, immutable sau production; không dùng schema push tùy ý. Tách DDL và backfill; expand–migrate–contract (add nullable/compatible → code dual-read/write → batch backfill/checkpoint/verify → contract release sau). Không drop/rename ledger trực tiếp; test lock/index trên data gần production.
- Migration lỗi dừng release an toàn; rollback app bằng deployment artifact trước đó. DB rollback destructive không phải kế hoạch; sửa dữ liệu bằng migration tiến mới có audit.
- Managed DB bật encryption at-rest/in-transit, daily backup và PITR nếu plan hỗ trợ; retention production đề xuất 7–30 ngày chờ RPO/RTO. Snapshot trước migration rủi ro, restore drill định kỳ và ghi thời gian/RPO; reconciliation deterministic trước khi mở ghi sau restore.
- Primary HA/Multi-AZ; liveness/readiness endpoint timeout rõ, không lộ PII/secret. DB lỗi thì payment từ chối rõ ràng, không ghi local/đoán số dư; chỉ retry connection idempotent/deadlock bounded.
- Log JSON có request ID, route, latency/status, actor/user ID đã masking, ledger ID/idempotency result; không log token/password/raw CSV/financial payload không cần thiết. Metrics/alert: 4xx/5xx, auth failures/revokes, commit/rollback/idempotency conflict/insufficient balance, pool/lock/deadlock/slow query/replica lag, migration/backup/PITR/storage. Theo dõi Vercel, DB, backup, egress và AI usage bằng budget alert.

## 8. Tiêu chí chấp nhận

1. Handoff có ma trận MySQL/MongoDB và chọn managed MySQL InnoDB với lý do/trade-off rõ.
2. Handoff có topology Vercel React + Node API runtime + managed MySQL TLS/HA/backup/PITR, connection proxy/pool; Cloudflare chỉ conditional.
3. Handoff chọn opaque server-side session, hash DB, cookie HttpOnly/Secure/`__Host-`, CSRF/Origin, expiry/rotation/revoke; JWT không ở localStorage và chưa triển khai nếu không có consumer.
4. Money path dùng VND chính xác, ACID row lock, idempotency, append-only; payment vượt số dư bị từ chối atomic; type chỉ `income`/`payment`.
5. Wallet/savings tách biệt; budget chỉ payment, cảnh báo không chặn; AI không authoritative cho tiền/quyền.
6. Có migration expand–contract, rollback app/forward migration, backup/PITR/restore drill, availability và observability.
7. Không thêm ngân hàng, cho vay, BNPL, payment tiền thật hay financial advice được chứng nhận.
8. Chỉ handoff này được tạo cho CC-003; không yêu cầu formatter/linter/build/test toàn dự án.

## 9. Ngoài phạm vi

- Provision vendor/database, viết source code/schema/migration/CI cụ thể hoặc chốt giá/SLA/region khi chưa có account, traffic, residency và ngân sách.
- Ngân hàng, payment gateway/tiền thật, cho vay, lãi suất, BNPL, blockchain/custody.
- AI làm nguồn số dư, transaction, budget enforcement, quyền hoặc financial advice.
- Mobile/external API và JWT trước khi có consumer; thiết kế chi tiết UI, domain canonical, JEV/admin workflow ngoài các ràng buộc tích hợp.

## 10. Rủi ro và câu hỏi mở không blocking

| Rủi ro/câu hỏi | Mặc định để tiếp tục | Điểm cần chốt |
|---|---|---|
| Provider/region MySQL, private networking, PITR/HA và giá | Managed MySQL 8.x gần người dùng, TLS, PITR/HA theo tier | Vendor, residency, retention, cost ceiling |
| Vercel connection/concurrency | Connector/proxy serverless-compatible, pool nhỏ, timeout | Spike connection exhaustion/p95 ở staging |
| `BIGINT` hay `DECIMAL(...,0)` trong ORM | Integer VND, API chuỗi/`bigint`, không float | Chốt một schema/serialization canonical |
| RPO/RTO/retention của chương trình campus | Backup daily + PITR nếu có; MVP RTO vài giờ | SLA, restore cadence, Multi-AZ tier |
| Session expiry cụ thể/OAuth provider | Có idle + absolute expiry, state/PKCE, verified linking | AUTHENTICATION.md chốt duration/provider/remember-device |
| Report/AI có cần worker/replica | MVP không gọi ngoài transaction; replica chỉ report lag-tolerant | Queue, retry/privacy và cache sau khi đo |

## 11. Điểm cần tích hợp

- **ARCHITECTURE.md:** topology, Node vs Edge, DB proxy/pool, primary/replica, health/failure mode.
- **DOMAIN-MODEL.md:** type `income`/`payment`, VND exact, timezone, immutable correction, wallet/savings, idempotency, budget payment-only.
- **AUTHENTICATION.md:** opaque session, cookie/CSRF/rotation/revoke, local/OAuth state/PKCE/verified linking, admin authorization; đối chiếu chi tiết CC-002.
- **PRD.md:** vi-VN/VND/timezone; insufficient wallet từ chối; budget cảnh báo không chặn; không ngân hàng/cho vay/BNPL.
- **AI-JEV.md:** AI advisory, không gọi trong money transaction, không sửa ledger/số dư/budget; privacy/logging.
- **ADMIN-OPERATIONS.md:** least privilege, runtime không update/delete ledger, correction/audit, backup/restore/reconciliation.
- **ROADMAP.md:** spike provider/region/connection proxy, chốt money representation/RPO-RTO, migration/restore drill; chỉ sau đó cân nhắc replica/queue/JWT.
