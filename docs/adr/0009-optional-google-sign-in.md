# ADR-0009: Google Sign-In là phương thức bổ sung

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader — Hiệp
- **Nguồn quyết định:** Chỉ đạo trực tiếp của Team Leader trong phiên làm việc ngày 2026-09-24

## Bối cảnh

Sau khi chốt email/password/OTP tại ADR-0008, Team Leader quyết định bổ sung Google Sign-In như một lựa chọn đăng nhập. Luồng email hiện tại tiếp tục hoạt động độc lập; cấu hình Google chưa có thì ứng dụng không hiển thị nút Google.

## Quyết định

- Giữ nguyên các luồng email/password/OTP và session của ADR-0008.
- Bổ sung Google OpenID Connect Authorization Code flow phía server, dùng PKCE S256, state, nonce, callback HTTPS và các scope tối thiểu `openid email profile`.
- Dùng Google `sub` làm định danh ổn định trong `auth_identities`; không tự động gộp account chỉ vì email trùng.
- Người có tài khoản email hiện hữu phải đăng nhập trước rồi chủ động kết nối Google. Nếu Google email trùng với account khác mà chưa được kết nối, yêu cầu người dùng đăng nhập bằng phương thức hiện hữu rồi kết nối.
- Google account mới có thể tạo user sau khi server xác minh ID token và `email_verified=true`.
- Cả hai phương thức đều tạo opaque server-side session trong cookie hiện có. Không lưu Google access token hoặc refresh token trong DB/browser.
- Không dùng Gmail credential cá nhân, Gmail inbox hoặc Gmail API; OAuth chỉ dùng cho đăng nhập và danh tính.
- OAuth chỉ bật khi đủ `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` và `SESSION_SECRET`. Khi chưa cấu hình, email/password/OTP vẫn hoạt động.
- Dùng lại bảng `auth_identities` trong migration `0001`; không tạo migration mới cho quyết định này.

## Hệ quả

- ADR-0008 tiếp tục sở hữu email/password/OTP; ADR-0009 bổ sung Google Sign-In và chỉ thay thế phần cấm Google OAuth/account linking của ADR-0008.
- Việc kết nối account luôn do người dùng đang có session yêu cầu; callback phải xác nhận session còn hiệu lực và đúng user đã bắt đầu flow.
- State cookie ngắn hạn có chữ ký, `HttpOnly`, `SameSite=Lax`; production đặt `Secure`. Google code được đổi ở server và ID token phải được SDK xác minh theo audience, nonce và verified email.
- Cần OAuth client, callback URI và secrets do owner cấu hình trong local/deploy secret store. Không đưa giá trị secrets vào chat, source hoặc tài liệu.
- Quyết định không đồng nghĩa provider đã được cấu hình hoặc flow live đã kiểm chứng. Callback thật, DB integration, deploy secret, domain, CI và security review vẫn là gate.

## Phương án bị loại

- **Google OAuth thay hoàn toàn email/OTP:** không được chọn; email vẫn là luồng chính sẵn có.
- **Tự động merge theo email:** không được chọn vì có thể liên kết sai chủ tài khoản.
- **Gmail API/inbox hoặc credential Gmail cá nhân:** không cần cho login và không được dùng.
- **Lưu Google token để đăng nhập về sau:** không cần; server chỉ dùng token trong callback để xác minh danh tính rồi hủy khỏi luồng xử lý.

## Kiểm chứng và rủi ro

- Kiểm tra state, chữ ký cookie, TTL, PKCE, nonce, audience, verified email, callback allowlist, account collision, explicit link owner và token/session boundary.
- Chạy test hẹp, CI và MySQL integration chỉ trên DB cô lập. Live Google callback chỉ được coi là đạt sau khi owner cấu hình client và thực sự hoàn tất login/link.
- Không log password, OTP, OAuth code, ID/access/refresh token, cookie, raw claim hoặc client secret.
