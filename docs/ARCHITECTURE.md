# ARCHITECTURE — Campus Coin

## 1. Quyết định kiến trúc

Campus Coin dùng kiến trúc phân lớp cho ứng dụng Web:

1. React + TypeScript/TSX cho presentation.
2. Node.js + TypeScript cho HTTP API và application services.
3. Domain services thuần, chịu trách nhiệm invariant của ví, savings, ledger và budget.
4. MySQL managed trên cloud cho dữ liệu bền vững; không dùng database local làm môi trường chạy chính.
5. Vercel là đích triển khai MVP cho web và Node API; API có thể chạy qua serverless functions hoặc runtime Node tương thích, miễn giữ transaction boundary và connection pooling an toàn.
6. JEV, Google OAuth và email là outbound adapters; không để provider logic lọt vào domain.

Sơ đồ luồng khái quát:

```text
Browser (React/TSX)
        |
 HTTPS + session cookie + CSRF
        v
Node.js API (validation/auth/application)
        |
        +--> Domain services (ledger/wallet/savings/budget)
        |          |
        |          +--> MySQL transaction + constraints
        |
        +--> JEV adapter (advisory, timeout/schema/fallback)
        +--> Google OAuth adapter
        +--> Email/Gmail adapter
        +--> Job runner (monthly insight/notifications)
```

## 2. Vì sao chọn MySQL thay vì MongoDB

| Tiêu chí | MySQL managed | MongoDB managed |
|---|---|---|
| Ledger bất biến và adjustment | Transaction, foreign key, unique/index và constraint phù hợp | Có transaction nhưng mô hình integrity tham chiếu cần kỷ luật ứng dụng nhiều hơn |
| Payment đồng thời | Row lock/transaction rõ cho wallet aggregate | Có thể làm được nhưng transaction/index và contention cần thiết kế cẩn thận |
| Budget/report theo tháng/category | GROUP BY, JOIN, range query và index tự nhiên | Aggregation pipeline linh hoạt nhưng dễ drift schema |
| Category/history referential integrity | FK/RESTRICT giúp không xóa nhầm lịch sử | Tham chiếu mềm; phải tự bảo vệ mọi đường ghi |
| Migration/audit | Migration có schema rõ, dễ review | Schema linh hoạt hữu ích khi dữ liệu thay đổi nhưng che giấu invariant |
| Cloud/ops | Nhiều managed MySQL, backup/TLS/monitoring | Atlas và các nhà cung cấp tương tự cũng tốt |
| Chi phí/độ đơn giản MVP | Cần quản lý connection pool nhưng mô hình quen thuộc | Linh hoạt document nhưng không mang lại lợi ích chính cho ledger |

**Lựa chọn:** MySQL managed. Campus Coin có dữ liệu tài chính cần tính nguyên tử, báo cáo quan hệ, khóa đồng thời và tham chiếu lịch sử; lợi ích của integrity quan hệ lớn hơn sự linh hoạt document. MongoDB vẫn là phương án thay thế nếu một yêu cầu JEV/document lớn xuất hiện, nhưng không được đổi DB chỉ để chứa output AI.

Cơ sở dữ liệu production/staging phải cloud-hosted, kết nối TLS, backup tự động và kiểm tra restore. Không commit connection string.

## 3. Session vs JWT vs hybrid

| Phương án | Ưu điểm | Hạn chế/rủi ro | Đánh giá |
|---|---|---|---|
| Server-side opaque session | Thu hồi tức thì; cookie HttpOnly; quyền thay đổi không cần chờ token hết hạn; phù hợp browser | Cần session store và lookup; phải xử lý connection/pooling serverless | Phù hợp nhất |
| JWT access/refresh | Stateless ở API, thuận cho nhiều service | Thu hồi/revoke phức tạp; refresh token phải bảo vệ; payload dễ lộ; dễ dùng sai trong browser | Không chọn cho session người dùng MVP |
| Hybrid JWT + session | Có thể tối ưu service-to-service | Hai cơ chế, nhiều failure mode, tăng diện tích bảo mật và vận hành | Chỉ cân nhắc khi có service độc lập thật sự |

**Lựa chọn:** server-side opaque session. Sau local login hoặc Google OAuth callback, API tạo random session ID đủ entropy, chỉ lưu hash session + user + expires/revoked/last_seen trong MySQL và đặt ID vào cookie `HttpOnly; Secure; SameSite=Lax`. Cookie không chứa số dư, role hay dữ liệu tài chính. Khi cần frontend/API khác origin, dùng allowlist origin, credentialed CORS và CSRF token; ưu tiên deploy dưới cùng site để giảm phức tạp.

JWT có thể tồn tại sau này cho service-to-service đã xác định, nhưng không được dùng thay session trình duyệt theo mặc định.

## 4. Các lớp và ranh giới

### Presentation

React hiển thị nội dung theo locale `en` hoặc `vi`, VND, biểu đồ pie/bar và dark/light. UI không tự tính số dư từ các giá trị do người dùng nhập; nó hiển thị kết quả API và trạng thái pending/error. Nút chuyển ngôn ngữ là control riêng với nút dark/light. Mọi thao tác thay đổi phải có feedback và lỗi theo locale đang chọn.

### API/application

Node API xác thực session, kiểm tra schema/input, phân quyền, idempotency key và điều phối use case. API không chấp nhận `expense`/`chi phí` như transaction type, không cho client truyền số dư cuối cùng làm nguồn sự thật. Response lỗi không tiết lộ account existence, session detail hoặc dữ liệu của user khác.

### Domain

Domain service nhận command đã validate và chạy trong transaction DB: tạo `income`, tạo `payment`, tạo correction/reversal, gửi/rút savings, tính budget usage, tạo cảnh báo. Nó không gọi JEV trực tiếp. Rule payment đủ ví và rule savings atomically được thực thi ở đây + DB lock/constraint.

### Persistence

MySQL tables dự kiến: `users`, `auth_identities`, `password_credentials`, `sessions`, `otp_challenges`, `notification_preferences`, `wallet_accounts`, `ledger_transactions`, `transaction_corrections`/reference fields, `categories`, `budgets`, `savings_accounts`, `savings_transfers`, `reports`, `admin_notes`, `audit_events`, `jev_jobs`/`insights`. Tên bảng là thiết kế logic, migration cụ thể thuộc implementation.

Ledger rows và audit rows append-only. Category/account disable dùng status flag; FK không bị phá. Projection/snapshot chỉ là cache có thể rebuild từ ledger, không được trở thành nguồn sự thật duy nhất.

### Integrations và jobs

- Google adapter dùng authorization code + PKCE/state/nonce.
- Email adapter gửi OTP và notification; provider failure không làm thay đổi ledger.
- JEV sync dùng timeout ngắn cho gợi ý nhập; monthly summary dùng job async với idempotency, retry bounded và dead-letter/failed status.
- Job scheduler phải phát hiện duplicate bằng unique key (user + operation + period + input version).

## 5. Tính nguyên tử và đồng thời

Khi tạo `payment`, API mở transaction, khóa `wallet_accounts` của user (`SELECT ... FOR UPDATE` tương đương), đọc balance authoritative, kiểm tra `available_wallet >= amount`, insert ledger row immutable, cập nhật projection nếu có và commit. Nếu không đủ, rollback toàn bộ và trả lỗi nghiệp vụ tiếng Việt; không tạo partial row.

Savings deposit/withdraw cũng khóa các aggregate liên quan và cập nhật ví/savings trong một transaction. Auto transfer dùng idempotency key theo user/tháng/lần chạy. Hai request cùng lúc không được cùng đọc một balance rồi làm ví âm.

Tất cả amount lưu dưới dạng số nguyên VND (`BIGINT` hoặc decimal không có scale phù hợp), không dùng floating point. Input phải nằm trong giới hạn max được cấu hình để tránh overflow/DoS.

## 6. Cloud deployment và vận hành

- **Web/API:** Vercel theo environment development/staging/production; route API và web ưu tiên cùng site.
- **Database:** MySQL managed có private/TLS connection nếu provider hỗ trợ, pool/driver serverless-friendly, backup point-in-time nếu có.
- **Secrets:** Google client secret, session secret/pepper, email key, JEV credential và DB URL chỉ ở secret manager/environment; không log.
- **Observability:** structured logs không chứa OTP, password, cookie, raw description nhạy cảm hoặc số dư không cần thiết; metrics cho auth, payment rejection, DB latency, JEV fallback, email failure; alert lỗi ledger/DB.
- **Backup/restore:** kiểm tra restore định kỳ ở staging; xác nhận ledger append-only và audit trước release.
- **Availability:** API trả lỗi an toàn khi JEV/email không khả dụng; transaction tiền không phụ thuộc JEV.
- **Migrations:** migration versioned, backward-compatible khi cần; không drop/cascade lịch sử; rollback ưu tiên migration đảo an toàn, không xóa dữ liệu financial.

Cloudflare Workers là phương án deploy thay thế, nhưng chỉ chọn khi driver MySQL, session store, job runtime và observability đáp ứng đầy đủ; không đổi target chỉ vì chi phí headline.

## 7. Acceptance criteria kiến trúc

1. Production/staging dùng MySQL managed cloud qua TLS và có backup/restore evidence.
2. Client không thể tự gửi balance cuối cùng hoặc vượt domain authorization để tạo `payment`.
3. Concurrent payment được serialize theo wallet aggregate; invariant balance không âm được giữ tại commit.
4. Session cookie không chứa dữ liệu tài chính, có HttpOnly/Secure/SameSite phù hợp và session có revoke/expiry.
5. Domain không import SDK JEV/Google/email trực tiếp; các adapter lỗi vẫn không làm sai ledger.
6. Migrations không xóa/sửa lịch sử và giữ FK category/account.
7. Log/metric đã mask secret và dữ liệu nhạy cảm; có audit cho auth, correction, admin và quyền đặc biệt.
8. Mọi hiển thị/report định nghĩa theo VND và `Asia/Ho_Chi_Minh`.
9. Mọi user-facing string có translation key và bản dịch `en`/`vi`; nút đổi ngôn ngữ độc lập với dark/light, còn enum/API/domain giữ nguyên.

## 8. Internationalization

- Locale của user được lưu trong profile hoặc preference; locale mặc định là `vi-VN`.
- Nút chuyển ngôn ngữ đổi toàn bộ presentation copy mà không đổi dữ liệu tiền, timezone, enum, mã lỗi hoặc quyền.
- Backend trả error code ổn định; frontend map error code sang bản dịch theo locale.
- Report, email, notification, admin console và nội dung JEV đều phải chọn locale; số tiền vẫn định dạng VND và ngày/giờ vẫn theo `Asia/Ho_Chi_Minh`.
- Translation catalog phải có kiểm tra key thiếu, placeholder mismatch và fallback rõ ràng.

## 8. Out-of-scope

- Không dùng local database cho dữ liệu production.
- Không dựng microservice hoặc event bus chỉ để tăng độ phức tạp MVP.
- Không xây ngân hàng, payment processor, lending/BNPL, lãi suất hoặc identity provider riêng.
- Không để JEV/LLM làm balance engine, authorization engine hay migration generator tự động.
- Không ghi credential thật, endpoint riêng tư hoặc dữ liệu người dùng thật trong repo.
