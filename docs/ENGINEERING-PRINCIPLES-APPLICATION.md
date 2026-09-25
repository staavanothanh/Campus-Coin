# Câu hỏi nguyên lý kỹ thuật và cách áp dụng vào Campus Coin

Tài liệu này trả lời từng câu hỏi kỹ thuật có thể áp dụng vào Campus Coin, rồi nối câu trả lời với stack và quy tắc thật của dự án. Web core và form/accessibility có 110 câu; phần JEV có 16 câu chỉ áp dụng nếu sau này bật tính năng AI. Mỗi nhóm nêu rõ khi một công nghệ trong câu hỏi không phải stack hiện tại.

Campus Coin dùng React + TypeScript, Node.js API và MySQL. Dự án không dùng Bootstrap, Express hoặc MongoDB. Vì vậy các câu hỏi về các framework/database đó được trả lời bằng cách chuyển nguyên lý sang code đang có, không thêm framework hoặc đổi database.

## A. Luồng web và hợp đồng HTTP

1. **Từ cú bấm đến giao diện cập nhật:** React handler kiểm tra form, gọi API với JSON; Node route xác thực, kiểm tra quyền và gọi service; service thao tác MySQL hoặc gửi email; API trả status/envelope; React cập nhật state rồi render. Mỗi bước phải có input/output rõ.
2. **HTML, CSS, JavaScript, browser, server và database:** HTML mang cấu trúc/ý nghĩa, CSS trình bày, JavaScript điều khiển hành vi; browser hiển thị và gửi request; server thực thi luật đáng tin cậy; MySQL giữ dữ liệu bền vững. Không đưa secret hoặc quyền quyết định số dư xuống browser.
3. **HTTP request:** method nói hành động; path chọn endpoint/tài nguyên; query chọn tham số đọc; headers mang metadata, cookie và CSRF; body mang dữ liệu mutation. Server phải validate từng phần trước khi dùng.
4. **HTTP response:** status cho biết kết quả ở mức giao thức; headers/body cung cấp metadata và envelope dữ liệu/lỗi để client quyết định hiển thị hay thử lại.
5. **HTTP stateless:** mỗi request không tự nhớ request trước, nhưng ứng dụng vẫn có session phía server. Browser gửi opaque session cookie; server kiểm tra session và lấy owner từ đó.
6. **JSON không phải object đang sống:** JSON chỉ truyền dữ liệu đã serialize; function, prototype, reference identity và `undefined` không được giữ. Hai bên parse theo API schema thay vì giả định object còn nguyên.
7. **Vì sao validate ở browser chưa đủ:** client có thể bị bỏ qua hoặc sửa; API phải validate type/range/format/authorization; MySQL giữ thêm invariant như FK, UNIQUE, CHECK và transaction.
8. **CORS, authentication, authorization:** CORS giới hạn browser đọc response cross-origin; authentication xác định user; authorization quyết định user được phép làm gì. CORS không thay CSRF/Origin check và không chứng minh user sở hữu record.

## B. JavaScript: giá trị, identity và bất đồng bộ

9. **Type thuộc về biến hay giá trị:** type thuộc value; một `let` có thể trỏ lần lượt tới các type khác nhau. Ở boundary API, parse/validate rồi dùng DTO có type cụ thể.
10. **Coercion và truthy/falsy:** `===` tránh ép kiểu khi so sánh nhưng không thay validation. Đọc `0`, `''`, `null`, `undefined` rõ ràng; dùng điều kiện theo đúng kiểu mong muốn, không để chuỗi/number bị hiểu ngầm.
11. **`const` bảo vệ gì:** nó ngăn gán lại binding, không khóa object bên trong. Với React state và dữ liệu chia sẻ, tạo object/array mới để giữ snapshot cũ ổn định.
12. **Block scope:** `let`/`const` chỉ dùng trong block và không dùng được trước khai báo. Khai báo biến gần nơi dùng để giảm phạm vi nhầm lẫn.
13. **Function như phép biến đổi:** function nhận input, áp quy tắc và trả output; thao tác DB, gửi email hoặc ghi log là side effect cần thể hiện ở service/boundary riêng.
14. **Closure:** function giữ quyền truy cập binding trong lexical scope lúc nó được tạo, không sao chép sâu mọi dữ liệu. React handler vì thế thấy state của lần render đã tạo handler đó.
15. **Callback/higher-order function:** callback mô tả việc cần làm; hàm nhận callback quyết định lúc/cách gọi. Chỉ dùng khi làm code ngắn và rõ hơn, không dựng abstraction thừa.
16. **Primitive và object assignment:** primitive thường sao chép giá trị; object assignment có thể tạo nhiều binding trỏ cùng object. Mutation qua một binding ảnh hưởng các binding còn lại.
17. **Spread có shallow copy:** `{...x}`/`[...x]` chỉ tạo bản sao lớp ngoài; object lồng vẫn có thể chung reference. Nếu cập nhật trường lồng, sao chép từng lớp bị thay đổi.
18. **`map`/`filter` so với `sort`/`reverse`:** hai hàm đầu trả array mới; hai hàm sau thường mutate array gốc. Nếu cần sắp xếp state, sort bản sao.
19. **Class và prototype:** JavaScript `class` là cú pháp trên prototype; instance thường chia sẻ method qua prototype. Campus Coin có thể dùng class ở boundary cần thiết, nhưng service/hàm thuần hiện tại dễ đọc thì không cần đổi.
20. **`this` và arrow function:** function thường lấy `this` theo cách được gọi; arrow dùng lexical `this`. Tránh dựa vào `this` nếu một hàm thuần hoặc closure tên rõ đơn giản hơn.
21. **`try/catch` và Promise:** lỗi được bắt khi Promise được `await` trong `try` hoặc được trả tiếp trong chain đang được chờ. Không bỏ Promise khiến lỗi thoát khỏi error boundary.
22. **ESM và CommonJS:** đây là hai cách nạp module khác nhau. `package.json` đặt project ở ESM; tiếp tục dùng `import`/`export` thống nhất.
23. **Quên `return` Promise:** `.then()` chỉ chờ Promise mà callback trả về. Khi cần bước sau đợi DB/API xong, `return` hoặc dùng `await`.
24. **`async` không tạo thread:** `await` nhường lúc chờ I/O; tính toán đồng bộ dài vẫn chiếm event loop. Tách/bounded CPU work nếu có số đo cho thấy nó chặn request.
25. **`setTimeout(fn, 0)`:** callback chỉ được lên lịch; nó chờ call stack và hàng đợi ưu tiên hoàn tất. Không dùng timer như cam kết chạy ngay.
26. **`fetch` và HTTP 404:** `fetch` thường resolve một `Response` khi server trả 404; client phải đọc `response.ok`/status. `auth.api.ts` chuẩn hóa response lỗi để UI không coi 4xx là thành công.

## C. CSS, bố cục và khả năng truy cập

27. **Cascade:** browser xét origin/layer/importance trước specificity, scope và source order. Khi style sai, tìm rule thắng trước khi thêm `!important`.
28. **Specificity:** chỉ phân xử selector trong cùng mức cascade; nó không vượt origin/layer/importance cao hơn.
29. **Inheritance:** chỉ một số property kế thừa; `color` thường có, còn `margin` không tự truyền. Khai báo style đúng component thay vì trông chờ kế thừa.
30. **Box model:** content, padding, border, margin; `border-box` tính padding và border trong width. CSS chung đã dùng `box-sizing: border-box`.
31. **Normal flow:** bắt đầu bằng flow tự nhiên để nội dung đẩy nhau và thích ứng chiều cao; chỉ dùng absolute cho chi tiết cần chồng lớp như nút hiện mật khẩu.
32. **Flexbox và Grid:** Flexbox phù hợp căn/chia một chiều; Grid cho hàng và cột. Chọn theo quan hệ nội dung, không theo thói quen.
33. **Trục Flexbox:** `flex-direction` chọn main axis; cross axis vuông góc. `justify-content` căn theo main, `align-items` theo cross.
34. **Grid tracks và items:** tracks là hàng/cột; item được đặt/chảy vào vùng của chúng. Đừng dùng item như thể nó tạo ra lưới.
35. **Responsive breakpoint:** đặt khi nội dung bắt đầu chật, tràn hoặc khó thao tác, không theo một model điện thoại cụ thể. Auth card hiện co theo chiều rộng và breakpoint của chính layout.
36. **Absolute positioning:** tọa độ dựa trên containing block phù hợp, thường là ancestor có `position`; không mặc định theo viewport.
37. **`z-index` cao vẫn có thể thua:** stacking context giới hạn thứ tự con của nó. Tìm stacking context của cả hai phần tử trước khi tăng số.
38. **Layout chưa đủ:** form còn cần label, keyboard/focus, trạng thái không chỉ dựa vào màu; nếu thêm chuyển động thì tôn trọng `prefers-reduced-motion`. Auth form giữ native controls, `aria-describedby`, lỗi gắn với field và focus rõ.
39. **Declaration bị gạch trong DevTools:** kiểm tra selector match, rule thắng và computed style theo thứ tự cascade; sửa selector/layer/structure có nguyên nhân, không cộng `!important`.

## D. Bootstrap (không phải dependency hiện tại)

40. **Bootstrap là gì:** bộ CSS, utilities và plugin JS; nó không thay kiến thức semantic HTML, cascade, layout hoặc ownership state. Campus Coin không cài Bootstrap, nên không thêm chỉ để bắt chước ví dụ.
41. **Bootstrap grid:** nếu dùng, container giữ bề rộng, row quản lý gutter và column chia lưới responsive; hiện Campus Coin dùng CSS thường.
42. **Container/row/column/gutter:** lần lượt giới hạn vùng, gom cột, chia bề rộng và tạo khoảng cách. Các trách nhiệm này vẫn cần rõ dù viết CSS thủ công.
43. **`.col-md-6`:** trong Bootstrap 5.3, cột chiếm nửa hàng từ breakpoint `md`; dưới đó mặc định full width nếu không có class nhỏ hơn. Không áp dụng trực tiếp vì project không dùng Bootstrap.
44. **Utilities và custom CSS:** utility rải nhiều declaration nhỏ, có thể tạo xung đột cascade/`!important`. Nếu thêm framework sau này, quy định rõ class nào sở hữu grid và class nào sở hữu phần riêng.
45. **Bootstrap JS với React:** không để plugin và React cùng sửa một DOM state. Nếu sau này dùng plugin, cần lifecycle/cleanup rõ; hiện React sở hữu state và markup.

## E. React: state thành giao diện

46. **JSX và component:** JSX mô tả cây UI; component nhận input và trả JSX. `App` hiển thị trang auth theo `page`, `user`, message và trạng thái request.
47. **Props và composition:** parent truyền dữ liệu xuống; callback gửi ý định ngược lên; child không sửa props. Tách component khi giảm lặp hoặc làm trách nhiệm dễ hiểu hơn.
48. **Render list:** ngoài `map`, chọn UI cho từng item và `key` ổn định theo identity của dữ liệu; không dùng array index nếu danh sách reorder.
49. **UI declarative:** state là nguồn của UI; request/event đổi state, React render lại. Loading/error/success được biểu diễn bằng state thay vì bật/tắt DOM bằng tay.
50. **Pure render:** cùng props/state/context phải tạo cùng JSX; render không mutate dữ liệu cũ hoặc gây side effect. Gọi API đặt trong event handler hoặc effect phù hợp.
51. **State snapshot:** setter yêu cầu render mới; biến trong handler hiện tại vẫn là snapshot cũ. Không đọc state ngay sau setter với kỳ vọng đã đổi.
52. **Closure trong handler:** handler cũ thấy binding của render đã tạo nó. Với callback bất đồng bộ, kiểm tra dữ liệu có thể đã cũ trước khi ghi lại UI.
53. **Functional updater:** các lần `setCount(count + 1)` cùng đọc snapshot; updater `setCount(value => value + 1)` nối tiếp trên pending state. Dùng functional form khi giá trị mới phụ thuộc giá trị cũ.
54. **Immutable object/array state:** tạo representation mới để React nhận thay đổi và snapshot cũ còn đúng. Campus Coin đã dùng setter với object spread cho `touched`.
55. **Derived state:** `filteredItems` suy ra từ `items` và query thì tính trong render; tránh state trùng và effect đồng bộ phụ.
56. **State dùng chung:** đặt ở common parent gần nhất có thể làm single owner; truyền value/callback xuống. Không đồng bộ hai bản copy cùng dữ liệu.
57. **State identity:** React giữ state theo vị trí trong tree, component type và key. Đổi key/type có thể reset form; chỉ đổi key khi muốn reset có chủ đích.
58. **Controlled input:** `value`/`checked` lấy từ React state và `onChange` cập nhật ngay. Các input auth đang theo mô hình này để giữ form khi request lỗi.
59. **Handler và Effect:** handler chạy do thao tác cụ thể; Effect đồng bộ với hệ thống ngoài sau render/commit. Submit/login thuộc handler; kiểm tra session/provider khi mở app thuộc effect.
60. **Effect dependencies/cleanup:** dependencies khai báo giá trị effect đọc; cleanup dừng/thu hồi việc setup trước hoặc lúc unmount. Nếu một request đọc có thể về trễ, cleanup/abort hoặc kiểm tra request identity.
61. **Ref:** giữ DOM handle hoặc giá trị không cần render lại. `headingRef` dùng focus sau đổi trang; `requestInProgress` chặn submit lặp; nội dung hiển thị vẫn dùng state.
62. **Reducer/context/custom Hook:** reducer gom transitions phức tạp; context chia sẻ dữ liệu qua nhiều tầng; custom Hook tái dùng logic. Auth hiện còn đủ nhỏ để state/hàm trong `App` dễ giải thích; chưa cần ba abstraction này.
63. **Rules of Hooks:** thứ tự Hook phải như nhau ở mọi render để React gắn đúng state/effect. Gọi Hook ở top level, không đặt trong điều kiện/loop.
64. **Response cũ về muộn:** đây là race giữa request và ý định mới hơn. Dùng `AbortController` hoặc request identity trước khi cập nhật UI; auth hiện chặn request mutation lặp.
65. **State tối thiểu của CRUD:** giữ danh sách gốc, query, draft form và status/error cần thiết; tính filter/count từ đó. Tránh lưu thêm boolean có thể mâu thuẫn với `status`.

## F. Node.js và HTTP server

66. **JavaScript và Node:** JavaScript là ngôn ngữ; Node là runtime cung cấp process, network, filesystem và APIs server. Code browser không tự có quyền dùng API Node.
67. **Browser APIs và Node APIs:** module chỉ chạy ở cả hai nơi nếu chỉ dùng API chung hoặc nhận adapter qua boundary. DB, SMTP và secret nằm ở server.
68. **Module mode:** extension và `package.json` quyết định loader; Campus Coin khai báo ESM và dùng `import`/`export`.
69. **Event loop:** Node chờ I/O ngoài call stack rồi chạy continuation khi có kết quả, nhờ vậy phục vụ nhiều request mà không block trong lúc chờ DB/email.
70. **CPU work trong `async`:** `async` không tách thread; hashing vẫn tiêu CPU. Password hashing phải dùng library/config đã chọn và giới hạn concurrency nếu đo thấy nghẽn.
71. **Stream:** chuyển file lớn theo chunks, giảm bộ nhớ và hỗ trợ backpressure. Auth/API JSON hiện nhỏ và có giới hạn body; không cần thêm stream abstraction cho payload nhỏ.
72. **Environment variables:** chứa cấu hình/secret server-side; DB password, SMTP/OAuth/session secrets không được đưa vào biến frontend `VITE_*`, response hoặc Git.

## G. API pipeline (nguyên lý middleware áp dụng cho Node routes)

73. **Request pipeline:** request đi qua parse/size limit, Origin/CSRF, route match, session, validation, service và serializer/error handler. Middleware sai thứ tự làm request thiếu body hoặc identity.
74. **Route match:** method và path cùng xác định endpoint; `GET` và `POST` cùng path có behavior/permission khác.
75. **Nguồn input:** params lấy từ path, query từ URL `?`, body từ JSON parser. Mỗi nguồn cần schema/validation theo contract.
76. **JSON parser làm gì:** chuyển JSON text thành object; không chứng minh field đúng type, owner đúng hoặc business rule đúng.
77. **Middleware không để request treo:** kết thúc response hoặc chuyển control/lỗi đúng một lần. Với Node route, mọi async path cần trả response hoặc propagate error.
78. **Thứ tự middleware là behavior:** parser, security checks, auth và route phải chạy theo thứ tự; route phải fail closed nếu bước bảo vệ lỗi.
79. **404 và server error:** 404 nghĩa không tìm thấy route/resource theo policy; lỗi bất ngờ là 5xx. Response lỗi dùng envelope ổn định, không trả stack.
80. **Rejected async handler:** framework khác nhau có cách chuyển lỗi khác nhau; Node route hiện phải bắt/propagate lỗi rõ tới API error mapper, rồi vẫn kiểm tra authz và redact.

## H. Dữ liệu bền vững (dịch nguyên lý document DB sang MySQL)

81. **Schema linh hoạt không bỏ invariant:** document DB có thể giữ BSON linh hoạt nhưng vẫn cần validation. Campus Coin dùng MySQL schema typed, FK, CHECK, UNIQUE và migration versioned để giữ invariant.
82. **ID trong URL và ID database:** URL param là text chưa tin cậy; validate format/range rồi convert theo kiểu DB. Không tự cast mọi string hoặc dựa vào client.
83. **Schema bắt đầu từ access pattern:** xác định luồng đọc/ghi, quan hệ và invariant trước. Campus Coin dùng bảng wallet, ledger, savings, budget và user relation thay vì sao chép object UI.
84. **Embed/reference:** với MySQL, dữ liệu quan hệ độc lập dùng bảng/FK; JSON chỉ phù hợp dữ liệu phụ không cần join/invariant riêng. Không nhét ledger/savings vào blob JSON.
85. **Filter/projection/cursor:** tương ứng `WHERE` chọn row, `SELECT` cột cần thiết, cursor/pagination duyệt kết quả có giới hạn. Query tài chính phải thêm owner predicate.
86. **Update/replacement/upsert:** SQL `UPDATE` chỉ cột được allow-list; không truyền body tùy ý thành query. Upsert chỉ dùng khi contract định nghĩa rõ conflict và idempotency.
87. **Index:** đổi dung lượng và chi phí ghi để tăng tốc query phù hợp. Chọn thứ tự composite index theo filter/sort thật; xác nhận bằng `EXPLAIN`/`EXPLAIN ANALYZE` và workload.
88. **Aggregation:** SQL `WHERE`, `GROUP BY`, aggregate và CTE biến đổi row theo các bước có thứ tự. Report/budget phải tính từ ledger có hiệu lực và scope owner.
89. **Atomicity:** một lệnh cập nhật row có atomicity của statement; nhiều bước giữ wallet/ledger/savings phải dùng transaction cùng lock order để cùng commit hoặc rollback.
90. **Connection pool:** server tái sử dụng pool MySQL có giới hạn thay vì mở kết nối cho mỗi request; giới hạn pool theo số instance và quota DB.

## I. Lát cắt full-stack và chẩn đoán

91. **Theo dấu một thao tác:** form state → JSON request → input đã validate → service/repository → row MySQL → response envelope → state React → DOM. Mỗi boundary đổi representation và có kiểm tra tương ứng.
92. **CRUD contract:** endpoint dùng method/path/status ghi trong OpenAPI; create trả `201`, read/update trả `200` khi có body, delete có status theo contract; lỗi validation/auth/conflict/rate-limit có status và error code ổn định.
93. **Validation ba lớp:** client cho feedback; API là authority cho input, owner và business rules; DB giữ invariant cuối bằng constraint/transaction. Không bỏ lớp nào vì lớp khác đã check.
94. **Search/filter:** danh sách nhỏ đã tải có thể derive trong React; dữ liệu lớn hoặc paginated phải query API/DB với limit, owner filter và index.
95. **Stable ID:** cùng user/entity ID được biểu diễn bằng React key, URL text và DB number/string theo boundary. Kiểm tra/conversion ở server; không nhận `userId` body làm owner.
96. **UI states:** trạng thái hữu hạn như loading/ready/saving/error ngăn các boolean mâu thuẫn. Form auth hiện dùng page, busy và message; giữ cách này khi còn dễ đọc, chuyển sang status union nếu thêm nhiều trạng thái tương tác.
97. **Bốn boundary bảo mật:** CORS là browser policy; authentication tạo identity; authorization kiểm tra action/owner; secrets ở server runtime. Không thay cái này bằng cái khác.
98. **Bootstrap và custom CSS:** Bootstrap không có trong dependencies hiện tại. CSS riêng quản lý style; React quản lý state/markup. Nếu bổ sung framework, phân rõ grid/utilities và component styles.
99. **Request chậm:** thu timestamp UI/network/API/DB query, so sánh latency từng đoạn và xem query plan; chỉ tối ưu tầng có số đo. Không ghi body, password, OTP, token hay dữ liệu tài chính thô.
100. **Acceptance của một lát cắt:** hoàn thành thao tác từ form qua API tới MySQL rồi đọc lại; có validation, lỗi, trạng thái UI, owner isolation, migration/constraint và test. Không coi mock hoặc build đơn lẻ là bằng chứng production.

## J. Form HTML và kiểm tra patch

101. **Vì sao `label`, `fieldset`, `legend` là contract:** `label` đặt tên cho từng control; `fieldset` nhóm các control liên quan; `legend` đặt tên cho nhóm. Browser và công nghệ hỗ trợ nhận được ý nghĩa mà `div`/CSS không thay thế. Form auth đã thêm nhóm này.
102. **Submit giữ Enter, validation và một lần xử lý:** dùng `<form onSubmit>` và nút `type="submit"`; HTML kiểm tra `required`, `type`, `pattern`, min/max trước; React xử lý một submit handler. Form auth đã bỏ `noValidate` và dùng `onInvalid` để bật lỗi inline.
103. **Gắn lỗi tùy biến:** input đặt `aria-describedby` trỏ tới ID phần lỗi và cập nhật `aria-invalid`; lỗi có nội dung dễ hiểu, không chỉ màu. Auth form đã dùng pattern này.
104. **Owner trong PATCH:** lấy `user_id` từ session đã xác thực, đưa owner đó vào truy vấn/update. Không tin owner từ body/path; khi không sở hữu resource, trả kết quả theo contract.
105. **Lỗi dự kiến và bất ngờ:** input sai/conflict/unauthorized dùng status và error code công khai; lỗi bất ngờ thành 5xx tổng quát. Log nội bộ không chứa secret/raw payload và response không có stack/provider details.
106. **Không đẩy body thành update:** parse rồi allow-list trường mà use case cho phép; service/repository tự dựng SQL statement có placeholder. Client không được chọn cột, owner predicate hoặc query operator.
107. **Unique constraint khi có race:** pre-check không đảm bảo hai request đồng thời; unique index/constraint mới là authority. Chuyển duplicate-key thành conflict theo API contract.
108. **Đọc `EXPLAIN ANALYZE`:** kiểm tra access path/index, rows examined/estimated, rows trả về, sort/temp table và thời gian thực; so với workload đo. Không áp kết luận của MongoDB `explain` nguyên xi cho MySQL.
109. **Theo dõi request mà không lộ dữ liệu:** dùng request/correlation ID, method/route/status/duration và mã lỗi; không log request body, email đầy đủ, OTP, password, cookie, reset token hoặc payload tài chính.
110. **Không nhận patch chỉ vì happy path xanh:** đối chiếu requirement với diff; chạy focused và cumulative gates; thử invalid, stale, unauthorized, provider/DB failure; review secret/owner/transaction boundaries; ghi rõ phần chưa được chứng minh.

## K. 16 câu áp dụng có điều kiện cho JEV

Phần này chỉ là boundary thiết kế cho JEV tùy chọn. JEV hiện default-off và không có quyền tạo/sửa/xóa ledger, wallet, savings hoặc budget.

111. **Phần nào nên là deterministic, phần nào dùng model:** số dư, budget, quyền và validation luôn do code xác định; model chỉ gợi ý category từ tập ứng viên nếu feature được bật.
112. **Vì sao workflow là baseline:** một request gợi ý category có đầu vào/đầu ra cố định; xử lý bằng workflow nhỏ dễ kiểm soát hơn agent tự quyết định nhiều bước.
113. **Khi nào task chưa cần agent loop:** nếu một lần gọi model có schema và kết quả có thể từ chối/confirm, không cần tool loop hoặc tự hành động.
114. **Instructions/context cần scope và provenance:** chỉ gửi mô tả tối thiểu cùng category candidates; gắn rõ dữ liệu nào từ user và dữ liệu nào là instruction hệ thống. Không gửi session/secret/financial history thừa.
115. **Chuỗi tool call an toàn:** nếu sau này có tool, parse yêu cầu → validate schema → authorize server-side → thực thi tool allow-list → trả observation thật. JEV hiện chưa có quyền gọi tool.
116. **Schema trước side effect:** validate output typed trước khi dùng; model output không trực tiếp ghi DB hoặc quyết định payment.
117. **Trả observation thật:** ứng dụng chỉ báo category/provider result mà hệ thống thật trả; timeout/schema fail không được bịa kết quả thành công.
118. **Stop condition và budget:** một lần gợi ý có giới hạn bước, timeout và token/cost budget; vượt ngưỡng thì dừng và cho nhập thủ công.
119. **Thiếu bằng chứng:** trả lời “không đủ dữ liệu” hoặc fallback thủ công; không suy đoán category như kết quả chắc chắn.
120. **Least privilege:** JEV chỉ nhận dữ liệu tối thiểu và quyền suggest; không có DB write credential, session hay quyền authorize tiền.
121. **Secret không thuộc prompt/tool result:** OpenRouter key, SMTP/DB credential, cookie và token chỉ nằm trong server secret store; tuyệt đối không gửi vào model hoặc client.
122. **Retry:** chỉ retry lỗi tạm thời; timeout/retry bị giới hạn và không lặp side effect. Gợi ý không có write side effect; nếu sau này thêm write phải có idempotency.
123. **Human approval:** user xác nhận hoặc sửa category suggestion trước khi lưu giao dịch; model không tự submit payment.
124. **Uncertainty cao:** trả trạng thái cần chọn tay thay vì ép một category hoặc ẩn mức thiếu chắc chắn.
125. **Cost/latency là boundary:** đặt timeout, hạn mức, concurrency và fallback trước khi bật provider; provider/model/quota thực tế phải được xác minh, không suy đoán.
126. **Test vượt happy path:** nếu triển khai JEV, test output sai schema, provider timeout/4xx/5xx, prompt input độc hại, dữ liệu thiếu, quota, log redaction và fallback trước khi bật.

## Trạng thái chuyển câu hỏi thành thay đổi dự án

- Câu 1–100 đã được trả lời và chuyển thành nguyên tắc cho web, JavaScript/React, Node/API và MySQL. Một số nguyên tắc đã có trong auth/API/domain code và CI; chúng chưa thể được xem là áp dụng đầy đủ trên giao diện sản phẩm khi các màn domain sau đăng nhập còn thiếu.
- Câu 101–110 tập trung vào form và review patch. Auth form đã dùng semantic HTML, native validation, một submit handler, lỗi gắn với input và keyboard focus cơ bản. Accessibility của toàn ứng dụng vẫn cần kiểm tra sau khi có UI domain.
- Câu 111–126 chỉ áp dụng khi JEV được bật. JEV hiện optional và default-off, nên các câu này đang là guardrail thiết kế; không phải bằng chứng JEV đã được triển khai hoặc kiểm thử.
- Vì vậy, câu trả lời cho từng nguyên lý đã có trong tài liệu, nhưng trạng thái triển khai khác nhau: có phần đã sửa code, có phần là quyết định/acceptance, có phần chờ sản phẩm hoặc provider được bật. Chỉ ghi “đã áp dụng” khi có code hoặc test evidence tương ứng.

## Thay đổi áp dụng trong code lần này

- Auth form dùng `fieldset`/`legend` để nhóm controls, `label` tiếp tục gắn từng input; form có accessible name từ heading.
- Native HTML validation được bật; `onInvalid` hiện lỗi inline; form submit chỉ có một `onSubmit` handler và nút submit khai báo `type="submit"`.
- Thêm outline bàn phím cho button/link; giữ lỗi gắn với field bằng `aria-describedby`/`aria-invalid`.
- Sửa email trong test owner-isolation để là địa chỉ hợp lệ, tránh khoảng trắng làm test dừng ở validation đăng ký.
- Các nguyên lý khác được ghi như quyết định/acceptance phù hợp stack. Tài liệu này không tuyên bố test MySQL, SMTP staging, accessibility audit hoặc JEV live đã pass nếu chưa có evidence riêng.
