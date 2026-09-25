# Handoff triển khai và hoàn thiện điểm — 2026-09-26

Thư mục này gom những việc cần người phụ trách khác chạy hoặc hoàn thành. Code dùng chung đã được cập nhật trong nhánh `hiep`; test mới cần CI xác nhận trước khi coi là pass.

## Việc theo người phụ trách

- [Developer B — DB clone và benchmark](./DEV-B-DB-AND-BENCHMARK.md): xác nhận DB clone cô lập, chạy MySQL suites và đo hiệu năng có thể lặp lại.
- [Developer C — UI sản phẩm và khả năng truy cập](./DEV-C-PRODUCT-UI.md): hoàn thiện trải nghiệm domain để tăng điểm chức năng, UI/accessibility và tương thích.
- [Developer D — Vercel, SMTP và release](./DEV-D-VERCEL-SMTP.md): cấu hình Preview, kiểm tra SMTP/outage, lưu evidence và chỉ release Production sau approval.

## Nguồn chuẩn

- API: [`../../contracts/openapi.yaml`](../../contracts/openapi.yaml)
- Auth/security: [`../../AUTHENTICATION.md`](../../AUTHENTICATION.md)
- Scoring/evidence: [`../../QUALITY-AND-SCORING.md`](../../QUALITY-AND-SCORING.md)
- DB/staging rules: [`../../DB-STAGING-TESTING.md`](../../DB-STAGING-TESTING.md)
- Trạng thái hiện hành: [`../../DELIVERY-PLAN.md`](../../DELIVERY-PLAN.md)

Không gửi password, OTP, session cookie, OAuth token, SMTP secret, database password hoặc private CA trong tài liệu/chat. Chỉ lưu kết quả đã làm sạch và thông tin môi trường không nhạy cảm.
