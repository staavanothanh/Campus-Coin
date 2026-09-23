# AI-JEV — Ranh giới, pipeline và an toàn

## 1. Mục đích

`jev` là model/adapter AI tùy chọn dùng để giảm thao tác nhập và tạo thông tin diễn giải từ dữ liệu Campus Coin. JEV là **advisory**: có thể trích xuất, phân loại, tóm tắt hoặc gợi ý; không phải nguồn sự thật cho tiền. Backend/domain services vẫn là authority cho ví, tiền tiết kiệm, budget, ledger, authorization và trạng thái giao dịch.

Sản phẩm không gọi JEV là cố vấn tài chính, không hứa dự đoán lợi nhuận và không dùng output để quảng cáo cho vay, BNPL, banking hoặc pay-later.

## 2. Use case được phép

### Phân loại khi nhập

Từ description tiếng Việt do user nhập, JEV có thể đề xuất category áp dụng cho `income` hoặc `payment`, confidence, rationale ngắn và model/version. User phải xác nhận hoặc chọn lại; category cuối phải qua domain validation (đúng owner, active, đúng applies_to). Nếu confidence thấp/response không hợp lệ, picker thủ công là đường chính.

### Trích xuất hỗ trợ (tùy chọn)

JEV có thể trích xuất amount/date/merchant từ text/CSV nếu user yêu cầu. Backend phải parse schema, kiểm tra amount VND nguyên dương, ngày theo `Asia/Ho_Chi_Minh`, loại giao dịch và category; không tự commit chỉ vì model trả JSON.

### Tóm tắt tháng/gợi ý

Backend tổng hợp deterministic các số: tổng `income`, tổng `payment`, budget usage, xu hướng và dữ liệu đã được phép. JEV chỉ chuyển tập số liệu đó thành summary tiếng Việt dễ đọc hoặc gợi ý hành động. Không gửi raw ledger nếu aggregate đủ; không cho JEV tính lại số dư. Insight phải ghi input period/version, model/version, generated_at, confidence/quality status và có thể tái tạo.

## 3. Những điều JEV không được làm

- Không tính authoritative `wallet_balance`, `savings_balance`, `budget_used`.
- Không quyết định payment có được authorize, không bypass wallet check/DB transaction/CSRF/role.
- Không tự tạo, sửa, xóa ledger; không sửa category lịch sử mà không có xác nhận.
- Không biến internal savings transfer thành `income`/`payment`.
- Không đọc session secret, password, OTP, Google token, admin note hoặc dữ liệu user khác.
- Không chẩn đoán/tư vấn tài chính được chứng nhận, không khuyến nghị khoản vay/BNPL/lãi suất/đầu tư.
- Không huấn luyện lại hoặc lưu dữ liệu user ngoài retention/consent đã công bố.

## 4. Pipeline sync cho gợi ý category

```text
User nhập description/type
  -> API auth + validate + redact/minimize
  -> JEV adapter (schema, timeout, model/version)
  -> Validate category ID/label + confidence
  -> UI hiển thị “Đề xuất”, cho sửa/xác nhận
  -> Domain service tạo income/payment theo lựa chọn cuối
  -> Lưu provenance (optional) và feedback correction
```

Đặc tính:

- Timeout ngắn và bounded; request JEV không mở transaction money lâu.
- Response phải parse schema chặt: `suggestedCategory`, `confidence 0..1`, `reasonCode` tùy chọn, model/version; field lạ bỏ qua.
- Không gọi JEV nếu user đã chọn category rõ ràng trừ khi user yêu cầu.
- Correction/user override được lưu làm feedback aggregate, không gửi raw PII mặc định.
- Nếu timeout, quota, schema lỗi hoặc confidence dưới threshold cấu hình: trả `jev_unavailable/low_confidence`, dùng manual picker; giao dịch vẫn có thể tạo nếu user chọn hợp lệ.

## 5. Pipeline async cho insight tháng

1. Scheduler tạo job key duy nhất `user + local_month + data_version + insight_kind`.
2. Worker đọc aggregate deterministic đã scope user và permission; loại secret/raw detail không cần thiết.
3. Adapter gọi JEV với timeout, retry bounded cho lỗi tạm thời; không retry vô hạn.
4. Validate output length/language/safety/schema; loại prompt injection trong description bằng cách coi description là data, không instruction.
5. Lưu insight với status `generated`, `failed`, `needs_review` hoặc `stale`; lưu model/version/input version và timestamp.
6. UI hiển thị rõ “Tóm tắt do AI tạo” và link dữ liệu nền; user có thể bỏ qua/ẩn/gắn cờ.
7. Khi ledger/budget correction tạo data version mới, insight cũ gắn stale hoặc regenerate; không sửa lịch sử insight âm thầm.

JEV/email/worker failure không rollback ledger hoặc chặn tạo `income`/`payment`. Failed job có dead-letter/alert và nút retry an toàn bằng idempotency.

## 6. Privacy và bảo vệ dữ liệu

- Data minimization: ưu tiên aggregate; description/merchant chỉ gửi khi cần phân loại và có consent/điều khoản rõ.
- Tách user ID nội bộ khỏi prompt; dùng correlation/job ID không đảo ngược.
- Redact email, phone, OTP, cookie, password, access token, địa chỉ và PII không cần thiết.
- TLS khi truyền; credential JEV trong secret manager; không log prompt/response đầy đủ mặc định.
- Xác định retention/deletion theo loại dữ liệu, provider policy và yêu cầu người dùng; tránh gửi dữ liệu lịch sử vĩnh viễn.
- Nếu provider dùng dữ liệu để training, chỉ bật khi có đánh giá/consent phù hợp; mặc định không cho phép với dữ liệu financial user.
- User có thể tắt tính năng AI; khi tắt, workflow manual và report deterministic vẫn hoạt động.
- Admin không đọc raw prompt/response nếu không cần điều tra; chỉ xem metadata masked.

## 7. Confidence, override và human control

- Threshold không được biến thành authorization. Nó chỉ quyết định auto-show suggestion hay yêu cầu manual selection.
- UI phải phân biệt “Đề xuất của JEV” với category đã xác nhận.
- Cho phép user override trước commit và sửa feedback sau đó bằng flow append-only metadata; không mutate historical transaction.
- Insight có disclaimer ngắn, ngôn ngữ tiếng Việt, không hứa chắc chắn và không đưa lời khuyên ngoài phạm vi.
- Với output nhạy cảm/không an toàn, status `needs_review`/ẩn, không gửi Gmail notification tự động.

## 8. Đánh giá và giám sát

Theo dõi tách biệt:

- Category suggestion acceptance/override theo type/category (không làm lộ description).
- Parse/schema failure, timeout, fallback rate, latency, token/cost và provider availability.
- Insight factual consistency bằng deterministic cross-check: số trong text phải khớp aggregate cho phép; không cho phép số mới do JEV bịa.
- Vietnamese language/clarity/safety review trên tập dữ liệu synthetic/anonymized.
- Drift theo model/version và rollback adapter nếu quality/safety giảm.

Không dùng acceptance rate đơn độc để chứng minh tính đúng; điều kiện chặn là mọi money invariant vẫn pass khi JEV tắt, sai hoặc bị prompt injection.

## 9. Acceptance criteria

1. Tắt JEV vẫn tạo được `income`/`payment`, tính wallet/savings/budget và cảnh báo bằng code deterministic.
2. JEV output không hợp schema/timeout/low confidence được fallback manual; không tạo giao dịch tự động.
3. Payment vẫn bị chặn khi wallet thiếu dù JEV gợi ý cho phép; budget overrun vẫn chỉ warning.
4. Category đề xuất không đúng applies_to/owner/active bị reject; user có thể override.
5. Monthly insight chỉ dùng aggregate đã kiểm chứng; số hiển thị khớp backend, output sai bị ẩn/review.
6. Job async idempotent, retry bounded, failed status quan sát được; lỗi không rollback ledger.
7. Prompt/response không chứa secret; payload được minimize/redact và retention được ghi nhận.
8. AI-generated text có nhãn rõ, bằng tiếng Việt và không quảng bá banking/lending/BNPL/pay-later.

## 10. Out-of-scope

- Autonomous agent có quyền thực hiện payment, savings transfer, budget change hoặc account action.
- Chấm điểm tín dụng, tư vấn đầu tư, dự báo lợi nhuận, tính lãi suất hoặc chọn khoản vay.
- Fine-tune/training trên dữ liệu tài chính nhận dạng được nếu chưa có governance/consent.
- Chat tự do với quyền truy cập toàn bộ ledger/admin; OCR/import tự commit không qua domain validation.
