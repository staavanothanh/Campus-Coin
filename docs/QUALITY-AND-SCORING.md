# Chất lượng và tiêu chí chấm điểm

## Rubric

| Hạng mục | Trọng số | Campus Coin cần có để chứng minh |
|---|---:|---|
| Functionality Testing | 35 | Acceptance theo SRS; register/OTP/login/reset/session; wallet; income/payment; savings; budget; report; category; issue/admin; validation, lỗi và quyền owner. |
| UI & Accessibility Testing | 15 | Điều hướng rõ, responsive, trạng thái loading/error/success/empty/expired, label, keyboard/focus, thông báo trợ năng và thử trên nhiều trình duyệt/kích thước. |
| Source Code | 10 | Cấu trúc theo lớp/feature, tên rõ, validation và lỗi nhất quán, code dễ đọc và dễ giải thích; giữ test cùng thay đổi. |
| Database Testing | 10 | SQL scripts, migration, PK/FK/UNIQUE/CHECK/index, seed, transaction/append-only và owner isolation được kiểm tra trên MySQL thử nghiệm riêng. |
| Compatibility Testing | 5 | Kiểm tra tối thiểu Chrome, Firefox, Edge và Opera; ghi ngày, phiên bản và kết quả ngắn. |
| Documentation | 10 | Báo cáo có problem statement, sơ đồ, module/logic, phân công, cách cài/chạy/kiểm tra, giới hạn và evidence. |
| Plagiarism Testing | 10 | Code có nguồn gốc rõ, tài liệu tham khảo được ghi nhận, nhóm hiểu và giải thích được lựa chọn cùng implementation. |
| Ontime Submission | 5 | Khóa phạm vi sớm, chừa thời gian cho build, demo, báo cáo và gói nộp trước deadline. |
| **Tổng** | **100** | |

## Thứ tự ưu tiên

1. **Chức năng (35 điểm):** lập ma trận SRS → tính năng → test; giữ các luồng wallet/dashboard, income/payment/history, savings, budget, report, profile và auth hoạt động; giao diện quản lý category đã được nối API, còn correction UI và bằng chứng tích hợp DB cần hoàn tất.
2. **UI/accessibility (15 điểm):** kiểm tra responsive, lỗi form, keyboard/focus và thông báo trợ năng trên các trang đã nối API; sau đó mở rộng luồng còn thiếu.
3. **Source code + Database (20 điểm):** giữ code đơn giản, kiểm tra migration và dữ liệu trên MySQL độc lập.
4. **Documentation + Plagiarism (20 điểm):** hoàn thiện báo cáo, sơ đồ, phân công và nguồn tham khảo.
5. **Compatibility + On-time (10 điểm):** thử trình duyệt và đóng gói trước hạn.

## Trạng thái hiện tại theo rubric

| Hạng mục | Trạng thái hiện tại | Việc còn thiếu để có bằng chứng nộp bài |
|---|---|---|
| Functionality Testing — 35 | Auth/domain có unit và integration coverage. Giao diện có wallet/dashboard, income/payment/history, savings, budget/report, hồ sơ/cài đặt, issue/audit admin; category có thể tạo, tạm ẩn và bật lại trong Settings; báo cáo có kế hoạch dòng tiền và so sánh danh mục; form payment có gợi ý mặt hàng và lịch sử giá/nhịp mua. | Lập ma trận yêu cầu SRS → tính năng/API → test/evidence; hoàn thiện correction UI; xác nhận đủ phạm vi issue/admin theo SRS; chạy lại DB integration trên clone đã được DevB đối chiếu; giữ evidence staging và demo luồng sản phẩm hoàn chỉnh. |
| UI & Accessibility Testing — 15 | Auth và domain UI có VI/EN, native form controls, labels, keyboard focus, live status, tables, budget progress và responsive layout. Nút chọn thu/chi công bố trạng thái bằng `aria-pressed`; nút danh mục phân biệt tên danh mục; form danh mục đứng riêng khỏi form lưu hồ sơ; thanh lưu cài đặt không ghim đè nội dung khi không có thay đổi. | Kiểm tra thực tế trên viewport nhỏ, keyboard/focus và screen reader; lưu ma trận Chrome/Firefox/Edge/Opera. Chưa ghi các hạng mục này là pass chỉ từ source review hoặc component test. |
| Source Code — 10 | Code nghiệp vụ giữ function dễ đọc; tiền dùng integer an toàn; mutation dùng transaction, khóa và idempotency; UI gọi API domain và không tự tính balance/report. Lượt kiểm tra ngày 2026-09-28: web tests `86/86` trên 17 file, Node suite `77 pass, 3 MySQL-gated skip` (80 tổng), build/typecheck, OpenAPI generation/validation và `verify:docs` pass. [CI run #45](https://github.com/staavanothanh/Campus-Coin/actions/runs/36375649522) xác nhận build và CI cho commit `0334b8c`. Nhóm cần giải thích được ledger, correction, savings và owner boundary. |
| Database Testing — 10 | Các lần chạy lịch sử trên schema tạm đã ghi nhận datatest `23/23`, MySQL integration `32/32`, E2E `13/13` và Auth MySQL `8/8`. [CI run #45](https://github.com/staavanothanh/Campus-Coin/actions/runs/36375649522) pass datatest, auth/domain MySQL integration và HTTP contract smoke trên MySQL disposable; migration `0011`–`0013` được CI áp dụng ở đó. | Không apply migration `0011`–`0013` hoặc chạy suite ghi trên `campus_coin_clone` cho tới khi DevB đối chiếu checksum `0006`–`0010`. CI thành công không xác minh clone; DevB cần kiểm tra clone, grants/TLS và backup/restore. Benchmark local/cloud chưa chạy trong vòng này. |
| Compatibility Testing — 5 | Chưa có ma trận kiểm tra trình duyệt được lưu. | Ghi kết quả Chrome, Firefox, Edge, Opera cùng phiên bản, viewport và ngày. |
| Documentation — 10 | Canonical product/auth/architecture/DB/scoring docs đã có. | Hoàn thiện Project Report với vấn đề, sơ đồ, module/logic, phân công và hướng dẫn chạy/kiểm tra. |
| Plagiarism Testing — 10 | Chưa có kết quả kiểm tra originality được ghi nhận. | Ghi nguồn tham khảo; nhóm tự review và giải thích được source, thuật toán, schema và quyết định. |
| Ontime Submission — 5 | Chưa có evidence gói nộp/demo cuối. | Khóa phạm vi, build sạch, kiểm tra demo, lưu commit/tag và chuẩn bị gói nộp trước hạn. |

Các trạng thái “chưa có evidence” nghĩa là chưa được kiểm chứng hoặc ghi lại; không kết luận thay kết quả kiểm tra thực tế.

Giới hạn số nguyên an toàn và regression pass local typecheck/build cùng các bộ test trên schema MySQL tạm; CI run #17 xác nhận các gate đã khai báo cho commit `8884687`. Clone dùng chung ghi nhận các migration version `0006`–`0010`, nhưng checksum trong registry khác nội dung trên nhánh `hiep`; lineage chưa được đối chiếu và không chạy migration mới lên clone. CI chỉ chứng minh những kịch bản đã chạy trên cấu hình đó, không chứng minh mọi luồng staging/production.

## Benchmark hiệu năng

Benchmark không phải hạng mục chấm điểm có trọng số riêng trong rubric BTC; số đo có thể hỗ trợ đánh giá chất lượng source và trải nghiệm chức năng. `db/README.md` lưu số đo tham chiếu cũ trên MySQL local 8.0.41 với khoảng 101.000 ledger rows/21 owner; số này không đại diện latency Aiven/Vercel. Các script SQL cũ trên `hiep` có thể ghi vào schema cố định và cleanup chưa đầy đủ, vì vậy không chạy trên DB dùng chung hoặc Aiven. Working tree hiện có `benchmark/runner.ts`: yêu cầu opt-in và xác nhận MySQL local dùng một lần, chỉ nhận host loopback, tạo schema tạm có tên do runner sinh, áp dụng migration trong schema đó rồi dọn schema. Runner chưa được chạy trong vòng này; chưa có số đo cloud p50/p95 hoặc connection headroom. Vercel adapter gắn pool lifecycle hook cho MySQL idle connection nhưng điều đó chưa chứng minh hiệu năng triển khai.

Khi có MySQL clone và runtime triển khai được xác nhận, DevB đo report/dashboard/list/payment bằng harness cô lập, ghi commit, MySQL version/region, số dòng/owner synthetic, concurrency, warm-up, số lần chạy, p50/p95, query plan và connection headroom. Không dùng dữ liệu người dùng thật. Hiện trạng: cloud benchmark chưa chạy; checklist ở [handoff DevB](./working/team-handoff-2026-09-26/DEV-B-DB-AND-BENCHMARK.md).

## Bằng chứng cần giữ

- Functionality: checklist acceptance và kết quả test theo từng luồng.
- UI/accessibility: ảnh hoặc checklist kiểm tra form, bàn phím, focus, màn hình nhỏ và 4 trình duyệt.
- Source: typecheck/build, cấu trúc module và giải thích ngắn cho các boundary chính.
- Database: phiên bản migration, `db:datatest`, MySQL integration và owner-isolation result.
- Documentation: report, ER/domain/API diagrams, phân công và hướng dẫn chạy.
- Compatibility: browser, version, viewport, ngày và lỗi đã sửa.
- Deadline: commit/tag nộp và bản demo chạy được.

Các câu hỏi nguyên lý và cách nhóm chuyển chúng thành quyết định cho React, HTML form, API, Node.js và MySQL nằm trong [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md). Tài liệu đó cũng ghi rõ phần nào là quyết định áp dụng, phần nào chỉ là gate tương lai; không thay bằng chứng test thật.

## Quyết định và cách viết code

Các quyết định sản phẩm/kiến trúc chuẩn nằm ở [ADR index](./adr/README.md), trong đó email/OTP tiếp tục dùng cùng Google Sign-In tùy chọn theo ADR-0008/0009; MySQL và quyền owner theo ADR-0003/0005; JEV giữ optional/default-off theo ADR-0006. Rubric không thay đổi các quyết định đó.

Code ưu tiên function ngắn, tên dễ hiểu, luồng xử lý thẳng và validation tại boundary. Tránh abstraction hoặc dependency mới nếu chưa giải quyết một nhu cầu cụ thể. Mỗi test phải cho thấy một hành vi quan sát được, không chỉ xác nhận code được gọi.
