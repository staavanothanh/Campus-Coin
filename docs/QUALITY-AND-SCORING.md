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
| Source Code — 10 | Code nghiệp vụ giữ function dễ đọc; các phép tiền dùng integer an toàn; mutation tiền có transaction, khóa và idempotency; regression bao phủ overflow, ngày lùi, rollback và cập nhật budget đồng thời. | Typecheck/build và test hẹp mới nhất đã pass cục bộ; workflow CI cho các thay đổi chưa push chưa chạy. Nhóm cần giải thích được ledger, correction, savings và owner boundary. |
| Database Testing — 10 | Migration CHECK theo bảng, datatest `23/23`, MySQL integration `31/31`, E2E `13/13` và Auth MySQL `8/8` đã pass trên schema tạm. | Chưa apply migration `0006`–`0010` lên clone dùng chung/staging; DevB vẫn cần xác nhận grants, TLS/CA và backup/restore. Thêm integration case correction thành công cho `adjustment` và `replacement` qua wallet/report/reconciliation. Benchmark riêng trên dữ liệu synthetic chưa chạy. |
| Compatibility Testing — 5 | Chưa có ma trận kiểm tra trình duyệt được lưu. | Ghi kết quả Chrome, Firefox, Edge, Opera cùng phiên bản, viewport và ngày. |
| Documentation — 10 | Canonical product/auth/architecture/DB/scoring docs đã có. | Hoàn thiện Project Report với vấn đề, sơ đồ, module/logic, phân công và hướng dẫn chạy/kiểm tra. |
| Plagiarism Testing — 10 | Chưa có kết quả kiểm tra originality được ghi nhận. | Ghi nguồn tham khảo; nhóm tự review và giải thích được source, thuật toán, schema và quyết định. |
| Ontime Submission — 5 | Chưa có evidence gói nộp/demo cuối. | Khóa phạm vi, build sạch, kiểm tra demo, lưu commit/tag và chuẩn bị gói nộp trước hạn. |

Các trạng thái “chưa có evidence” nghĩa là chưa được kiểm chứng hoặc ghi lại; không kết luận thay kết quả kiểm tra thực tế.

Giới hạn số nguyên an toàn và regression hiện đã pass local typecheck/build cùng các bộ test trên schema MySQL tạm; workflow CI chưa chạy cho các thay đổi hiện tại và migration `0006`–`0010` chưa được apply lên clone dùng chung/staging. Vì vậy chưa ghi nhận hai gate đó là hoàn tất. CI chỉ chứng minh những kịch bản đã chạy trên cấu hình đó, không chứng minh mọi luồng staging/production.

## Benchmark hiệu năng

Benchmark không phải hạng mục chấm điểm có trọng số riêng trong rubric BTC; số đo có thể hỗ trợ đánh giá chất lượng source và trải nghiệm chức năng. `db/README.md` đang lưu số đo tham chiếu cũ trên MySQL local 8.0.41 với khoảng 101.000 ledger rows/21 owner. Số này không chứng minh latency của Aiven/Vercel và chưa có harness trong repo để tái chạy cùng phép đo. Vercel adapter gắn pool lifecycle hook cho MySQL idle connection, nhưng chưa đo p50/p95, connection headroom hoặc tải triển khai.

Khi có MySQL clone và runtime triển khai được xác nhận, DevB đo report/dashboard/list/payment; ghi commit, MySQL version/region, số dòng/owner synthetic, concurrency, warm-up, số lần chạy, p50/p95, query plan và connection headroom. Không dùng dữ liệu người dùng thật. Hiện trạng: cloud benchmark chưa chạy; checklist ở [handoff DevB](./working/team-handoff-2026-09-26/DEV-B-DB-AND-BENCHMARK.md).

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
