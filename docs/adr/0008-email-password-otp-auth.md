# ADR-0008: Xác thực bằng email, mật khẩu và OTP

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader — Hiệp
- **Nguồn quyết định:** Chỉ đạo trực tiếp của Team Leader trong phiên làm việc ngày 2026-09-24

## Bối cảnh

Nhánh `hiep` đã triển khai luồng email và OTP. Canonical docs cùng ADR-0001/0007 vẫn mô tả Google OAuth-only, làm nhóm hiểu sai trạng thái và hướng đi của Developer A. Team Leader quyết định dùng luồng email cho MVP và yêu cầu cập nhật ADR/canonical docs để toàn nhóm theo cùng một quyết định.

## Quyết định

MVP dùng đúng hai luồng:

```text
register → verify OTP → login → session
forgot password → reset password
```

- Đăng ký tạo OTP qua email; chỉ tạo user và credential sau khi OTP hợp lệ.
- Đăng nhập bằng email và mật khẩu đã băm; thành công tạo opaque server-side session trong cookie bảo mật.
- Quên mật khẩu trả thông báo chung; OTP hợp lệ đổi mật khẩu và thu hồi các session cũ.
- Mọi mutation áp dụng Origin/CSRF; owner lấy từ session. Rate limit, lockout/backoff, OTP expiry/attempts/resend/single-use, session revoke/expiry, logging, email timeout/retry và lỗi API phải được kiểm chứng trước production.
- Email outbound đi qua server-side adapter và SMTP tương thích. Nhà cung cấp cụ thể chưa được chốt bằng ADR hoặc runtime evidence; phải ghi rõ khi được lựa chọn và kiểm chứng.
- **Không dùng Google OAuth cho đăng nhập Campus Coin. Không dùng Gmail credential cá nhân, Gmail inbox hoặc Gmail API.** Không tự động liên kết tài khoản theo email.
- ADR-0002 về opaque session, ADR-0003 về cổng kiểm chứng MySQL, phần quyết định không dùng custom email domain trong ADR-0004, ADR-0005 về miền tiền và ADR-0006 về JEV vẫn giữ hiệu lực. ADR này thay thế quyết định auth trong ADR-0001, phần nói không dùng email security/reset trong ADR-0004 và phần phạm vi auth của ADR-0007; các ADR cũ vẫn được giữ nguyên làm lịch sử.

## Hệ quả

- Người dùng cần địa chỉ email truy cập được để xác minh và khôi phục tài khoản.
- SMTP/provider trở thành dependency của đăng ký và reset mật khẩu; thiếu cấu hình hoặc provider lỗi phải fail closed, không gửi OTP vào log/dev fallback.
- Migration `0004_email_auth.sql` thuộc schema auth; sự tồn tại của file không chứng minh migration đã chạy trên bất kỳ DB nào.
- Bảng `auth_identities` từ migration `0001` được giữ lại như schema lịch sử và không được auth runtime hiện tại đọc/ghi; việc còn bảng này không bật lại Google OAuth. Không sửa migration đã commit; mọi cleanup schema cần migration mới và xác minh DB/data trước.
- Tài khoản hiện có từ một phương thức khác không được tự động merge. Di chuyển hoặc liên kết danh tính cần quyết định riêng.
- Chấp nhận quyết định không đồng nghĩa production readiness. Rate limit, E2E DB/email, provider contract, API/domain integration, CI và vận hành DB vẫn là các gate phải có evidence.

## Phương án bị loại

- **Google OAuth-only:** không còn là phương thức auth của MVP theo quyết định của Team Leader.
- **Gmail cá nhân làm SMTP hoặc đọc inbox:** không được dùng vì đưa credential cá nhân vào hệ thống và vượt quá nhu cầu gửi OTP.
- **Auto-link theo email:** có nguy cơ chiếm/gộp nhầm account.
- **JWT trong browser:** tiếp tục không dùng; session opaque phía server là nguồn phiên.

## Kiểm chứng và rủi ro

Production gate gồm đăng ký, OTP đúng/sai/hết hạn/quá attempts/resend, login sai/rate-limit, forgot/reset, session expiry/revoke/logout, cookie/CSRF/Origin/IDOR, DB/email outage, log redaction và user isolation. Cần migration state đúng, DB cô lập cho integration, email provider đã chọn và evidence backup/restore. Chưa có bằng chứng nào trong quyết định này chứng minh các gate trên đã đạt.
