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
- [`CC-005-dev-a-auth-ui-proposal.md`](CC-005-dev-a-auth-ui-proposal.md): handoff email/password/OTP theo ADR-0008, được bổ sung bởi Google Sign-In tùy chọn theo ADR-0009.
- `INTEGRATION-HANDOFF.md`: bản tích hợp các handoff.
- `FINAL-REVIEW.md`: kết quả rà soát tài liệu.
- `TEAM-BOARD.md`: bảng điều phối working pass.
- `replan/`: bằng chứng của kế hoạch triển khai 4–5 ngày và các handoff RP-A đến RP-D.
- [`team-handoff-2026-09-26/`](team-handoff-2026-09-26/README.md): hành động còn lại của DevB (DB/benchmark), DevC (UI/accessibility) và DevD (Vercel/SMTP/release).

## Quy tắc cập nhật

- Không ghi secret, token, raw PII hoặc raw provider payload.
- Không sửa source code hoặc SRS trong docs-only pass.
- Không đưa assumption provider/model thành fact nếu chưa có evidence.
- Khi working doc mâu thuẫn canonical/ADR, ghi rõ là advisory/superseded; không tự mở lại quyết định.
- Handoff/replan/review cũ ghi Google OAuth-only hoặc email-only là lịch sử từng thời điểm; trạng thái hiện tại do ADR-0008 và ADR-0009 sở hữu.
- Khi replan hoàn tất, giữ lại review và blocker để truy vết; không dùng working docs làm bảng trạng thái production thay cho `DELIVERY-PLAN.md`.
