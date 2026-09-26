# Rà soát repository và quyết định áp dụng — 2026-09-27

## Kết luận triển khai

Campus Coin giữ React/Vite, Node.js, MySQL và application services đang có. Thay đổi hữu ích nhất từ đợt rà soát là hoàn thiện màn hình domain dùng API hiện hữu: khởi tạo ví, xem dashboard, ghi `income`/`payment`, chuyển savings, đặt ngân sách, xem lịch sử và báo cáo tháng. Số dư, kết quả ghi tiền, tổng báo cáo và trạng thái vượt ngân sách tiếp tục lấy từ server. Mutation gửi `Idempotency-Key`.

Không thêm nền tảng chatbot, CRUD, chart hoặc workflow vào core app ở thời điểm này. JEV chưa có endpoint/runtime; AI vẫn optional, backend-only và default-off theo ADR-0006. Node test hiện hữu phù hợp hơn cho test tài chính xác định được. Promptfoo có thể được xem xét lại nếu nhóm triển khai JEV với bộ case synthetic song ngữ và gate rõ ràng.

Đợt rà soát gồm README, metadata và license của cả 23 repository được nêu trong danh sách nghiên cứu; các repository liên quan trực tiếp hơn được kiểm tra thêm qua source/example/test ở checkout riêng dưới `D:\mydata\new-git-3\test_git\research`. Không cài dependency, chạy server, chạy script, hoặc đưa code từ các checkout nghiên cứu vào Campus Coin.

## Đánh giá từng repository

| Repository | Phần có thể học | Quyết định |
|---|---|---|
| [promptfoo](https://github.com/promptfoo/promptfoo) | Khai báo bộ prompt eval, adversarial case và kết quả có thể lặp lại. | Chưa thêm vào CI vì chưa có JEV runtime. Dùng lại khi kiểm thử gợi ý category bằng dữ liệu synthetic; không thay test tính đúng của tiền. License upstream: MIT. |
| [DeepEval](https://github.com/confident-ai/deepeval) | Bộ metric cho LLM/RAG và test theo expected output. | Chưa dùng: Campus Coin chưa có RAG hỏi đáp, thêm Python/tooling không tạo giá trị cho flow hiện tại. License upstream: Apache-2.0. |
| [Vercel Chatbot](https://github.com/vercel/chatbot) | Luồng chat và các trạng thái hiển thị trong mẫu Next.js. | Không dùng làm khung sản phẩm: khác Vite/Node/MySQL và auth/database của Campus Coin. |
| [Deep Chat](https://github.com/OvidijusParsiunas/Deep-Chat) | Web component chat có thể nhúng vào giao diện hiện hữu. | Chưa thêm chat. Nếu làm assistant sau này, browser chỉ gọi API riêng của Campus Coin; không gọi model trực tiếp hoặc giữ provider key. License upstream: MIT. |
| [Flint Chart](https://github.com/microsoft/flint-chart) | Biểu diễn chart bằng spec, tách mô tả khỏi renderer. | Chưa thêm dependency: hiện có ít chart; báo cáo dùng bảng và `<progress>` có nhãn, dễ kiểm chứng hơn. License upstream: MIT. |
| [AntV Infographic](https://github.com/antvis/Infographic) | Tạo infographic từ cấu trúc dữ liệu. | Chỉ cân nhắc cho recap chia sẻ sau này; không dùng làm nguồn số liệu hay dashboard quyết định. License upstream: MIT. |
| [Vercel AI SDK](https://github.com/vercel/ai) | Streaming và tool-call trong app có assistant. | Chưa dùng: chưa có use case/runtime JEV đủ điều kiện; giữ typed provider boundary hiện tại. License upstream: Apache-2.0. |
| [Tambo](https://github.com/tambo-ai/tambo) | Chọn component React từ schema. | Không dùng cho balance/budget; UI tài chính phải render từ response API ổn định, không để model quyết định component hoặc dữ liệu. License upstream: MIT. |
| [OpenUI](https://github.com/wandb/openui) | Phác thảo giao diện bằng mô tả. | Chỉ có thể dùng như công cụ ý tưởng ngoại tuyến; không render source do model sinh trong app. License upstream: Apache-2.0. |
| [Plotly Dash](https://github.com/plotly/dash) | Dashboard phân tích bằng Python. | Không dùng trong sản phẩm vì tạo thêm backend/runtime Python cạnh React/Node. License upstream: MIT. |
| [Streamlit](https://github.com/streamlit/streamlit) | Prototype phân tích dữ liệu nhanh bằng Python. | Chỉ dùng nếu cần thử ý tưởng cashflow trên dữ liệu giả trong prototype riêng; không thay giao diện chính. License upstream: Apache-2.0. |
| [NiceGUI](https://github.com/zauberzeug/nicegui) | UI/dashboard Python cho công cụ nội bộ. | Không thêm server Python cho sản phẩm React hiện có. License upstream: MIT. |
| [Reflex](https://github.com/reflex-dev/reflex) | Full-stack web app bằng Python. | Không đổi stack chỉ để giảm lượng TypeScript; tích hợp API/auth/MySQL sẽ rộng hơn lợi ích. License upstream: Apache-2.0. |
| [Evidence](https://github.com/evidence-dev/evidence) | Report nội bộ từ SQL/Markdown. | Có thể tham khảo cho BI nội bộ, nhưng không kết nối trực tiếp production DB và không thay report API hướng tới sinh viên. License upstream: MIT. |
| [Appsmith](https://github.com/appsmithorg/appsmith) | Công cụ admin/dashboard low-code. | Không dùng cho app sinh viên. Direct DB CRUD dễ đi vòng owner scope, ledger và service boundary. License upstream: Apache-2.0. |
| [Refine](https://github.com/refinedev/refine) | React CRUD, form và pagination. | Chỉ tham khảo cách tổ chức bảng/form; không thêm framework CRUD cho domain API đã có. License upstream: MIT. |
| [ToolJet](https://github.com/ToolJet/ToolJet) | App low-code cho internal tools. | Không dùng trong core app; khác mục đích và license AGPL-3.0 cần đánh giá riêng trước khi phân phối. |
| [Budibase](https://github.com/Budibase/budibase) | Internal app builder và automation. | Không dùng trong sản phẩm; stack khác và repo có GPLv3 cùng package BSL. |
| [Directus](https://github.com/directus/directus) | API/Studio cho SQL database. | Không làm API thay thế: tự sinh CRUD có thể bỏ qua app services và invariant. Repo hiện ghi MSCL-1.0-GPL; phải xem lại điều khoản trước khi dùng. |
| [NocoDB](https://github.com/nocodb/nocodb) | Giao diện bảng và API cho database. | Không nối trực tiếp vào bảng tài chính. License hiện tại là Sustainable Use License, không phải MIT/Apache thuần. |
| [Teable](https://github.com/teableio/teable) | Spreadsheet/database platform và workflow. | Không dùng: thay stack/database và làm mờ business boundary; core app AGPL-3.0, một số package MIT. |
| [Langflow](https://github.com/langflow-ai/langflow) | Builder workflow/agent. | Chưa có runtime JEV để cần thêm workflow server; chỉ có thể dùng ngoại tuyến với dữ liệu giả khi thiết kế flow. License upstream: MIT. |
| [Flowise](https://github.com/FlowiseAI/Flowise) | Builder workflow/agent trực quan. | Không dùng: repository đã archive ngày 2026-08-13, read-only và thông báo sunset. Xem [trạng thái repository](https://github.com/FlowiseAI/Flowise/security). |

License và trạng thái có thể thay đổi. Trước khi đưa bất kỳ dependency hoặc source vào sản phẩm, rà lại license của đúng version/commit và dependency tree. Các mục license đáng lưu ý: [Directus](https://github.com/directus/directus/blob/main/license), [NocoDB](https://github.com/nocodb/nocodb/blob/develop/LICENSE.md), [Teable](https://github.com/teableio/teable/blob/develop/LICENSE), [Budibase](https://github.com/Budibase/budibase/blob/master/LICENSE), [ToolJet](https://github.com/ToolJet/ToolJet/blob/develop/LICENSE).

## Kiểm tra sâu các repository phù hợp hơn

Các checkout phục vụ review nằm ngoài repository sản phẩm tại `D:\mydata\new-git-3\test_git\research`. Chỉ đọc source/example/test; không cài dependency, chạy server hay chạy script từ repo tham khảo.

| Repository | Điều đã xem trong source/test | Cách dùng phù hợp với Campus Coin |
|---|---|---|
| Promptfoo | Cấu trúc test khai báo input, provider và assertion; ví dụ red-team chạy qua cấu hình YAML/JavaScript. | Giữ lại cách mô tả case thành dữ liệu khi JEV có endpoint. Bộ case sau này dùng dữ liệu giả tiếng Việt/Anh và đánh giá câu trả lời gợi ý; không thay test số dư, ledger hay authorization bằng LLM eval. |
| DeepEval | Cấu hình pytest và metric expected-output/relevancy cần model để chấm. | Chưa thêm Python hoặc model key vào CI tài chính vì kết quả có chi phí và biến thiên. Chỉ cân nhắc khi có use case RAG/assistant thật. |
| Deep Chat | Web component nhận backend connection và hỗ trợ interceptor cho lỗi/trạng thái. README cảnh báo không gọi provider trực tiếp từ browser nếu phải để lộ key. | Nếu thêm trợ lý sau này, client chỉ gọi API server của Campus Coin; backend loại PII/dữ liệu tài chính thừa và trợ lý không ghi tiền. Hiện chưa có runtime nên không cài. |
| Flint Chart | Source và tests tập trung kiểm tra chart spec, props và nhãn dữ liệu đầu vào. | Không thêm chart dependency cho vài báo cáo hiện có; dùng bảng/text thay thế và `<progress>` có nhãn. Chart tương lai chỉ trình bày kết quả API, không tính tiền. |
| AntV Infographic | Renderer/spec có test riêng cho biểu diễn thành phần SVG. | Có thể cân nhắc recap tháng có thể chia sẻ sau này; cần bản text/table tương đương và không đưa dữ liệu nhạy cảm vào ảnh chia sẻ. |
| Vercel AI SDK | Ví dụ approval/human-in-the-loop tách đề xuất tool khỏi bước execute. | Ý tưởng phù hợp nếu sau này assistant chỉ soạn transaction draft; người dùng phải xem và xác nhận trước khi API nhận mutation. Không thêm SDK khi chưa có JEV runtime. |
| Tambo | React component registry có schema validation bằng Zod; core hướng tới generative UI. | Lấy nguyên tắc validate props ở boundary, giữ dashboard tài chính deterministic. Không để model chọn biểu đồ hoặc tự sinh component cho quyền/số tiền. |
| Evidence | Ví dụ report lấy dữ liệu SQL và cùng filter cho KPI, chart và table. | Chỉ phù hợp BI nội bộ read-only qua dataset đã kiểm soát; không cho report người dùng truy vấn DB trực tiếp, vì sẽ bypass session owner scope. |
| Skola | Đã đọc cấu trúc React/Vite, semantic landmarks, responsive sidebar/theme và test theo role. Repo AGPL-3.0. | Chỉ học pattern điều hướng responsive, semantic markup và cách test tương tác; không chép CSS/source vào app. |
| ZettleCards | Đã đọc Playwright checks cho heading, skip link, focus, labels, toggle và alert; repository private và không có root LICENSE. | Dùng checklist tương tác làm gợi ý khi bổ sung browser tests; không sao chép source và không coi bộ test đó là chứng nhận WCAG. |

Promptfoo, DeepEval và các framework UI/AI chưa được thêm vào `package.json`; phạm vi hiện tại có thể đạt bằng API client nhỏ và Node test sẵn có. Đây vừa giảm độ phức tạp, vừa giữ test tài chính xác định và dễ giải thích.

## Nhánh mới và quyết định hợp nhất

Đã fetch các remote branch ngày `2026-09-27` và đối chiếu với nhánh sản phẩm `hiep` tại `563eaae`. Nhóm DB là chuỗi tổ tiên: `origin/database-ingest=48f8cd4` → `origin/database-ingest-0.2=ce984ae` → `origin/database-ingest-0.3=9df1c97` → `origin/database-ingest-0.4=053a434`; vì vậy các commit của ba refs cũ đã nằm trong `.4` và không cần merge lặp lại. `origin/main=1a1822f`, `origin/thien=55df41e` và `origin/thien-merge=77ad3dd` đều phân kỳ với `hiep`.

| Remote ref | Commit đang thấy | Kết luận |
|---|---|---|
| `origin/thien-merge` | `77ad3dd` | Không merge nguyên nhánh. Thay Node API/auth/session, UI entrypoint, dependency và chuỗi migration; UI tham khảo được nhưng giả định session shape khác API hiện tại. |
| `origin/database-ingest-0.4` | `053a434` | Không merge nguyên nhánh. Dùng architecture/migration chain khác, xóa auth/email và CI đang có. Benchmark runner giới hạn vào MySQL local, tạo schema tạm riêng và drop schema trong `finally`; migration chain riêng chưa khớp `hiep` hoặc Aiven. Các SQL fixture dùng ID cố định và không an toàn nếu chạy riêng; benchmark không chạy trong lượt này. |
| `origin/main` | `1a1822f` | Không merge nguyên nhánh vì là cùng lane DB legacy, xung đột architecture, migrations và app tree với `hiep`. |
| `origin/thien` | `55df41e` | Không merge: source/architecture khác và có tracked `node_modules`/build output trong lịch sử nhánh. |

Các nhánh không có quan hệ fast-forward phù hợp để gộp an toàn. Hợp nhất nguyên trạng sẽ ghi đè quyết định auth/session hiện hành hoặc tạo migration cùng số nhưng khác ý nghĩa. Thay đổi sản phẩm trong lượt này được viết theo API/contract hiện tại trên `hiep`; không sao chép source từ nhánh khác. Việc còn thiếu ngoài phạm vi lượt này được ghi tại `DELIVERY-PLAN.md`.

### Benchmark

`hiep` có `benchmark/001_setup.sql`, `002_queries.sql` và `003_cleanup.sql`, nhưng chưa có runner cô lập. Setup chạy `USE campus_coin`, dùng ID user cố định `999001`/`999002` và thêm dữ liệu vào users, wallet, ledger, savings transfers và budgets. Cleanup chỉ xóa budgets, savings accounts và wallet accounts; users, ledger và savings transfers còn lại. Không chạy các file SQL này trên DB dùng chung hoặc Aiven.

Runner ở `origin/database-ingest-0.4` có guard chỉ cho MySQL local, schema duy nhất theo lần chạy, chạy migrations rồi drop schema trong `finally`. Runner đó dùng migration chain riêng; đây là mẫu về cô lập/cleanup, không phải script tương thích để chép hoặc chạy trên `hiep`. Không benchmark trong lượt này. Cần một runner riêng cho `hiep` trước khi đo hiệu năng.

## Tác động tới rubric

- **Functionality (35):** người dùng đăng nhập được tới trải nghiệm wallet, ghi thu/chi, savings, budget, lịch sử và report qua API đang có.
- **UI/accessibility (15):** dùng form, fieldset/legend, label, table, progress, trạng thái live region, keyboard focus, responsive layout và en/vi.
- **Source code (10):** không thêm package; API calls nằm trong feature client; các số authoritative do server trả; mutation có idempotency key.
- **Database testing (10):** không chạy benchmark SQL chưa cô lập; integration test hiện có tiếp tục là gate cho logic tiền và owner scope.
- Các nhóm điểm còn lại vẫn cần evidence kiểm tra riêng theo [QUALITY-AND-SCORING.md](../QUALITY-AND-SCORING.md).
