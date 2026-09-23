# Tài liệu working — Campus Coin

## Vai trò

`docs/working/` chứa handoff, bản replan, review và bằng chứng quy trình. Đây không phải nguồn quyết định sản phẩm cuối cùng.

## Thứ tự ưu tiên

1. Yêu cầu và quyết định trực tiếp của Team Leader.
2. ADR đã chấp nhận trong [`../adr/`](../adr/).
3. Canonical docs tại thư mục cha.
4. Working handoff và replan chỉ cung cấp phân tích, giả định, evidence hoặc trạng thái.

## Phân loại

- `CC-*.md`: handoff chuyên môn của các lane phân tích ban đầu.
- `INTEGRATION-HANDOFF.md`: bản tích hợp các handoff.
- `FINAL-REVIEW.md`: kết quả rà soát tài liệu.
- `TEAM-BOARD.md`: bảng điều phối working pass.
- `replan/`: bằng chứng của kế hoạch triển khai 4–5 ngày và các handoff RP-A đến RP-D.

## Quy tắc cập nhật

- Không ghi secret, token, raw PII hoặc raw provider payload.
- Không sửa source code hoặc SRS trong docs-only pass.
- Không đưa assumption provider/model thành fact nếu chưa có evidence.
- Khi working doc mâu thuẫn canonical/ADR, ghi rõ là advisory/superseded; không tự mở lại quyết định.
- Khi replan hoàn tất, giữ lại review và blocker để truy vết; không dùng working docs làm bảng trạng thái production thay cho `DELIVERY-PLAN.md`.
