# JEV — Ranh giới OpenRouter và an toàn

> JEV là tính năng tùy chọn trong MVP, dùng TypeSafe JEV qua OpenRouter nếu qua cổng kiểm chứng. Không tự host. Feature flag mặc định tắt.

## 1. Bằng chứng cần dùng

- [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one.md): quyết định có kiểu, không phải chat prose.
- [TypeSafe API](https://docs.typesafe.ai/api.md): state, model, questions và kết quả Choice.
- [TypeSafe confidence](https://docs.typesafe.ai/confidence.md): confidence là tín hiệu để đặt ngưỡng, không phải bằng chứng đúng tuyệt đối.
- [OpenRouter JEV](https://openrouter.ai/docs/guides/community/jev) và [System One API](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md).
- [OpenRouter privacy](https://openrouter.ai/docs/guides/privacy/data-collection.md): retention/provider policy phải kiểm tra hiện hành.

Link là nguồn tham khảo; endpoint, model, quota, cost và policy chỉ được coi là sự thật sau probe Day 1.

## 2. Cổng tương thích

Developer D phải chạy probe server-only và ghi lại endpoint, transport model ID, typed Choice response, probabilities/confidence, HTTP errors, timeout, quota, `usage.cost`, latency và privacy configuration.

Nếu typed contract không xác minh được, JEV giữ disabled/deferred. Không gọi chat completion rồi tự parse JSON/prose. Không tự host để thay thế.

## 3. Trường hợp sử dụng được phép

JEV chỉ gợi ý một category từ candidate set giới hạn cho description của `income` hoặc `payment`. User phải xác nhận hoặc đổi. Domain kiểm tra owner, transaction type, category active và idempotency trước khi commit.

JEV không được:

- tính wallet, savings, budget, amount hoặc date;
- authorize payment;
- tạo/sửa/xóa ledger, savings hoặc budget;
- đọc balance, raw ledger, Google claim, session, secret hoặc admin note;
- tạo tư vấn tài chính, loan/BNPL hoặc autonomous action.

## 4. Hợp đồng adapter

Request nội bộ server-only:

```json
{
  "transactionType": "income|payment",
  "descriptionRedacted": "văn bản ngắn đã loại PII",
  "candidates": [{"id": "opaque-category-key", "semanticLabel": "nhãn ngắn"}],
  "locale": "en|vi",
  "contractVersion": "jev-category-v1"
}
```

Response chuẩn hóa:

```json
{
  "status": "suggested|manual|disabled|unavailable",
  "categoryId": "opaque-category-key|null",
  "confidence": 0.0,
  "probabilities": {},
  "modelId": "provider snapshot|null",
  "provider": "openrouter|null",
  "usageCostUsd": 0.0,
  "reasonCode": "low_confidence|timeout|quota|schema|flag_off|null"
}
```

Validate schema, candidate membership, `other_or_uncertain`, probability/confidence range, response size và cost. Malformed output phải fallback manual, không đoán.

## 5. Chính sách runtime

- Backend-only; `OPENROUTER_API_KEY` không tới browser.
- `JEV_CATEGORY_SUGGESTION_ENABLED=false` mặc định.
- Timeout, rate, concurrency, input length, candidate count và daily spend phải bounded.
- Không retry mặc định; retry chỉ khi evidence cost/latency cho phép.
- Không giữ MySQL money transaction trong lúc chờ OpenRouter.
- Timeout, 4xx/5xx, 402/403/404/413/429, schema/privacy/low-confidence đều trả manual picker.
- Log chỉ metadata đã mask: status, latency, model snapshot, fallback reason và cost bucket.

## 6. Privacy và đánh giá

Redact email, phone, address, token, cookie, credential và internal ID. Không gửi full ledger, balance, savings hoặc amount nếu không cần cho category. Kiểm tra logging/training/provider policy trước khi bật. Nếu privacy không đạt, giữ JEV off.

Bộ đánh giá gồm 50–100 ví dụ synthetic/anonymized cho `en`/`vi`, income/payment, mọi category, ambiguity, PII-like text, prompt injection, disabled category và correction. Đo accuracy, abstention, override, schema failure, fallback, p95 latency và cost.

## 7. Tiêu chí chấp nhận

1. JEV off/unavailable không thay đổi money path.
2. Typed compatibility được chứng minh hoặc JEV disabled.
3. Chỉ suggestion hợp lệ từ active candidate tới UI.
4. User confirmation bắt buộc trước commit.
5. Mọi lỗi fallback manual.
6. Không log prompt/raw response/secret/balance/ledger.
7. Không gọi JEV trong money transaction.
8. `en`/`vi` do app localization kiểm soát.

## 8. Phần để sau

Monthly prose summary, OCR/CSV extraction, recurring automation, prediction, chat, autonomous action và mọi reasoning về amount/date/balance.

## 9. ADR liên quan

[ADR-0006](./adr/0006-optional-openrouter-jev.md).
