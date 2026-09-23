# ADR-0006: JEV tùy chọn qua OpenRouter

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận có điều kiện
- **Người quyết định:** Team Leader (người dùng)

## Bối cảnh

Sản phẩm có thể cần gợi ý danh mục nhưng không cần model tự host, không muốn AI nắm quyền tài chính và chưa có bằng chứng ổn định về endpoint, model, quota, chi phí hoặc privacy policy.

## Quyết định

JEV chỉ là adapter backend tùy chọn qua OpenRouter, feature flag mặc định tắt. Day-1 phải kiểm chứng typed System One/Decisions contract, transport model, error, `usage.cost`, latency, quota và privacy. Use case MVP duy nhất là gợi ý một category từ tập ứng viên giới hạn trước khi submit; user phải xác nhận hoặc đổi. Manual picker luôn hoạt động.

Không gọi từ browser, không gửi secret/raw ledger/balance, không gọi trong money transaction, không dùng chat-completions rồi tự parse JSON, không để JEV tính/authorize/write tiền.

## Phương án bị loại

- **JEV bắt buộc:** provider failure sẽ làm hỏng money path.
- **Chat completion và parse prose:** không bảo đảm typed contract.
- **Tự host model:** vượt phạm vi vận hành năm ngày.
- **JEV làm financial authority:** rủi ro an toàn không chấp nhận.

## Hệ quả

JEV lỗi, timeout, quota, schema hoặc privacy thì trả manual fallback. JEV không đạt gate vẫn cho phép launch nếu core path đạt.

## Rủi ro và kiểm chứng

Developer D sở hữu probe, redaction, cost/latency cap, synthetic evaluation, kill switch và release evidence.
