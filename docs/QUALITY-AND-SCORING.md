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

1. **Chức năng (35 điểm):** lập ma trận SRS → tính năng → test; làm lát cắt giao diện wallet/dashboard, income/payment/history, rồi các domain còn lại; kiểm tra auth/email và tình huống lỗi quan trọng.
2. **UI/accessibility (15 điểm):** sửa luồng khó dùng, lỗi form và keyboard/focus trước khi thêm trang mới.
3. **Source code + Database (20 điểm):** giữ code đơn giản, kiểm tra migration và dữ liệu trên MySQL độc lập.
4. **Documentation + Plagiarism (20 điểm):** hoàn thiện báo cáo, sơ đồ, phân công và nguồn tham khảo.
5. **Compatibility + On-time (10 điểm):** thử trình duyệt và đóng gói trước hạn.

## Trạng thái hiện tại theo rubric

| Hạng mục | Trạng thái hiện tại | Việc còn thiếu để có bằng chứng nộp bài |
|---|---|---|
| Functionality Testing — 35 | Auth và API domain có unit/integration coverage; owner isolation đã pass trên MySQL CI cô lập. Team Leader báo Phần 2 auth staging đã hoàn tất. | Giao diện domain sau đăng nhập còn thiếu. Checkout chưa có bản SRS nên cần ma trận yêu cầu SRS → tính năng/API → test/evidence; giữ lại evidence staging do nhóm cung cấp và demo luồng sản phẩm hoàn chỉnh. |
| UI & Accessibility Testing — 15 | Auth UI có validation, hai ngôn ngữ và keyboard semantics cơ bản. | Làm màn hình domain; kiểm tra responsive, keyboard/focus/screen reader và trạng thái lỗi/loading trên toàn app. |
| Source Code — 10 | Typecheck/build và cấu trúc phân lớp đã được chạy trong CI. | Nhóm rà soát code, giải thích module/boundary và giữ thay đổi đơn giản, đúng convention. |
| Database Testing — 10 | CI disposable MySQL đã chạy migration, seed/test-data và integration suites. | DevB xác nhận chain của từng DB, least-privilege grants, TLS/CA và backup/restore trên môi trường tách biệt. |
| Compatibility Testing — 5 | Chưa có ma trận kiểm tra trình duyệt được lưu. | Ghi kết quả Chrome, Firefox, Edge, Opera cùng phiên bản, viewport và ngày. |
| Documentation — 10 | Canonical product/auth/architecture/DB/scoring docs đã có. | Hoàn thiện Project Report với vấn đề, sơ đồ, module/logic, phân công và hướng dẫn chạy/kiểm tra. |
| Plagiarism Testing — 10 | Chưa có kết quả kiểm tra originality được ghi nhận. | Ghi nguồn tham khảo; nhóm tự review và giải thích được source, thuật toán, schema và quyết định. |
| Ontime Submission — 5 | Chưa có evidence gói nộp/demo cuối. | Khóa phạm vi, build sạch, kiểm tra demo, lưu commit/tag và chuẩn bị gói nộp trước hạn. |

Các trạng thái “chưa có evidence” nghĩa là chưa được kiểm chứng hoặc ghi lại; không kết luận thay kết quả kiểm tra thực tế.

## Benchmark hiệu năng

Benchmark không phải hạng mục chấm điểm có trọng số riêng trong rubric BTC; số đo có thể hỗ trợ đánh giá chất lượng source và trải nghiệm chức năng. `db/README.md` đang lưu số đo tham chiếu cũ trên MySQL local 8.0.41 với khoảng 101.000 ledger rows/21 owner. Số này không chứng minh latency của Aiven/Vercel và chưa có harness trong repo để tái chạy cùng phép đo.

Khi có MySQL clone và runtime triển khai được xác nhận, đo lại các luồng report/dashboard/list và payment; ghi commit, MySQL version, số dòng/owner, concurrency, warm-up, số lần chạy, p50/p95 và query plan. Không dùng dữ liệu người dùng thật. Hiện trạng: cloud benchmark chưa chạy.

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
