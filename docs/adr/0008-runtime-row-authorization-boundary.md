# ADR-0008: Ranh giới owner authorization và runtime DB role

- **Ngày:** 2026-09-25
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader (ủy quyền quyết định trong yêu cầu xử lý `BLK-GRANT-01`)

## Bối cảnh

Ứng dụng dùng một runtime MySQL principal dùng chung cho các user. MySQL không nhận được trusted `user_id` của session API trên connection đó. Trigger có thể kiểm tra cấu trúc row, quan hệ owner giữa các row, category/type và projection; trigger không thể biết caller SQL đang đại diện cho user nào.

## Quyết định

- API/application service là boundary duy nhất cho row-level owner authorization. `user_id` lấy từ trusted server session; repository luôn scope mutation/read theo owner đó.
- Database tiếp tục enforce immutable/append-only history, FK/composite owner consistency, domain shape, projection trigger và table/column-level least privilege.
- Runtime DB credential chỉ thuộc server. Runtime principal không phải credential cho user, admin console hoặc tooling truy vấn tùy ý.
- Raw SQL chạy bằng runtime credential có thể sửa các cột được cấp quyền trên row của owner khác và có thể insert audit row. Đây là residual risk được chấp nhận trong threat model hiện tại; credential/runtime compromise được xếp incident integrity nghiêm trọng và phải rotate, điều tra, reconcile/restore.
- Acceptance test owner isolation kiểm tra service/API boundary. Raw SQL tests chỉ kiểm tra các invariant mà database thực sự có thể chứng minh; không tuyên bố trigger thực thi session owner.
- Nếu cần chống row-level direct DML ngay cả khi runtime credential bị dùng tùy ý, phải thiết kế identity binding ở database boundary hoặc principal riêng có scope tin cậy; quyết định đó cần ADR mới, không được giả lập bằng session variable do runtime tự set.

## Phương án bị loại

- **Trigger kiểm tra `NEW.user_id = OLD.user_id` như authorization:** chỉ ngăn đổi owner field, không xác thực owner của người gửi câu SQL.
- **Session variable do application set:** caller đang có cùng DB credential cũng có thể set/giả mạo variable đó.
- **Claim rằng column grants cung cấp row-level isolation:** MySQL grant trên table/column không giới hạn row theo end-user.

## Hệ quả

`BLK-GRANT-01` được chốt về kiến trúc ở service-layer row authorization; còn mở evidence MySQL cho migration role/trigger `DEFINER`, runtime grants, direct projection denial và service/API cross-owner rejection. Audit insert chỉ được tạo qua domain services trong request path; không có API cho caller tự tạo audit event.

## Rủi ro và kiểm chứng

CI dùng migration principal giới hạn để tạo trigger, xác nhận trigger `DEFINER`, sau đó chạy integration bằng runtime principal riêng. Test owner B không update được category, issue hoặc budget của owner A qua service/API. Test API không chấp nhận forged audit write. Production grants, cloud TLS và restore vẫn cần evidence riêng; CI không thay thế evidence đó.
