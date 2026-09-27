# DevB — DB test, backup/restore và benchmark

> Cập nhật: 2026-09-27
> Người nhận: DevB và coding agent làm việc trong nhánh DevB
> Đây là handoff công việc, không thay thế ADR hay quyết định của Team Leader.

## Mục tiêu

Hoàn thiện lane database để nhóm kiểm tra an toàn trên môi trường riêng, đo truy vấn thực tế bằng dữ liệu giả, và biết rõ bước nào cần người có quyền DB. Ưu tiên code dễ đọc, ít dependency, dùng migration và application services hiện có của nhánh hiep.

Coding agent bên DevB được kỳ vọng tự đọc repo, sửa code/test/docs trong phạm vi dưới đây và chạy gate local an toàn. Agent không cần dừng lại để hỏi những việc có thể xác minh hoặc làm trong working tree. Khi gặp thao tác cần quyền DB/cloud, agent tiếp tục phần code độc lập rồi trả hướng dẫn cụ thể cho DevB/Team Leader.

## Bối cảnh đã biết

- Nhánh sản phẩm chuẩn là hiep. Khi tài liệu này được viết, commit mới nhất là 6e0b812; kiểm tra lại nhánh/commit thực tế trước khi làm.
- Team Leader đã báo campus_coin_clone kết nối TLS được, MySQL 8.4.8, migrations 0001–0005 applied. Đây là kết quả ngày 2026-09-26; xác minh lại trước mọi thao tác mới.
- Team Leader đã báo db:datatest 23/23, MySQL domain integration 31/31, contract smoke 13/13, Auth MySQL 8/8 và auth security 1/1 trên MySQL service thử nghiệm. Đây là evidence do Team Leader cung cấp; không chứng minh backup/restore hoặc benchmark.
- MySQL test harness hiện tạo schema ngẫu nhiên dạng campus_coin_test với PID và mã ngẫu nhiên, apply migrations trong db/migrations rồi drop schema khi dừng. Prefix trong CAMPUS_COIN_DB_NAME xác nhận ý định chạy test, không chứng minh host MySQL là môi trường riêng.
- Bộ SQL cũ trong benchmark không an toàn để chạy: setup chọn campus_coin, dùng ID cố định và cleanup để lại users, ledger và savings transfers. Không chạy các file SQL này.
- Runner ở origin/database-ingest-0.4 chỉ cho MySQL local, dùng migration chain khác hiep; không phải runner tương thích để chạy trên Aiven.
- CAMPUS_COIN_DB_NAME chọn schema trên host/port đang cấu hình. Đổi tên biến không đổi server hay tự tạo database. Không đọc hoặc in .env để đoán target.

## Nguồn cần đọc trước

Đọc theo thứ tự và giữ các quyết định canonical hiện hành:

1. AGENTS.md
2. docs/README.md và docs/adr/README.md
3. docs/adr/0003-cloud-mysql-validation-gate.md, docs/adr/0005-immutable-money-domain.md, docs/adr/0010-safe-integer-money-range.md
4. docs/DOMAIN-MODEL.md, docs/DB-STAGING-TESTING.md, docs/DELIVERY-PLAN.md, docs/CURRENT-STATUS.md
5. db/README.md, package.json, db/migrations/ và benchmark/
6. test/helpers/db-test-guard.ts, test/helpers/mysql-harness.ts, DB tests và src/infrastructure/db/
7. docs/working/repository-review-2026-09-27.md

Không đọc .env, credential, CA private, token, cookie, dữ liệu người dùng hoặc nội dung DB thật. Nếu output của lệnh vô tình chứa secret, dừng, không chép output vào log/docs và báo người vận hành.

## Ranh giới quyền

### Coding agent tự làm được

- Kiểm tra branch, commit, working tree và code hiện có; giữ nguyên thay đổi có sẵn của DevB.
- Viết benchmark runner mới tương thích với schema/migrations hiep, test guard/cleanup và hướng dẫn chạy.
- Chạy typecheck/build, unit tests và static checks đã khai báo trong package.json.
- Chạy MySQL test chỉ sau khi DevB xác nhận MySQL local/disposable riêng, có quyền tạo/xóa schema tạm và không chứa dữ liệu dùng chung.
- Báo riêng test tự chạy, kết quả DevB cung cấp, benchmark chưa chạy và việc cần con người.

### Chỉ DevB, Team Leader hoặc DB owner được làm

- Xác nhận trên Aiven/DBeaver rằng service/schema là clone riêng, không phải production hoặc DB dùng chung.
- Cấp quyền test/migration role tạo và xóa schema tạm; cấp runtime role ít quyền nhất. Không gửi password, CA private hoặc secret cho AI/chat.
- Tạo backup và chạy restore rehearsal vào target riêng; xác nhận dữ liệu và migration status sau restore.
- Cho phép và apply migration pending lên clone sau backup, precheck dữ liệu và lệnh GO rõ ràng.
- Cho phép benchmark qua mạng đến Aiven/cloud, chọn giờ chạy/tải tối đa và xác nhận tác động chấp nhận được.
- Push, merge, deploy hoặc thay đổi quyền/provider ngoài repo. Coding agent không tự làm các thao tác này.

### Không được làm

- Không chạy benchmark/001_setup.sql, 002_queries.sql hoặc 003_cleanup.sql lên DB hiện có.
- Không chạy test tạo/xóa schema trên defaultdb, production, staging dùng chung hoặc service chưa được DB owner xác nhận.
- Không tự chạy benchmark cloud, migration, seed, restore, DROP DATABASE hoặc câu lệnh ghi trực tiếp lên DB thật.
- Không sửa migration đã commit/đã apply. Nếu schema cần đổi, đề xuất migration mới theo số tiếp theo sau khi xác nhận trạng thái branch.
- Không đưa dữ liệu thật vào benchmark; không ghi connection string, password, host cloud, email hoặc raw payload vào evidence.
- Không thêm dependency benchmark nếu Node.js và thư viện sẵn có đáp ứng được.

## Việc coding agent cần tự hoàn tất

### 1. Lập baseline

- Trước khi sửa, kiểm tra git status --short --branch, git rev-parse HEAD và branch hiện tại. Không reset, checkout đè, stash hoặc xóa thay đổi của DevB.
- Xác định test guard, MySQL harness, migration loader, pool và query report/dashboard/list/payment. Dùng migration của hiep; không lấy migration của nhánh .4.
- Ghi commit thực tế, lệnh chạy và pass/fail. Không ghi trạng thái DB chưa quan sát được.

### 2. Làm benchmark runner cô lập cho hiep

Tạo runner riêng, ví dụ npm run db:benchmark. Trước khi chọn file/script name, kiểm tra quy ước repo và tránh đè công cụ khác. Runner phải đáp ứng:

- Tắt mặc định; cần opt-in riêng như CAMPUS_COIN_BENCHMARK=1.
- Mặc định chỉ chạy MySQL local/disposable. Không tự kết nối Aiven/cloud. Host allowlist là guard, không thay việc con người xác nhận service.
- Tự tạo schema mới, ngẫu nhiên và validate identifier trước khi dùng trong SQL. Không nhận tên schema tùy ý để xóa.
- Apply đúng migrations hiện tại của hiep vào schema mới. Tạo fixture synthetic hợp lệ, ID tự tăng và email example.com; không dùng fixed IDs hoặc dữ liệu thật.
- Giới hạn rows, repetitions và concurrency bằng default nhỏ cùng upper bound có tên rõ ràng. Từ chối giá trị âm, rỗng, NaN hoặc vượt giới hạn trước khi mở kết nối.
- Đo đường đọc app đang dùng: dashboard, transaction list với keyset pagination và monthly report. Chỉ đo payment write nếu gọi được application service hiện hành và mỗi lần dùng idempotency key mới; không tự viết SQL thay business service.
- Warm-up tách khỏi mẫu đo; dùng đồng hồ monotonic; đo đủ mẫu để báo p50/p95. Báo riêng từng scenario, không gộp loại query khác nhau.
- Có thể lưu EXPLAIN/query plan cho SELECT. Chỉ dùng EXPLAIN ANALYZE sau khi xác nhận query read-only; không dùng trên mutation.
- Cleanup trong finally và chỉ drop schema do chính lượt runner tạo. Nếu không xác định chắc tên schema do lượt này tạo thì dừng, không drop.
- Output chỉ gồm commit, MySQL version, loại target (local disposable), migrations, synthetic row count, concurrency, số mẫu, p50/p95, query plan đã mask và cleanup result. Không in connection string, password, hostname cloud hay email.
- Không tuyên bố số local là benchmark Aiven/Vercel. Nếu không có MySQL local riêng, hoàn thiện code/tests và ghi benchmark chưa chạy.

Nếu application service chưa gọi được an toàn mà không khởi động app/server, trước hết đo query read-only qua boundary hiện có và ghi rõ giới hạn. Không tạo mock để sinh số benchmark giả.

### 3. Thêm regression tests

Thêm tests đơn giản theo Arrange–Act–Assert để chứng minh:

- Thiếu/sai opt-in flag thì runner từ chối.
- Target không phải local/disposable bị từ chối; lỗi không làm lộ giá trị nhạy cảm.
- Schema name do runner sinh/validate; không nhận SQL identifier tùy ý.
- Rows/repeats/concurrency âm, không phải số hoặc vượt trần bị từ chối trước khi mở kết nối.
- Lỗi migration/seed/measure vẫn gọi cleanup; cleanup không thể drop schema khác.
- Operation lỗi không sinh số benchmark giả; process trả exit code khác 0 với lỗi đã lọc.
- Không bỏ hoặc làm yếu các DB/auth/domain gates đang có.

Chạy tests mới và unit guard hiện tại. Chỉ chạy integration DB khi local disposable target đã được DevB xác nhận.

### 4. Review migrations và runtime role

- Đọc migrations 0006–0010 và viết checklist read-only để tìm dữ liệu ngoài safe-integer range trước khi thêm CHECK constraints.
- Không suy ra migration đã apply chỉ vì file có trong repo. Clone trước đây được báo 0001–0005 applied; yêu cầu DevB chạy lại status để có evidence mới.
- Không tự apply 0006–0010. Điều kiện apply: backup đã restore thử thành công, precheck dữ liệu đạt, clone được xác nhận và DevB/DB owner cấp phép.
- Review hoặc đề xuất bảng quyền migration role/runtime role. Runtime không dùng avnadmin; không cấp UPDATE/DELETE cho ledger/audit append-only nếu không có lý do được kiểm chứng từ code/schema.
- Nếu chưa có grant evidence, ghi “chưa xác minh”; không kết luận least privilege chỉ từ config/env.

### 5. Ghi evidence

Sau implementation/tests, cập nhật docs do DB lane sở hữu. Ghi chính xác:

- File/script tạo hoặc sửa và lý do.
- Commands đã chạy, target type (unit, local disposable hoặc chưa chạy), số pass/fail.
- Benchmark parameters/kết quả chỉ khi runner thật sự chạy: commit, MySQL version/region nếu được xác nhận, row count, concurrency, warm-up, sample count, p50/p95, query plan và cleanup.
- Việc cần DevB/DB owner chạy thủ công; nội dung chưa có evidence.
- Rủi ro, cách rollback code và rollback plan migration riêng. Không thực hiện migration/restore.

Không sửa ADR để thay đổi quyết định sản phẩm. Working docs không được ghi đè DELIVERY-PLAN.md hoặc canonical DB/domain rules.

## Hướng dẫn thao tác cho DevB/DB owner

Chỉ tạo/xóa dữ liệu sau khi DevB xác nhận với Team Leader rằng MySQL service dành riêng cho test và user được phép tạo/xóa schema tạm. Tên schema không chứng minh server đã cô lập.

### A. Xác minh clone bằng truy vấn chỉ đọc

Trong terminal riêng đã cấu hình bằng test credentials, đặt target clone đã xác nhận rồi chạy:

    $env:CAMPUS_COIN_DB_NAME = "campus_coin_clone"
    npm run db:preflight
    npm run db:status

Trong Aiven/DBeaver, xác nhận service/host là đúng clone, database đang chọn là campus_coin_clone, TLS pass, MySQL version và migration count. Chỉ gửi output đã redact; không gửi URI/password/CA private.

### B. Chạy DB tests trên service đã xác nhận

Các suite sau tạo/xóa schema tạm ngẫu nhiên trên MySQL server mà .env trỏ tới. Chỉ chạy sau khi DB owner xác nhận service riêng và quyền create/drop:

    $env:CAMPUS_COIN_TEST_DB = "1"
    $env:CAMPUS_COIN_DB_NAME = "campus_coin_test_devb"
    npm run db:datatest
    node --env-file-if-exists=.env --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts
    npm run test:auth-security

Khi xong, bỏ override trong terminal:

    Remove-Item Env:CAMPUS_COIN_TEST_DB -ErrorAction SilentlyContinue
    Remove-Item Env:CAMPUS_COIN_DB_NAME -ErrorAction SilentlyContinue

Các lệnh trên không được trỏ vào defaultdb hay service có dữ liệu dùng chung. Nếu preflight/DNS/TLS fail, dừng, giữ nguyên dữ liệu và báo lỗi đã redact; không thử đổi host/password tùy tiện.

### C. Backup/restore rehearsal

DevB/DB owner tự thực hiện trên provider hoặc bằng quy trình backup được nhóm chấp thuận:

1. Xác nhận clone không phải production; ghi schema, thời điểm, MySQL version và migration status.
2. Tạo backup/snapshot của clone.
3. Restore sang một clone/schema đích khác; tuyệt đối không restore đè database nguồn.
4. Chạy db:preflight/db:status chỉ đọc trên bản restore; so sánh table list, migration count và số fixture synthetic đã biết.
5. Ghi pass/fail, thời gian và lỗi đã redact. Không lưu dữ liệu thật hoặc credential vào handoff.

Nếu provider không hỗ trợ restore sang target tách biệt, báo limitation và không thử restore trên clone nguồn.

### D. Apply migration pending

AI chỉ chuẩn bị review/checklist và câu lệnh precheck chỉ đọc. Chỉ DB owner apply sau khi backup/restore rehearsal pass, dữ liệu nằm trong integer range, target clone đã xác nhận và Team Leader cho phép. Sau đó kiểm tra lại db:status và db:preflight. Không apply lên defaultdb hoặc production theo handoff này.

### E. Benchmark cloud nếu nhóm quyết định cần

Benchmark local là bước đầu. Muốn đo Aiven, DevB báo target clone, giờ chạy, row count/concurrency tối đa và tác động dự kiến. Team Leader/DB owner xác nhận trước khi chạy. Chỉ chạy runner mới sau code review; không dùng SQL benchmark cũ. Nếu chưa được chấp thuận, ghi “cloud benchmark: chưa chạy”.

## Gate hoàn tất

- [ ] Runner opt-in và guard target/config trước khi kết nối.
- [ ] Runner dùng migrations hiep, dữ liệu synthetic, output đã lọc và cleanup chỉ schema do chính runner tạo.
- [ ] Có regression tests cho guard, lỗi giữa chừng và cleanup.
- [ ] Tests mới cùng DB-related gates hiện có pass; ghi đúng lệnh và số pass.
- [ ] Typecheck, build, api:validate và git diff --check pass nếu thay đổi liên quan.
- [ ] Nếu chưa có local disposable MySQL thì benchmark/integration ghi rõ chưa chạy.
- [ ] DevB/DB owner trả evidence clone, grant roles và backup/restore; nếu chưa làm được, ghi việc thiếu.
- [ ] Không sửa migration cũ, không dùng dữ liệu thật, không có secret trong diff/log/docs.
- [ ] Không push/merge/deploy từ AI trừ khi Team Leader yêu cầu trực tiếp.

## Mẫu báo cáo DevB gửi lại

    Commit/branch:
    Files changed:
    Tests run and results:
    MySQL target type (local disposable / approved clone / not run):
    Migration status evidence:
    Benchmark (commit, version, rows, concurrency, warm-up, samples, p50/p95):
    Query plans reviewed:
    Cleanup result:
    Backup/restore result (human-run):
    Runtime/migration grants (redacted evidence):
    Not run / blockers:
    Exact action needed from Team Leader or DB owner:
