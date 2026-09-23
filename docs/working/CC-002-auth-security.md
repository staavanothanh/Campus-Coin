# CC-002 — Handoff xác thực và bảo mật Campus Coin

Trạng thái: phân tích và đề xuất, chưa triển khai.

## 1. Phạm vi và giả định

Handoff này phân tích đăng ký/đăng nhập local bằng email và mật khẩu, Google OAuth, liên kết Google vào tài khoản local, xác minh email, đặt lại mật khẩu bằng OTP gửi qua email/Gmail, thông báo Gmail/email tùy chọn, session/token, threat model, audit và privacy. Không sửa mã nguồn, SRS gốc hoặc tài liệu canonical.

SRS yêu cầu đăng ký và đăng nhập sinh viên, quản lý phiên an toàn, khôi phục mật khẩu bằng email hoặc liên kết token, và lối vào quản trị riêng. Gmail notification ở đây chỉ có nghĩa gửi email tới địa chỉ người dùng (có thể là Gmail); không đọc hộp thư, không gửi thay người dùng, không xin Gmail API scope đọc/gửi và không phải ngân hàng hay giao dịch.

Các quyết định sản phẩm bất biến: giao diện/nội dung tiếng Việt; VND; Asia/Ho_Chi_Minh; transaction type chỉ income và payment, dùng từ thanh toán, không tạo type expense hoặc chi phí; lịch sử giao dịch immutable; wallet tách savings; payment lấy từ wallet và không vượt số dư; budget chỉ tính payment và cảnh báo không chặn; không ngân hàng, cho vay, BNPL; deterministic money logic authoritative, AI chỉ advisory. Auth/email không được thay đổi các bất biến này.

CC-003 chưa chốt managed hay custom auth, DB/session store, email provider, secret manager và topology domain. Các đề xuất dưới đây là phương án bảo thủ: nếu dùng dịch vụ managed, provider phải chứng minh control tương đương trước khi chọn.

## 2. Quyết định đề xuất

### 2.1 Mô hình danh tính

- Tách User/account, LocalCredential, ExternalIdentity, EmailAddress, Session, Challenge và NotificationPreference.
- User có trạng thái pending_verification, active hoặc disabled; user_id nội bộ không lấy từ email.
- Email canonical dùng để tra cứu theo một quy tắc duy nhất do CC-003 chốt. Không tự ý gộp dấu chấm hoặc plus tag Gmail.
- Google identity khóa bằng issuer và subject ổn định; không dùng email làm khóa OAuth vì email có thể đổi.
- Mỗi provider subject chỉ thuộc một user. Không auto-merge hai account; email trùng chỉ là tín hiệu cần explicit verification.
- Mật khẩu chỉ lưu hash một chiều có salt, dùng Argon2id hoặc managed equivalent. Không lưu mật khẩu có thể giải mã; secret pepper (nếu dùng) ở secret manager.

### 2.2 Đăng ký và đăng nhập local

1. Client gửi email, mật khẩu và hồ sơ tối thiểu qua HTTPS. Server validate schema, độ dài, định dạng và canonical email; không log mật khẩu.
2. Server tạo account pending_verification, hash mật khẩu, tạo verification challenge hash-only một lần và xếp email xác minh. Chưa xác minh thì không được đọc hoặc ghi dữ liệu tài chính, wallet, savings, budget, báo cáo hay transaction.
3. Response đăng ký luôn trung tính, không xác nhận email đã tồn tại. Email trùng không tạo account thứ hai và không tự liên kết Google.
4. Link hoặc code xác minh dùng CSPRNG, chỉ lưu hash, TTL đề xuất 24 giờ, resend vô hiệu challenge cũ, consume nguyên tử và audit. Verify thành công chuyển account active và rotate session nếu có.
5. Login kiểm tra password bằng constant-time hoặc managed auth. Sai email, sai mật khẩu, pending, disabled đều dùng thông báo công khai chung; chỉ account active hợp lệ nhận session.
6. Login thành công rotate session ID. Logout revoke session hiện tại; có lựa chọn revoke mọi thiết bị. Authorization luôn ở server theo user_id từ session, không tin user_id, role hay email từ client.

Khuyến nghị password policy: passphrase tối thiểu 12 ký tự, từ chối password phổ biến/bị lộ nếu có dịch vụ kiểm tra an toàn, không ép pattern làm giảm khả năng nhớ. Giá trị cuối cùng và nguồn breach list cần CC-003 chốt.

### 2.3 Google OAuth/OIDC login

Dùng Authorization Code flow với PKCE, không dùng implicit flow.

- Khi bắt đầu, server tạo state, nonce và PKCE verifier/challenge ngẫu nhiên, bind một lần với browser/session và intent login hoặc link.
- Callback chỉ chấp nhận redirect URI allowlist chính xác theo môi trường. Server kiểm tra state chưa dùng, đúng session/intent, code exchange server-side, issuer, audience, client ID, chữ ký, exp, iat, nonce, email_verified và subject.
- Subject đã liên kết account active thì login account đó và rotate session. Disabled hoặc mapping lỗi thì fail closed.
- Subject mới chỉ tạo account khi product flow cho phép và consent rõ. Google verified identity có thể làm account active, nhưng email Google không tự đổi email local chính.
- Email Google trùng email local nhưng subject chưa liên kết thì không auto-link, không auto-login và không auto-merge. Hướng dẫn trung tính: login local rồi chọn Liên kết Google hoặc dùng recovery đã xác minh.
- Hủy callback, state/nonce mismatch, code replay, token invalid, redirect không allowlist hoặc Google outage không tạo session/mapping. Xóa state tạm và audit reason code không nhạy cảm.
- Không lưu access/refresh token nếu chỉ cần login. Nếu tương lai cần, phải mã hóa/secret-manage, scope tối thiểu, rotation/revoke và không đưa token cho frontend.

### 2.4 Liên kết và hủy liên kết Google

Liên kết chỉ khởi tạo từ local session đã xác thực, yêu cầu recent authentication (đề xuất trong 10 phút), CSRF token và kiểm tra Origin. OAuth state/nonce/PKCE của intent link bind với user_id và session, không dùng state login.

Sau callback hợp lệ, hiển thị danh tính Google/email để người dùng xác nhận. Google email khác email local vẫn chỉ là phương thức login bổ sung, không tự đổi email chính. Nếu subject đã thuộc user khác, từ chối nguyên tử và không chuyển dữ liệu. DB conflict hoặc callback lặp phải rollback, giữ mapping cũ.

Không cho unlink nếu đó là phương thức xác thực cuối cùng. Google-only phải thiết lập và xác minh local password/email trước unlink; local account có password đã xác minh phải recent re-auth. Unlink cần CSRF, confirmation, audit và revoke provider token nếu có; không xóa user, transaction, wallet, savings hay lịch sử.

Đổi password, email, link/unlink, reset thành công và thay đổi quyền phải rotate session; revoke session khác theo risk policy. Mất quyền truy cập email/Google không được giải quyết bằng admin biết hoặc đặt password thay user; recovery thủ công cần quy trình support, proof và audit riêng, chưa thuộc MVP.

### 2.5 Password reset bằng OTP email/Gmail

1. Người dùng nhập email. Response luôn chung, thời gian gần tương đương cho email không tồn tại, chưa verify và delivery lỗi; không gửi thông tin enumeration.
2. Chỉ local account có email verified nhận reset OTP. Google-only được hướng dẫn đăng nhập Google hoặc thiết lập local credential trong session đã xác thực.
3. OTP dùng CSPRNG, đề xuất 6 chữ số, TTL 10 phút, một challenge hiệu lực, gắn purpose/user và chỉ lưu hash kèm salt hoặc pepper. Resend vô hiệu challenge trước.
4. Tối đa 5 lần nhập sai mỗi challenge. Hết hạn, sai quá ngưỡng, sai purpose, khác risk context hoặc đã dùng thì từ chối và invalidate. Consume nguyên tử trước đổi password để chống replay/race.
5. Reset success hash password mới, revoke session/challenge/token liên quan, không auto-login, yêu cầu login lại và gửi security notice. Không trả hoặc log password, OTP, reset token.
6. Email chứa OTP, thời hạn, cảnh báo không chia sẻ; escape mọi template variable. Không đưa OTP vào URL, referer, analytics hoặc log. Email không chứa số dư, payment, wallet, savings hay nội dung AI.
7. Email provider outage trả response chung, retry bounded qua queue và không fallback làm lộ trạng thái account.

### 2.6 Gmail/email notification opt-in/out

Mặc định notification tùy chọn là tắt. Người dùng active bật/tắt trong Settings; request state-changing phải có CSRF, session authorization và ghi preference nguyên tử. Preference nên tách theo nhóm budget warning, reminder/report và product information, với mục đích, tần suất và email đích rõ ràng.

Security email thiết yếu (verification, reset đã yêu cầu, password/email change, link/unlink, login đáng ngờ, disable) không bị tắt bởi opt-out optional. Có thể giảm nội dung nhưng không tắt cảnh báo cần thiết. Unsubscribe optional qua Settings hoặc signed one-time short-lived link; thao tác idempotent, không tiết lộ account existence.

Dùng transactional email/SMTP domain cấu hình bằng environment/secret manager, SPF/DKIM/DMARC, quota và queue bounded. Không dùng credential Gmail cá nhân. Email chỉ là thông báo Campus Coin, không được giống sao kê ngân hàng, không tạo/sửa income, payment, budget, wallet, savings hay quyền account. Mặc định không đưa số tiền/số dư/chi tiết payment vào mail.

## 3. Session, JWT/hybrid và web controls

### 3.1 Mặc định web

Khuyến nghị opaque server-side session cho browser/BFF; session ID CSPRNG tối thiểu 256 bit, DB/session store chỉ lưu hash cùng user/device metadata tối thiểu, created_at, last_seen, idle/absolute expiry và revoked_at. Cookie đề xuất __Host-cc_session với Secure, HttpOnly, Path=/, không Domain, SameSite=Lax để top-level OAuth callback hoạt động. Không lưu auth token ở localStorage/sessionStorage và không đưa token vào URL.

Rotate session sau login local, OAuth, link/unlink, reset, đổi email/password, re-auth/elevation và thay quyền. Revoke khi logout, disable, reset hoặc compromise. Baseline cần CC-003 chốt: user idle khoảng 12 giờ, absolute khoảng 7 ngày; admin idle khoảng 15 phút và absolute trong ngày. Không remember-me ngầm định.

POST/PUT/PATCH/DELETE và mọi GET có side effect phải có synchronizer hoặc double-submit CSRF token bind session, kiểm tra Origin/Referer. SameSite không thay CSRF. CORS chỉ allowlist origin; không wildcard khi credentials. Bắt buộc HTTPS/HSTS, CSP không unsafe-inline hoặc unsafe-eval nếu không có lý do được ghi nhận, frame-ancestors none hoặc X-Frame-Options, Referrer-Policy, Permissions-Policy và content type đúng.

### 3.2 Nếu CC-003 cần JWT hoặc hybrid

JWT chỉ thêm khi có consumer độc lập như mobile/API/worker; không phát hành cho browser nếu session đủ dùng. Access token phải ngắn hạn, kiểm tra allowlist thuật toán, issuer, audience, subject, nonce và expiry; key tách môi trường và rotation. Refresh token opaque, rotate mỗi lần dùng, lưu hash, phát hiện reuse và revoke family. Token không ở localStorage; nếu đi bằng cookie phải có CSRF. Logout/reset/disable phải revoke hoặc deny-list/version. Không để claim client tự cấp role. Không nên phát hành đồng thời session và JWT cho cùng browser vì tăng bề mặt logout, rotation và CSRF.

## 4. Threat model

Tài sản: credential/hash, session/challenge/token, Google subject, email/PII, identity và quyền truy cập transaction/budget/wallet/savings, preference, audit và secret cấu hình. Boundary: browser-API, API-DB/session, API-Google, API-email provider, app-log và admin-API.

| Mối đe dọa | Hậu quả | Kiểm soát |
|---|---|---|
| Credential stuffing/brute force | Chiếm account, lạm dụng email | Argon2id, rate limit IP + account, backoff, step-up/CAPTCHA sau ngưỡng, không lock vĩnh viễn |
| Account enumeration | Lộ email/account/Google mapping | Message/status/timing chung, delivery queue, rate limit, audit nội bộ redact |
| Session fixation/theft/XSS | Đọc/sửa dữ liệu tài chính | Rotate/revoke, HttpOnly Secure cookie, CSP, escaping/sanitize, không storage token |
| OAuth CSRF/mix-up/replay | Login/link nhầm account | state + nonce + PKCE bind intent/session, redirect allowlist, consume once, issuer/audience checks |
| Auto-link email | Chiếm hoặc merge nhầm | Subject issuer+sub, explicit link từ local session, recent auth, không auto-merge |
| OTP brute force/replay/race | Reset trái phép | Hash-only, CSPRNG, TTL, max attempts, one active, atomic consume, resend invalidation |
| Email/Gmail bị chiếm | Recovery trái phép | Verified email, security notice, revoke sessions, không bypass support proof |
| CSRF | Đổi credential/preference/link | CSRF token + Origin + SameSite, không stateful GET |
| SQL/NoSQL injection | Đọc/sửa account/audit | Schema validation, parameterized ORM/query, server ownership check |
| Malicious admin/insider | Lộ PII hoặc reset trái phép | Least privilege, entry point riêng, step-up/MFA mục tiêu, reason/ticket/audit |
| Provider/DB outage | Bypass hoặc trạng thái sai | Fail closed, không guest fallback, transaction/idempotency, retry bounded |
| Log/AI/email leakage | Lộ secret/PII | Redact password/OTP/token, không đưa auth data vào AI, nội dung mail tối thiểu |

## 5. Rate limit và enumeration

Baseline để CC-003 hiệu chỉnh: login khoảng 5 lần/15 phút theo account key và 20/IP/15 phút; register/reset request khoảng 3/15 phút theo account và 20/IP/giờ; resend verification/OTP khoảng 3/15 phút; verify OTP tối đa 5/challenge; OAuth start/callback/link theo session/IP và state một lần; notification qua per-user/day và provider quota. Áp dụng đồng thời IP, canonical email/account key, device/session và global quota, với backoff và step-up thay vì lock vĩnh viễn.

Vượt ngưỡng vẫn trả message chung, không nói bucket nào bị chặn. Tách reason code trong log đã redact khỏi response. Timing nên gần tương đương và email delivery status không được lộ ra UI. CAPTCHA chỉ là step-up, không thay password/OTP controls.

## 6. Failure handling

| Tình huống | Hành vi quan sát được | Xử lý nội bộ |
|---|---|---|
| Email invalid/duplicate/unknown | Thông báo chung, không session | Reason code + email hash/pseudonym, không password/OTP |
| Email provider timeout | Response chung, không lộ OTP | Retry bounded, queue/alert, không log body/mã |
| OTP expired/wrong/used | Từ chối, yêu cầu challenge mới | Mark expired/used/invalid; atomic; đếm risk |
| OAuth state/nonce/code sai | Không login/link/tạo account | Xóa state, log reason/correlation không chứa token |
| Google unavailable/cancel | Giữ local auth, cho retry | Circuit/latency metric, không mapping nửa chừng |
| Subject duplicate/DB conflict | Rollback link, mapping cũ giữ nguyên | Constraint/error audit |
| Session/DB outage | Fail closed, không đọc dữ liệu | Health alert; không client-trusted fallback |
| Disabled/suspicious session | Từ chối và revoke phù hợp | Audit reason bảo vệ; security notice nếu có email |
| Reset success | Không auto-login, login lại | Revoke sessions/challenges, audit + security mail |
| Preference update error | Không đổi nửa chừng, retry | Chỉ commit preference nguyên tử |

Mọi lỗi người dùng bằng tiếng Việt, không stack trace, SQL, provider detail, subject hay PII thừa.

## 7. Audit và privacy

Audit append-only hoặc chống sửa/xóa cho registration, email verify, login success/failure/throttled, logout/revoke-all, OAuth login/link/unlink, reset requested/failed/succeeded, email change, notification change, disable/enable, admin action và risk event. Event có event_id, timestamp UTC, user pseudonym, action/outcome/reason, correlation ID, IP truncate/HMAC hoặc policy, device coarse. Không ghi password, OTP, session/token, OAuth code/ID/refresh token, reset URL hay full Google payload.

Auth audit tách quyền đọc, access cũng được audit, retention hữu hạn theo privacy policy. Thu thập tối thiểu email, hash và subject cần thiết; không inbox/contact/scope Gmail. Subject/email cần bảo vệ khi lưu; key ở secret manager, TLS/at-rest encryption theo CC-003. Tách ownership auth và business; AI/JEV không nhận credential, challenge, session hoặc auth audit PII.

Admin không xem password/OTP, không tự login thay user, không sửa lịch sử giao dịch; chỉ disable/revoke hoặc khởi động support flow với actor, target, reason, ticket/correlation. Admin session ngắn, least privilege và MFA/step-up là mục tiêu trước production.

## 8. Tiêu chí chấp nhận

1. Registration tạo pending account, chỉ lưu hash, gửi verification challenge một lần và chặn dữ liệu tài chính trước verify.
2. Email mới/trùng/invalid/delivery lỗi không làm lộ account existence qua response/status/timing đáng kể.
3. Chỉ active credential hợp lệ nhận session; pending/disabled/sai login không lộ lý do nhạy cảm.
4. Cookie session có Secure, HttpOnly, __Host policy phù hợp và SameSite; token không ở URL/localStorage; session rotate sau auth.
5. OAuth chỉ thành công với redirect allowlist, state, nonce, PKCE, issuer/audience/signature/expiry/email_verified hợp lệ; state/code dùng một lần.
6. Google subject đúng mapping login đúng account; email trùng không auto-link/merge.
7. Link yêu cầu local session, recent re-auth, CSRF và intent link; subject thuộc user khác bị từ chối nguyên tử.
8. Không unlink phương thức cuối; unlink không xóa user hoặc dữ liệu miền.
9. OTP hash-only, CSPRNG, TTL 10 phút đề xuất, tối đa 5 attempts, resend invalidation, atomic consume và không replay.
10. Reset đổi hash, revoke challenge/session theo policy, không auto-login, gửi security notice, không log secret.
11. Verification/link/reset token hết hạn hoặc đã dùng bị từ chối; không có nhiều challenge hiệu lực.
12. Optional email mặc định off, opt-in/out có CSRF/authorization, security email vẫn hoạt động; email không đọc Gmail và không tạo transaction.
13. Login/register/reset/OTP/OAuth/email send có limit IP + account/device/global; vượt ngưỡng không enumeration.
14. State-changing request có CSRF/Origin; UI/template escape và sanitize; CSP/clickjacking policy không bypass tùy tiện.
15. User chỉ truy cập account và dữ liệu của mình; admin không xem password/OTP; security events audit redact.
16. Provider/DB/session outage và duplicate/conflict đều fail closed, không bản ghi nửa chừng.
17. Không có secret thật trong repo, log, response, email hoặc handoff; secret lấy từ environment/secret manager.
18. Tài liệu tích hợp giữ nguyên income/payment, VND, Asia/Ho_Chi_Minh, immutable history, wallet/savings và budget warning invariants.

## 9. Ngoài phạm vi

- Ngân hàng/open banking, thẻ, ví tiền thật, payment thật, cho vay, BNPL, lãi suất, KYC/AML.
- Đọc/sync Gmail inbox, Gmail contacts, Gmail API read/send, gửi thay mailbox cá nhân; Gmail chỉ là email đích.
- OAuth ngoài Google, enterprise SSO, magic-link/passwordless, SMS OTP, TOTP/hardware MFA.
- Auto account merge, chuyển dữ liệu giữa account, support recovery khi mất mọi phương thức; chỉ guardrail được nêu.
- AI quyết định auth/risk, AI nhận credential hoặc tạo giao dịch; AI/JEV vẫn advisory.
- Code/schema/migration/API/provider cụ thể, penetration test và chính sách pháp lý hoàn chỉnh.
- Marketing email ngoài preference; email không phải sao kê/báo cáo ngân sách.

## 10. Rủi ro và câu hỏi mở

| Chủ đề | Câu hỏi/rủi ro | Phương án bảo thủ |
|---|---|---|
| CC-003 managed/custom | Semantics hash/session/reset khác nhau | Provider phải chứng minh control; ưu tiên opaque server session |
| Session/DB HA | Outage làm revoke không nhất quán | Fail closed, không JWT/guest fallback, chốt TTL/backup |
| Email provider | Delay, spam, quota, residency | Domain transactional, SPF/DKIM/DMARC, queue bounded |
| OTP | TTL/attempts/6 hay 8 số | 6 số, 10 phút, 5 attempts, one active; review trước go-live |
| Google matching | Email đổi hoặc trùng local | issuer+subject, explicit link, không auto-link |
| Cookie topology | OAuth cross-site cần SameSite | SameSite=Lax + state/PKCE/CSRF; không nới None nếu chưa cần |
| Admin/MFA | SRS yêu cầu admin riêng nhưng chưa chốt | Entry point riêng, short session, least privilege, MFA target |
| Notification content | Email có thể bị forward | Mặc định không số dư/payment; consent riêng nếu đổi |
| Audit retention | IP/UA là PII | Hash/truncate/minimize, access control, retention hữu hạn |
| Vocabulary drift | SRS cũ dùng expense/chi phí | Canonical dùng payment/thanh toán, auth không tạo type |

## 11. Điểm cần tích hợp

- AUTHENTICATION.md: User/credential/external identity/session/challenge, local/OAuth/link/unlink/reset/verify, cookie/CSRF/rate limit, admin boundary và acceptance.
- ARCHITECTURE.md: browser/API/DB/session/Google/email boundaries, queue/failure, HTTPS/headers, secrets và ADR session/JWT/hybrid; CC-003 chốt provider.
- DOMAIN-MODEL.md: auth aggregates, ownership, state và notification preference; không sửa aggregate transaction immutable.
- PRD.md: UX tiếng Việt, neutral errors, Gmail chỉ email đích, notification không mang nghĩa ngân hàng.
- ADMIN-OPERATIONS.md: disable/revoke/support flow, least privilege, reason/ticket/audit, cấm xem password/OTP và sửa lịch sử.
- AI-JEV.md: cấm credential/challenge/session/auth PII; deterministic money logic không giao AI.
- ROADMAP.md: CC-003 trước triển khai; phase local+verify, session/rate limit, Google login/link, OTP reset, notification; MFA/support recovery là roadmap.

## 12. Phụ thuộc và thứ tự chốt

CC-003 phải chốt auth ownership, email normalization, DB/session store, idle/absolute TTL, OTP TTL/attempts, audit retention, admin MFA, OAuth redirect URI theo môi trường và email provider trước schema/API. Sau đó threat model review lại theo topology thật, kiểm thử code replay, state/nonce/PKCE, OTP race/replay, enumeration, CSRF/XSS, provider outage và revoke. Không triển khai trong handoff này.

Kết luận: chọn opaque server-side session cho web, Google Authorization Code/PKCE, local password đã verify, OTP reset hash-only một lần, explicit link không auto-link theo email và notification Gmail opt-in với nội dung tối thiểu. Mọi credential/identity change cần recent auth, CSRF và audit; lỗi nhạy cảm fail closed.