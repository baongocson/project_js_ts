# Kế hoạch giao việc backend — dev-backend

> Cập nhật BE-1 ngày 16/11/2026: xem [kết quả và interface bàn giao](be1-handoff.md). Phần kiểm kê bên dưới là baseline trước khi thực hiện BE-1, không phải trạng thái mới nhất.

Ngày kiểm kê: **16/11/2026**. Nhóm: **3 người backend**, phối hợp 3 người frontend. Hạn báo cáo suy ra từ yêu cầu “sau 3 ngày”: **19/11/2026, giờ cụ thể cần chốt**. T là lúc nhóm nhận việc; các mốc T+24/48/72 giờ là thời gian trôi qua, không phải yêu cầu làm liên tục.

**Phạm vi đã xác nhận:** phải có online, offline hoạt động và **đồng bộ dữ liệu offline lên server khi có mạng** trong cùng đợt bàn giao. Đọc kèm [kế hoạch frontend](frontend-implementation-plan.md). Đây là tài liệu giao việc; lượt lập kế hoạch chưa triển khai nghiệp vụ, commit, merge hoặc tạo/chuyển nhánh.

## 1. Backend hiện làm được gì?

Đối tượng kiểm kê là **main + các thay đổi chưa commit trong checkout hiện tại**, không chỉ commit main. HEAD main lúc kiểm kê: `1067712`. Không đồng nhất kết quả dưới đây với code đã được đẩy lên remote.

| Hạng mục | Hiện trạng xác minh từ code |
| --- | --- |
| Khởi động API | NestJS modular monolith, prefix /api/v1, CORS, JSON limit, pipe/validation, exception filter và requestId. |
| Health | GET /api/v1/health chạy thật; database=false trả disabled; khi bật DB có code ping và báo 503 khi lỗi. Lần kiểm tra này chỉ chạy với DB tắt. |
| MongoDB | Có registry 12 collection, Mongoose/BSON validator/index; CLI provision/verify và kiểm readiness/transaction support khi startup. Chưa chạy lại verify/integration Atlas trong lượt kiểm kê này. |
| Route nghiệp vụ | Có **27 route** và DTO/parser/response contract, nhưng cả 7 service chỉ gọi pending rồi trả **501 NOT_IMPLEMENTED**. Chưa có luồng nghiệp vụ thành công qua API. |
| Auth và quyền | Guard chỉ ném 501 nếu gọi; chưa gắn route. Repository đang là class rỗng; chưa có CRUD, JWT/session/ownership thật trong checkout này. |
| Quy tắc thuần | Đã có typed cell/missing/equality, sort/filter, canonical request, workspace merge/no-op/revision, preview/no-op/diagnostics, restore/read lifecycle và lựa chọn retry. Chúng chưa được nối thành transaction/service thật. |
| Import và snapshot | Parser importOptions có; chưa có nhận file CSV thực tế qua FileInterceptor, parser CSV nghiệp vụ, codec binary, lưu file nguồn hay publish version. |
| Processing/analysis/history | Có kiểu dữ liệu, validation và policy; chưa có engine thực hiện 27 method, thống kê, lưu preview, Apply, restore hay history chạy thật. |
| Sync offline | Chưa có outbox/replay protocol/ID mapping hoặc khả năng đồng bộ. Không có endpoint sync riêng trong hợp đồng 27 API. |
| Tooling | ESLint 10, TypeScript strict, Jest và Supertest; repository đặt phẳng, README theo module. |

### Bằng chứng và giới hạn kiểm thử hiện tại

- Đã chạy lại: lint, typecheck và unit **20/20**. HTTP E2E backend **40/40**, kiểm 27 route và validation/501, không chứng minh auth/CRUD thành công.
- Bộ E2E toàn dự án còn build hai workspace và kiểm frontend health trên Chromium. Kết quả chi tiết hiện tại được ghi trong kế hoạch frontend.
- Không chạy integration Atlas hoặc các test của nhánh cũ trong lượt này. Có code schema không đồng nghĩa đã kiểm tra database đang triển khai hay persistence nghiệp vụ.
- Bằng chứng chính: `backend/src/modules/*/*.service.ts`, `*.guard.ts`, `*.repository.ts`, `backend/src/infrastructure/database/`, `backend/src/common/`, `backend/src/test/`.

### Tài sản có thể tái sử dụng, chưa thuộc main

`codex/auth-session` có commit `745b115` về auth/session, kèm code offline từ lịch sử trước đó. Có bcryptjs, JWT/refresh, Mongo session và test riêng. Handoff của nhánh tự ghi **chưa xác minh HTTP + Atlas**, chưa có JWT guard cho API khác và chưa có rate limit hoàn chỉnh. Không coi đây là auth đã nghiệm thu.

**BE-1 phải review và lấy từng phần**, chuyển repository về vị trí phẳng hiện tại, chuyển test cũ sang Jest hiện tại. Không merge/cherry-pick toàn nhánh một cách máy móc: nhánh dùng cây repositories/, tài liệu/test/package cũ và còn mang thay đổi frontend.

## 2. Điều kiện bắt đầu nhánh và nguyên tắc phối hợp

1. Nhánh làm việc của nhóm backend là **dev-backend**; nhóm frontend là **dev-frontend**. Hai tên này chưa có trong danh sách nhánh local/remote-tracking đã quan sát; chưa truy vấn remote mới nên không kết luận chúng chưa từng tồn tại trên server.
2. Checkout hiện có nhiều file sửa và chưa được Git theo dõi. Trước khi chia nhóm, trưởng nhóm phải review và tạo **một commit nền chung** gồm refactor, ESLint, tài liệu và test hiện tại, rồi cho cả hai nhánh xuất phát từ commit đó. Nếu tạo nhánh chỉ từ main trên remote lúc này, có thể thiếu phần vừa hoàn thiện.
3. Chỉ stage đường dẫn đã review. Không dùng `git add .` khi chưa loại thư mục video: video/model/công cụ phân tích rất lớn, cùng .env/credential và output không phải nội dung bàn giao.
4. Mỗi người dùng clone/checkout riêng; không chuyển nhánh luân phiên trong cùng thư mục đang có người sửa. Cùng dev-backend nhưng chia chủ sở hữu file, commit nhỏ, phối hợp trước khi push; không force-push hoặc sửa lịch sử chung.
5. **BE-1 giữ vai trò tích hợp chung**: root package.json/package-lock.json/workspaces/eslint và thay đổi hợp đồng phải có BE-1 tổng hợp, FE-1 review. Người cần dependency thông báo trước, tránh hai nhóm ghi đè lockfile.
6. Mỗi ngày đưa các commit đã qua kiểm tra vào bản tích hợp chung do trưởng nhóm quản lý; cả hai nhóm cập nhật cùng API/shared-core commit. Không chờ đến giờ cuối mới ghép hai nhánh.

## 3. Phân công 3 thành viên

Điền tên thật vào chỗ trống trước khi giao. Mỗi người chịu trách nhiệm cả implementation, test và README của gói mình.

| Người | Tên thật | Vai trò/chủ sở hữu | Phối hợp |
| --- | --- | --- | --- |
| BE-1 | … | Auth, Users, JWT/session/ownership framework, rate limit, tích hợp backend và root config | FE-1; nhờ BE-2 xử lý cascade dữ liệu |
| BE-2 | … | Projects/workspace, Datasets/import/đọc dữ liệu, snapshot codec/file storage, idempotency/lease/fence và hỗ trợ sync | FE-2, BE-3; kiểm protocol với FE-1/FE-3 |
| BE-3 | … | Engine dùng chung, Processing/preview/Apply, History/restore, Analysis/points-3d | FE-3 và BE-2; được BE-1/BE-2 hỗ trợ fixture/test sau luồng của họ ổn định |

**Cảnh báo tải:** BE-3 gánh phần thuật toán nặng nhất. Chia 27 endpoint thành 7/10/10 theo module không có nghĩa công sức bằng nhau. Không giao thêm AI, đổi framework, redesign database hoặc hạ tầng không cần cho báo cáo.

## 4. Nguồn hợp đồng và quyết định cần khóa trong 4 giờ đầu

- Dùng [API.md](../api/API.md), [API.xlsx](../api/API.xlsx), [DTO contract](../api/dto-contract.md), [ERD](../erd/ERD.html), [database](../database/database.md) và [kiến trúc](../architecture/architecture.md). Giữ D01–D26, các trần hiện có và semantics missing/no-op/restore.
- BE-1 + FE-1 khóa request/response/error, auth bootstrap, cookie và môi trường HTTPS thử; phân biệt 200/201/204, 401/403/409/410/413/429/503. Nếu tài liệu và code khác nhau, ghi chỗ khác và xác nhận; không tự đổi API để vượt test.
- BE-2 + BE-3 + FE-3 khóa typed snapshot, rowId/columnId, codec version, quy tắc tạo ID và mapping local/server. Demo offline cũ dùng Cell=string nên không được coi là kiểu dữ liệu cuối cùng.
- Đề xuất **packages/data-core** là gói TypeScript thuần dùng ở browser và backend: types/codec contract do BE-2 phụ trách, engine do BE-3 phụ trách; không dùng Nest, fs, IndexedDB hay HTTP trong core. BE-1 cập nhật workspace/build/exports và chốt với FE-1 trước khi dùng. Đây là phần cần xây mới, chưa tồn tại khi kiểm kê; mục đích là tránh hai engine cho kết quả khác nhau khi replay offline.
- Chốt nơi lưu file CSV nguồn, codec/chunk và dữ liệu test; có thể chọn storage local cho báo cáo nếu được trưởng nhóm duyệt, vẫn giữ storage adapter và bản nguồn bất biến. Không cam kết cloud/object storage khi chưa có cấu hình.
- Chốt danh sách offline operation sẽ được hỗ trợ trong đợt báo cáo; toàn bộ 27 method vẫn là mục tiêu hợp đồng. Không tự loại method khỏi phạm vi mà không báo chủ dự án. Phần chưa đạt phải hiển thị đúng là chưa hỗ trợ.

## 5. Các gói việc để giao

### BE-00 — Nền chung và tận dụng nhánh cũ

**Owner BE-1, hỗ trợ BE-2/BE-3; mốc T+4 giờ.**

- Chốt commit nền và phân công file; review auth branch, lập danh sách phần nhận/không nhận và lý do.
- Chốt shared core/protocol fixture với frontend; làm một commit chỉ chứa core/config cần dùng chung để tích hợp sớm.
- Chuẩn bị database/test user riêng, local HTTPS/cookie, mẫu CSV và cách chạy; không gửi secret vào chat/Git.
- Bàn giao: sơ đồ trách nhiệm, bảng 27 API theo trạng thái scaffold/implemented/tested, fixture JSON hợp lệ và lỗi, danh sách dependency đã khóa.

**Nghiệm thu:** hai nhóm cài từ cùng commit và chạy được lint/typecheck; không mang lại cây thư mục hoặc bộ test cũ từ nhánh auth.

### BE-01 — Auth và bảo vệ API

**Owner BE-1; phục vụ FE-01/FE-02; ưu tiên ngày 1.**

- Hoàn thiện 4 API register/login/refresh/logout từ phần nhánh cũ đã review. Bcrypt cost 12, email ASCII, password theo byte, response projection theo từng endpoint.
- Access JWT 15 phút; refresh opaque trong cookie HttpOnly/Secure/SameSite=Lax/Path đúng, hash token phía server, hạn tuyệt đối 7 ngày, rotation CAS và revoke khi logout.
- Guard kiểm JWT, session/user active; framework ownership cho project/dataset/version/preview. Gắn guard lên API bảo vệ; không gắn guard placeholder trả 501.
- Kiểm Origin/CORS và rate limit theo hợp đồng. Login sai dùng thông báo thống nhất, không trả/log hash hoặc token nội bộ.
- Kiểm thứ tự auth trước syntax ID/quyền theo D26. Public auth/health không bị khóa bởi guard JWT toàn cục.

**Nghiệm thu:** HTTP + database thật có register/login/refresh/logout; concurrent refresh chỉ một request thành công; access sau logout/session hết hạn bị từ chối; không cookie/JWT vẫn không đọc được dữ liệu. Test DB-disabled trả 501 cũ không được dùng thay bằng chứng này.

### BE-02 — Users và xóa tài khoản

**Owner BE-1, cascade do BE-2 hỗ trợ; đủ 3 API Users.**

- GET/PATCH me theo projection, theme mặc định system và nested PATCH hiện hành.
- DELETE me mark deleting, revoke mọi session, khóa các luồng publish rồi dọn dữ liệu phụ thuộc; chỉ 204 sau khi hoàn tất. Dùng cơ chế cascade/fence chung với BE-2, không viết lại bản khác.

**Nghiệm thu:** chỉ sửa tài khoản hiện tại; xóa không để orphan hoặc cho thao tác đang chạy tái tạo dữ liệu; lỗi hạ tầng không giả thành công. FE-1 nhận được contract để xóa token và xử lý bản offline chưa đồng bộ.

### BE-03 — Snapshot, CSV và đọc dataset

**Owner BE-2; core contract với BE-3; phụ thuộc auth/quyền khi tích hợp.**

- Xây codec round-trip cho typed cell, ID và token missing; chunk theo byte <=4 MiB, encoded snapshot <=100 MiB, checksum/codecVersion, published snapshot bất biến.
- Nhận multipart CSV <=16.000.000 byte và importOptions; BOM, quoted/doubled quote/newline, header-only, blank record và sai số cột có vị trí lỗi theo API. Giữ nguyên file gốc; không chỉ lưu CSV đã xử lý lại.
- Suy kiểu và kiểm override columnTypes trên toàn cột; không tự thêm trần dòng/ô chưa duyệt.
- Triển khai 4 endpoint datasets: import; version metadata; rows phân trang/filter/sort; get row độc lập trang/lọc hiện tại. Chặn đọc staged và kiểm đúng quan hệ version/dataset/project/owner.
- Expose adapter đọc snapshot cho Processing/Analysis qua boundary đã chốt; BE-3 không truy cập Mongo/chunk theo một codec riêng.

**Nghiệm thu:** import tạo V1, dataset/columns/chunks và operation đồng bộ; read-after-import khớp typed input; UUID/position/lineage có quy tắc map được cho offline. Header-only được phép, dữ liệu invalid có lỗi rõ vị trí.

### BE-04 — Projects/workspace và hạ tầng publish an toàn

**Owner BE-2; 6 API Projects và hạ tầng dùng chung cho BE-3.**

- Tạo project + workspace mặc định, list/filter/sort/pagination, get, rename, PATCH workspace và delete cascade.
- Nối planWorkspacePatch vào repository với CAS thật; no-op giữ revision, stale 409; GET không ghi DB, chỉ trả workspaceAdjusted/adjustments khi cần.
- Triển khai receipt idempotency cho create/import/preview/Apply/restore: cùng key+payload replay, khác payload 409, pending có Retry-After; leaseToken/CAS/recovery và lifecycle/writeEpoch fence.
- Chuẩn bị transaction publish dùng chung: candidate ngoài transaction, trong transaction ngắn cập nhật revision/currentVersion + publish + operation + receipt; không upload/tính toán dài trong transaction.
- Delete dọn workspace/dataset/version/columns/chunks/preview/history/receipt; chặn publish sau xóa, có khả năng tiếp tục cleanup sau crash.

**Nghiệm thu:** retry sau mất response không tạo project/version/operation trùng; hai Apply cạnh tranh không cùng publish; cross-owner bị chặn; delete đang chạy không bị đồng bộ offline tái tạo dữ liệu.

### BE-05 — Engine 27 method, preview và Apply

**Owner BE-3; phụ thuộc BE-03/04; FE-03 dùng cùng core.**

- Đầu tiên nối **edit_cell, normalize_whitespace(mode=trim), fill_constant** xuyên suốt để có đường nghiệm thu; đây là thứ tự làm, không phải tự giảm phạm vi cuối.
- Sau đó hoàn thiện đủ các nhóm theo bảng bên dưới, với fixture typed dùng chung online/offline.
- POST/GET preview lập candidate, schemaChanges, previewChanges và diagnostics; server gán engineVersion/specHash, TTL 30 phút, canApply đúng; GET expired 410, purged 404, applied còn vòng đời vẫn đọc được.
- Apply chỉ nhận previewId, dùng publish/receipt/fence của BE-04. Invalid/no-op không tạo version/history; không nhận pipeline hay client engineVersion.
- Thống kê whole-columns dù scope chỉ một ô/cột; filter bảng không giới hạn dòng xử lý. Không mutate snapshot nguồn.

| Nhóm | Method phải kiểm theo API |
| --- | --- |
| Ô và cleaning | edit_cell, remove_duplicates, strip_html, normalize_whitespace, uppercase, lowercase, replace_value |
| Convert | convert_number, convert_text, convert_date, convert_datetime, convert_boolean |
| Missing | fill_mean, fill_median, fill_mode, fill_max, fill_constant, drop_missing_rows, drop_missing_columns |
| Outlier/scaling | clip_iqr, clip_zscore, scale_minmax, standardize |
| Transformation/encoding | log1p, square, one_hot, ordinal |

**Nghiệm thu:** mỗi method có ca đúng/biên/sai và parity online/offline; bảo toàn token, phân biệt ZERO_SPREAD/ZERO_VARIANCE, one-hot/ordinal đúng lineage và giới hạn; retry Apply không tạo version thứ hai.

### BE-06 — History/restore và Analysis/3D

**Owner BE-3; FE-03 tích hợp UI.**

- 2 API History: list operations và restore thành version mới; restore current 409 không đổi dữ liệu, target sai dataset/unpublished/missing 404; receipt/CAS/fence như Apply.
- 5 API Analysis: summary, distribution, Pearson correlation, points-3d và value-counts, đọc published snapshot qua adapter BE-03.
- Missing/duplicate theo typed semantics; population std, IQR linear interpolation; không đủ dữ liệu trả null/N/A kèm reason, không impute 0. Points-3d trả counts bị ẩn và stable-rowid sampling, getRow phục vụ click điểm.

**Nghiệm thu:** dữ liệu fixture cho kết quả đối chiếu được; toàn bộ response đúng contract, không lộ staged/owner khác; chart không tự tính một bộ thống kê khác với backend.

### BE-07 — Đồng bộ offline lên server, cùng frontend

**Owner giao thức BE-2; BE-1 phụ trách auth/phiên/quyền; BE-3 phụ trách replay/engine. Bắt đầu từ ngày 1.**

Phương án đề xuất cho hạn 3 ngày: **frontend giữ outbox bền vững và replay qua 27 API đã có**, thay vì thêm endpoint bulk-sync mà chưa có hợp đồng. Đây là protocol cần ghi thành tài liệu/fixture ở BE-00, không phải tính năng đã tồn tại.

1. Offline project chưa có server ID: đăng nhập khi có mạng → tạo project → upload **file CSV nguồn gốc** → nhận dataset/version/column IDs → map row IDs qua dữ liệu nguồn/position được kiểm chứng. Local ID không được gửi như ObjectId server.
2. Replay thao tác theo thứ tự qua preview/Apply hoặc restore; mỗi logical mutation có key ổn định, chờ receipt thành công rồi lưu mapping local-version → server-version và checkpoint. Với cột thêm/xóa và row thay đổi, core/mapping phải xác định bằng ID/lineage từ kết quả, không đoán theo tên.
3. Dataset đã có trên server: kiểm currentVersion/revision/owner trước khi replay. Khi base cũ, dừng và trả conflict rõ ràng; không last-write-wins hoặc tự ghi đè. Không hứa auto-merge trong 3 ngày khi chưa có chính sách.
4. Mất mạng giữa chừng: lần sau replay cùng key/hash đúng actionScope. Server không dựa vào pendingSync, không tin client engineVersion/candidate, và vẫn kiểm quyền/lifecycle trước replay receipt.
5. Thiếu/expired auth, quota/limit, delete hoặc 403/409 phải là trạng thái có thể giải thích; lỗi chưa được xác nhận commit dùng recovery/idempotent replay, không tạo key mới để thử mù.

**Nghiệm thu chung bắt buộc:** tạo/chỉnh dữ liệu offline → đóng/mở lại app → có mạng/đăng nhập → đồng bộ lên Atlas → mở bằng phiên hoặc trình duyệt mới đọc được dữ liệu từ API. Ngắt mạng sau server commit nhưng trước response rồi retry: không trùng project/version/history. Server đã đổi version: báo conflict và giữ bản local. Local/server IDs, typed data và thứ tự thao tác có bằng chứng mapping.

Nếu không chứng minh được mapping đầy đủ cho replay, BE-2/FE-3 phải báo ngay tại gate T+4 giờ và chốt protocol khác với trưởng nhóm, gồm cập nhật API/DTO/ERD nếu cần. **Không gọi việc export file hoặc đổi nhãn pendingSync thành true/false là đồng bộ hoàn chỉnh.**

## 6. Lịch 3 ngày và các mốc bàn giao

| Mốc | BE-1 | BE-2 | BE-3 | Điều kiện tích hợp |
| --- | --- | --- | --- | --- |
| T+0–4h, ngày 16/11 | Nền chung, audit auth branch, cookie/auth fixture | Snapshot/ID/codec và sync protocol, fixture CSV | Audit engine demo, core API, method matrix | FE-1/2/3 ký nhận hợp đồng và chủ sở hữu file; khóa phạm vi/protocol sync |
| Ngày 1, 16–17/11, T+24h | Auth thật + JWT guard, bắt đầu me | Create/get project, import/read V1, receipt tối thiểu có test | Core đầu tiên + preview/Apply 3 method ưu tiên | Gate A: browser gọi auth thật; CSV lên server đọc lại; local core chạy cùng fixture |
| Ngày 2, 17–18/11, T+48h | Users, rate limit, hỗ trợ cascade/test chéo | Workspace/CAS, delete, resume sync/ID mapping | History/restore, analysis và mở rộng method | Gate B: offline đóng/mở app rồi sync được lên server thật; luồng online import→preview→Apply→restore thông suốt |
| Ngày 3, 18–19/11, đến T+60h | Test quyền/session/cascade, sửa lỗi tích hợp | Test mất response/concurrency/limits và sync | Hoàn thiện ma trận method/analysis, test parity | Gate C: chạy toàn bộ ma trận; ghi chính xác mục chưa đạt và báo chủ dự án ngay |
| T+60–72h, trước báo cáo 19/11 | Cùng cả nhóm: đóng băng tính năng, chỉ sửa lỗi, clean install/build, tập báo cáo và chuẩn bị dữ liệu | | | Không thêm dependency/kiến trúc mới giờ cuối; chọn commit báo cáo và hướng dẫn khôi phục |

Đây là lịch mục tiêu rủi ro cao, **không phải cam kết chắc chắn toàn bộ 27 API + 27 method + sync sẽ xong trong 72 giờ**. Nếu Gate A/B trễ hoặc method chưa đạt, trưởng nhóm phải báo phạm vi còn thiếu để chủ dự án quyết định; không âm thầm bỏ chức năng hoặc báo demo là hệ thống hoàn chỉnh.

## 7. Checklist nghiệm thu cuối cho dev-backend

- [ ] Đủ 27 API: Auth 4, Users 3, Projects 6, Datasets 4, Analysis 5, Processing 3, History 2; trạng thái từng API có fixture và test tương ứng.
- [ ] Route đã triển khai không còn được nghiệm thu bằng “input đúng trả 501”. Chuyển assertion sang status/body thật, bổ sung ca 401/403 và giữ validation tests; không xóa test khó để PASS.
- [ ] Unit + HTTP integration với DB bật trên database test, concurrency/rollback và quyền cross-owner; tách khỏi bộ scaffold DB-disabled.
- [ ] Lint, typecheck, unit, E2E backend và build đạt; frontend E2E thật dùng DB-enabled được bổ sung khi tích hợp, không chỉ health hiện tại.
- [ ] Chạy verify/schema và integration database test; dữ liệu thử cleanup đúng ID, không drop database/collection hoặc dùng tài khoản thật làm fixture.
- [ ] Sync mất mạng/resume/conflict/delete và mapping có bằng chứng; server mới là nơi xác nhận đã đồng bộ.
- [ ] README/module, API/protocol nếu thay đổi, biến môi trường mẫu, script setup và danh sách giới hạn cập nhật; không commit secret/video/build output.
- [ ] Bàn giao commit hash, migration/provision nếu có, lệnh chạy, tài khoản test qua kênh riêng và danh sách lỗi còn lại cho trưởng nhóm.

Lệnh hiện có từ gốc: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e:backend`, `npm run test:integration`, `npm run build`. Với test/auth/sync DB-enabled mới, phải ghi lệnh cụ thể trong README khi triển khai; không giả định các lệnh hiện có đã kiểm được những luồng chưa viết.
