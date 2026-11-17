# Kế hoạch giao việc frontend — dev-frontend

Ngày kiểm kê: **16/11/2026**. Nhóm: **3 người frontend**, phối hợp 3 người backend. Hạn báo cáo suy ra từ yêu cầu “sau 3 ngày”: **19/11/2026, giờ cụ thể cần chốt**. T là lúc nhận việc; dùng mốc T+24/48/72 giờ để theo dõi, không coi đây là số giờ phải làm liên tục.

**Phạm vi đã xác nhận:** online, offline hoạt động và **đồng bộ dữ liệu offline lên server khi có mạng**, trong cùng đợt báo cáo. Đọc kèm [kế hoạch backend](backend-implementation-plan.md). Đây là tài liệu giao việc; lượt này chưa triển khai tính năng, tạo/chuyển nhánh hoặc commit/merge.

## 1. Frontend hiện làm được gì?

Kiểm kê **main + working tree chưa commit** tại HEAD main `1067712`, không chỉ code đã có trên remote.

| Hạng mục | Hiện trạng xác minh |
| --- | --- |
| Khởi chạy | React 19, Vite, TypeScript strict. main mount AppProviders; có StrictMode và BrowserRouter. |
| Giao diện chạy được | Route `/` có trang mô tả hệ thống, kiểm tra health thật và hiển thị lỗi; route khác có trang không tìm thấy và liên kết về trang chủ. |
| HTTP | Có requestJson, base URL cấu hình được, AbortSignal, báo mã lỗi HTTP. Chưa có parse error envelope, token/session, single-flight refresh, multipart wrapper hoặc xử lý 204 đầy đủ. |
| Shared UI/style | Có Section và stylesheet chung giữ từ trang cũ; chưa có bộ form/button/input/dialog/table/chart nghiệp vụ. |
| Cấu trúc | Có app/features/shared, index/types/README, kiểm chiều import và vòng phụ thuộc. Các feature auth/projects/datasets/analysis/processing/history/offline hiện chỉ có khung, chưa có page/hook/API nghiệp vụ. |
| Auth/project/dataset | Chưa có đăng nhập, hồ sơ, danh sách project, import CSV, bảng dữ liệu hoặc autosave workspace chạy thật. |
| Xử lý/biểu đồ | Chưa có preview/Apply/history/restore, thống kê, histogram/correlation hoặc 3D trong checkout hiện tại. |
| Offline/sync | Chưa có IndexedDB, outbox, worker/cache app hoặc đồng bộ trong main hiện tại. |
| Tooling/test | ESLint + React Hooks, typecheck/architecture, build Vite, Playwright Chromium. |

### Bằng chứng kiểm tra hiện tại

- Đã chạy lại lint, typecheck/architecture; backend unit **20/20** và E2E backend **40/40**. Đây chủ yếu là kiểm hợp đồng và trạng thái khung.
- E2E frontend hiện **4/4**: health qua proxy đến Nest thật, HTTP 503, lỗi mạng, route fallback/quay về/reload. Bộ này build cả frontend và backend thành công, Nest thử có database=false.
- Chưa có test chứng minh đăng nhập, import, xử lý, offline hoặc đồng bộ hoàn thành. Chưa kiểm Atlas trong lượt này.
- Bằng chứng chính: `frontend/src/app/router.tsx`, `app/pages/SystemOverviewPage.tsx`, `shared/api/`, `features/*`, `frontend/test/E2E/system.e2e.spec.ts`.

### Tài sản ở nhánh cũ cần tận dụng

`codex/offline-mvp-handover`, commit `abae4ac`, có demo local CSV, bảng/preview/Apply, version/history/restore trong IndexedDB và Canvas 3D quay/chiếu điểm. Chỉ có trim/fill cố định, CSV parser giới hạn, Cell=string, sample 4.000 điểm; không phải typed engine đầy đủ hoặc scene 3D hoàn chỉnh theo một thư viện mới.

**Nhánh cũ tự ghi chưa có sync Atlas và chưa bảo đảm mở app từ trạng thái offline hoàn toàn.** Lượt kiểm kê chỉ đọc code/handoff, chưa chạy lại demo/test của nhánh đó. FE-3 phải đánh giá và chuyển phần phù hợp vào features/offline/shared, không merge nguyên App/package/style/test của nhánh cũ vì sẽ ghi đè refactor và tooling hiện tại.

## 2. Nhánh làm việc và nền chung

1. Nhánh frontend: **dev-frontend**. Backend: **dev-backend**. Chưa có hai tên này trong danh sách local/remote-tracking đã quan sát; chưa fetch remote để khẳng định trạng thái mới nhất.
2. Trước khi chia việc, trưởng nhóm phải tạo commit nền từ các thay đổi refactor/ESLint/tài liệu/test hiện tại sau review. Working tree đang có nhiều file chưa commit; không lấy main trên remote làm nền rồi nghĩ đã có toàn bộ cấu trúc hiện tại.
3. Không stage toàn repo khi chưa loại video/model/.env/credential/output. Việc tạo, push và tích hợp nhánh do nhóm thực hiện sau khi chốt commit nền; kế hoạch này không tự thực hiện các thao tác đó.
4. Mỗi người có checkout/clone riêng; phân quyền file trong cùng dev-frontend, commit nhỏ và báo trước khi push; không force-push lịch sử chung.
5. FE-1 là đầu mối frontend và router/providers/shared; BE-1 tích hợp root package.json/package-lock/config/workspaces, FE-1 cùng review. Các thành viên không đồng thời sửa lockfile.
6. Tích hợp các commit đã kiểm vào bản chung mỗi ngày; ghép frontend và backend thật ngay từ ngày 1. Mock fixture giúp làm UI song song, không được dùng làm bằng chứng API/sync đã chạy thật.

## 3. Phân công 3 thành viên

| Người | Tên thật | Chủ sở hữu/gói việc | Ghép cặp backend |
| --- | --- | --- | --- |
| FE-1 | … | App/router, HTTP/auth/session, shared UI, profile, outbox điều phối và tích hợp frontend | BE-1 cho auth/quyền; BE-2 cho sync protocol |
| FE-2 | … | Projects/workspace, import CSV, typed data table/filter/sort/selection và kết nối API dataset | BE-2 |
| FE-3 | … | Tận dụng demo offline, IndexedDB/adapter local, processing/preview/history, analysis/3D và mapping local/server | BE-3 cho core; BE-2 cho mapping/sync |

FE-3 có tải nặng: không giao thêm redesign giao diện hoặc framework mới. FE-1/FE-2 sau khi ổn định phần của mình phải hỗ trợ case test, form tham số và tích hợp cho FE-3. Chốt người sửa từng file trước khi phối hợp.

## 4. Hợp đồng phải thống nhất trong 4 giờ đầu

- [API.md](../api/API.md), [DTO contract](../api/dto-contract.md), [ERD](../erd/ERD.html) là căn cứ; không import code Nest vào browser để lấy DTO.
- FE-1 + BE-1 chốt auth bootstrap, cookie/HTTPS, error envelope và retry; access token chỉ trong bộ nhớ, refresh HttpOnly, frontend single-flight refresh.
- FE-2 + BE-2 chốt ImportOptions/typed cell, row/column IDs, pages/filter/sort/workspace và lỗi CSV có vị trí. Không dùng parser CSV demo để tự quyết định server phải nhận dữ liệu nào.
- FE-3 + BE-2/BE-3 chốt engine/snapshot/ID mapping/lineage, phiên bản core và fixture. Đề xuất package TypeScript thuần `packages/data-core` để browser/server chạy cùng semantics; BE-1/BE-3 phải bàn giao package build/export sớm, không copy hai bộ engine khác nhau.
- FE-1/FE-3 + BE-2 khóa outbox/replay protocol: trạng thái lệnh, key, scope, local↔server mapping, checkpoint, cách xử lý lỗi/conflict và đổi tài khoản. Không đợi sau khi hoàn thành UI mới làm sync.
- Chốt giới hạn offline hiện tại và mục tiêu 27 method với trưởng nhóm; mọi method chưa đạt phải ghi rõ. Không coi nhãn “offline” hoặc “đã lưu” là “đã đồng bộ”.

## 5. Các gói việc để giao

### FE-00 — Audit demo, giao diện nền và commit chung

**Owner FE-1; FE-2/FE-3 hỗ trợ; mốc T+4 giờ.**

- Nhận baseline từ trưởng nhóm; chạy lint/typecheck/E2E hiện có và ghi commit hash.
- FE-3 review local engine, IndexedDB và Canvas của nhánh cũ; liệt kê phần tái sử dụng và phần phải thay vì typed semantics/sync/CSV còn thiếu.
- Chốt layout báo cáo: auth; projects; workspace với bảng, thao tác, thống kê/3D, preview/history và panel sync. Route phía client do FE-1 quản lý tập trung, không đổi endpoint backend.
- Dùng UI nền tảng dùng chung khi có nhu cầu thật; tránh dành ngày đầu chỉ trang trí trang chủ hoặc tạo hàng loạt component rỗng.

**Nghiệm thu:** nhóm chạy cùng baseline, có mock fixture đúng contract và danh sách màn hình/trạng thái; có hợp đồng core/sync đã nhận với backend.

### FE-01 — HTTP client và phiên đăng nhập

**Owner FE-1; phụ thuộc BE-01 khi nghiệm thu thật; ưu tiên ngày 1.**

- Mở rộng shared/api: parse error.code/message/details/requestId, phân biệt network/HTTP, 204 không parse JSON; hỗ trợ JSON và FormData, không tự set application/json cho multipart.
- Token access trong bộ nhớ, request Bearer; refresh dùng credentials/cookie, single-flight, chặn vòng lặp refresh vô hạn. Không refresh lặp lại request register/login/refresh bằng cùng interceptor.
- Khi request cần auth bị 401, xử lý theo hợp đồng và trạng thái phiên; replay mutation chỉ khi đúng semantics/idempotency, không tự tạo key mới khi timeout.
- App bootstrap kiểm phiên qua refresh/me theo API; route guard phía UI chỉ điều hướng, không thay quyền server. Giữ lối vào local workspace phù hợp khi mất mạng, không giả là đã xác thực server.

**Nghiệm thu:** đăng nhập thật, reload khôi phục phiên khi online, nhiều request 401 chỉ tạo một refresh; logout và refresh thất bại dọn access token đúng. Test đủ 204, lỗi envelope, hủy request và multipart.

### FE-02 — Auth UI, hồ sơ và app shell

**Owner FE-1; ghép BE-01/02.**

- Form register/login đúng email/password contract, lỗi field/server, loading và chống submit lặp; không bắt nhập tên khi đăng ký nếu API không yêu cầu.
- Hồ sơ GET/PATCH me, theme; logout và delete account có xác nhận rõ. Trước thao tác xóa/logout báo còn dữ liệu offline chưa sync, có lựa chọn xử lý theo protocol; không âm thầm mất bản local.
- Router, layout và trạng thái unauthorized/forbidden/not found; UI dùng chung button/input/dialog khi cần, không làm bản khác nhau ở mỗi feature.
- FE-1 cấu hình cache app shell/static assets để **app đã được cài/cache có thể đóng/mở lại khi offline**. Không cache response auth/Bearer hay ghi token vào service worker cache. Chọn cách triển khai worker phù hợp cùng trưởng nhóm, kiểm build production thật.

**Nghiệm thu:** form nói chuyện với auth thật; profile update tồn tại sau reload; local mode thể hiện rõ khi không xác thực online; mở lại app đã cache khi chặn toàn bộ mạng vẫn vào được local workspace. Không tuyên bố lần truy cập đầu tiên hoàn toàn không có mạng có thể tải app chưa từng cache.

### FE-03 — Projects và workspace

**Owner FE-2; ghép BE-04.**

- List/create/get/rename/delete project, trạng thái empty/ready, phân trang/sort; không tự coi project có cùng tên là trùng.
- Workspace ghép các vùng bảng, thao tác, analysis/3D/history từ FE-3 qua interface; app lắp ghép hoặc dùng boundary đã chốt, không tạo vòng import giữa feature.
- Autosave debounce/serialize theo revision + boundVersionId; merge patch đúng, hủy response cũ. 409 reload/reconcile có thông báo, không overwrite workspace bằng stale state.
- Hiển thị workspaceAdjusted/adjustments; giữ tham chiếu còn hợp lệ, reset/clamp đúng phần mất hiệu lực sau version mới.
- Tạo local project offline và mapping tới server project qua outbox; phân biệt ID local/server, không giả local ID là ObjectId.

**Nghiệm thu:** hai phiên sửa workspace không ghi đè thầm; duplicate tên vẫn hợp lệ; delete chỉ bỏ dữ liệu khỏi UI khi server xác nhận hoàn tất hoặc thông báo trạng thái lỗi thật.

### FE-04 — Import CSV và bảng typed data

**Owner FE-2; core/snapshot với FE-3, ghép BE-03.**

- Chọn CSV, kiểm file <=16.000.000 byte, chọn delimiter/encoding/header và preview suy kiểu cho phép sửa columnTypes theo position. Giữ file nguồn gốc, không đổi token để làm đẹp dữ liệu trước khi lưu.
- Online: FormData gọi import endpoint, key ổn định cho một logical import; offline: lưu original Blob/options/snapshot và outbox phụ thuộc local project.
- Bảng rows với phân trang/filter/sort theo API, render typed number/text/date/datetime/boolean/null và các loại missing không bị nhập nhằng. Serialize filters bằng JSON URL-encoded, query không lặp/khóa lạ.
- Selection theo rowId/columnId, typed editor chỉ tạo edit_cell preview; không sửa trực tiếp published version hoặc coi filter UI là scope xử lý.
- Get row theo ID khi click điểm 3D, độc lập trang/filter; phối hợp FE-3 qua callback/interface.
- Lỗi CSV hiển thị recordIndex/lineStart/lineEnd/columnPosition, không echo dữ liệu nhạy cảm không cần thiết. Header-only và blank-record được xử lý theo hợp đồng.

**Nghiệm thu:** CSV quoted/newline/BOM/header-only và override kiểu đúng; reload đọc lại; missing token giữ nguyên; online/offline cùng bộ fixture; không tự thêm trần rows/cell chưa được duyệt.

### FE-05 — Offline storage và adapter engine

**Owner FE-3; FE-1 điều phối sync; core từ BE-2/BE-3.**

- Port IndexedDB/demo hữu ích vào features/offline; thay Cell=string bằng typed contract. Có phiên bản schema IndexedDB và cách migrate/giữ bản local, không gọi clear toàn DB để cập nhật app.
- Lưu bền original file, project/snapshot/version/history/workspace, outbox và mapping; transaction IndexedDB phải giữ version và lệnh queue nhất quán. Không lưu access/refresh token trong local snapshot/outbox.
- Tách adapter local và adapter online, dùng cùng core/fixture cho xử lý; UI không tự chạy thuật toán khác server. Không import backend runtime vào browser.
- Phân biệt guest/local owner với userId server; sync bắt buộc chọn/xác thực tài khoản, không tự đồng bộ bản local của tài khoản khác. Đổi/logout/xóa tài khoản phải có quy tắc bảo vệ/dọn dữ liệu local rõ ràng.
- Quota lỗi, thiếu file nguồn, crash/reload, import quá giới hạn phải giữ được trạng thái giải thích; không chỉ lưu một flag pendingSync.

**Nghiệm thu:** sau offline import/chỉnh sửa có thể đóng tab, mở app đã cache và đọc lại dữ liệu/lịch sử; preview không đổi bản published, Apply tạo version mới, restore tạo version mới; bản local có thể tham gia sync thật ở FE-08.

### FE-06 — Preview/Apply, 27 method và history

**Owner FE-3; FE-1/FE-2 hỗ trợ form/test sau phần chính; ghép BE-05/06.**

- Ngày 1 làm xuyên suốt edit_cell, normalize_whitespace(mode=trim), fill_constant; sau đó hoàn thiện form cho đủ các nhóm cleaning/convert/missing/outlier/scaling/transformation/encoding trong API.
- Một method/preview, parameter theo discriminated union; scope cell/columns/dataset hợp lệ, statisticsScope whole-columns. Không gửi engineVersion, pipeline hoặc filtered-rows scope.
- Preview before/after/schemaChanges, diagnostics counts/sample/truncated; chặn Apply khi invalid/no-op/expired. Apply chỉ gửi previewId, cùng key khi retry đúng action, không thêm tham số thuật toán vào Apply.
- History phân trang, restore target thành version mới, restore current không tạo version. Cập nhật table/analysis/selection sau Apply/restore, không dùng cache của version trước.
- Online dùng API, offline dùng adapter local; outbox ghi operation có đủ dependencies để replay, không ghi đơn thuần “màn hình đã đổi”.

**Nghiệm thu:** có ma trận từng method: form/online/offline/parity/test/owner; mỗi ô chưa xong ghi rõ. Giữ token missing, loại dữ liệu, no-op, cột mới/lineage và giới hạn encoding. Không tự tuyên bố 27 method hoàn thành từ việc dropdown đã hiện đủ tên.

### FE-07 — Analysis và 3D

**Owner FE-3; FE-2 hỗ trợ kết nối selection/bảng; ghép BE-06.**

- Summary, histogram/distribution, value-counts/ordinal mapping, correlation matrix, points-3d; lấy dữ liệu từ API online và cùng core offline.
- Cho chọn trục number X/Y/Z, missing/outlier color mode và threshold; thể hiện hidden/sampled counts đúng response, click điểm tải đúng row. Không biến hình chuyển động thành tuyên bố dữ liệu 3D đã đúng.
- Có thể tái sử dụng Canvas projection demo nếu đáp ứng tương tác/fixture báo cáo; việc đổi sang thư viện chart/3D mới phải được FE-1 chốt sớm, không tự nhận demo hiện có đã đạt mọi yêu cầu.
- Render null/N/A kèm reason thay vì 0; hiển thị mọi feature trong correlation, Pearson chỉ trên number đủ dữ liệu; không tự impute hoặc drop row dataset.

**Nghiệm thu:** số liệu đối chiếu fixture, point/row mapping chính xác qua filter/page, các trạng thái all-missing/constant/zero-row không làm crash trang. Không tính thống kê từ trang 10 dòng rồi trình bày là toàn dataset.

### FE-08 — Outbox và đồng bộ offline → server

**Owner điều phối FE-1; FE-3 storage/mapping/engine, FE-2 import/dataset; BE-2 giao thức server. Đây là gói bắt buộc, không phải phần mở rộng.**

Phương án để hai nhóm chốt trong 4 giờ đầu: replay tuần tự qua API hiện có, giữ original CSV và chuỗi thao tác. Không chỉ upload bản CSV cuối rồi làm mất provenance/history hoặc tự thêm endpoint sync chưa có hợp đồng.

1. Outbox durable có operationId, localProjectId/localVersionId, parent/dependency, action, payload/reference tới file nguồn, idempotencyKey ổn định, retry/checkpoint và trạng thái. Mô hình cụ thể do FE-1/FE-3 khóa với BE-2.
2. Khi mạng có vẻ trở lại, kiểm tra được API và phiên đăng nhập; không dùng riêng navigator.onLine làm bằng chứng server khả dụng. Một coordinator cho cùng workspace/outbox, tránh hai tab đồng bộ cùng lệnh đồng thời.
3. Tạo project/import nguồn khi chưa có mapping; nhận server IDs, map rows/columns của version gốc, replay từng preview/Apply/restore. Khi có cột mới/xóa và version mới phải cập nhật mapping bằng kết quả/lineage, không đoán bằng tên hoặc dùng local ID làm server ID.
4. Chỉ đánh dấu lệnh đã sync và ghi checkpoint/mapping sau khi server xác nhận; retry đúng key/hash khi response mất. Local history giữ link tới server version tương ứng. Sau reload/resume không phát sinh bản ghi trùng.
5. Online/offline engine cần cùng version/semantics; khi server preview khác bản local, dừng để giải thích/review trước Apply. Không ghi đè trạng thái server chỉ vì local mới hơn theo thời gian máy.
6. 401 chuyển cần đăng nhập; 403/404 do quyền/xóa và 409 base stale chuyển blocked/conflict, giữ bản local để xử lý. Đề xuất báo conflict và cho tải bản server/giữ bản local/export an toàn; không auto-merge hoặc tự tạo project/server copy mới khi chưa có quyết định của người dùng.
7. UI hiển thị local-only/pending/syncing/synced/conflict/failed cùng lý do và retry hợp lệ. Chỉ gọi synced khi mọi lệnh cần thiết có server acknowledgement, không khi chỉ có mạng hay IndexedDB ghi thành công.

**Nghiệm thu bắt buộc với backend thật:** offline tạo project/import/chỉnh sửa/Apply/restore → đóng/mở app → online/đăng nhập → đồng bộ → phiên/trình duyệt mới đọc dữ liệu từ server đúng. Ngắt mạng ngay sau server commit, refresh app, retry không tạo trùng. Server bị người khác sửa thì conflict, không mất local; sai tài khoản không được sync chéo.

Nếu mapping/replay không đủ khả thi, báo trưởng nhóm ngay ở gate đầu, cùng BE-2 chốt protocol khác trước khi làm tiếp; mọi thay đổi API/ERD phải review chung. **Không thay yêu cầu sync bằng local-only demo, export file hoặc nhãn pendingSync.**

## 6. Lịch 3 ngày và gate tích hợp

| Mốc | FE-1 | FE-2 | FE-3 | Điều kiện chung |
| --- | --- | --- | --- | --- |
| T+0–4h, 16/11 | Commit nền, router/shared/API/auth và sync contract | CSV/table/workspace fixture | Audit demo, IndexedDB/core/ID mapping | Nhận cùng protocol/core commit với backend, khóa chủ sở hữu file |
| Ngày 1, 16–17/11, T+24h | Auth UI thật, shared transport, coordinator outbox khung | Projects, import/read table online, local import boundary | Local store/engine adapter, 3D demo, 3 method preview/Apply đầu | Gate A: auth+online import đọc lại; local workspace sống qua reload; kiểm kế hoạch map lên server |
| Ngày 2, 17–18/11, T+48h | Cache app/offline reopen, refresh/retry và replay coordinator | Autosave/conflict, mapping/import replay, test bảng | History/restore, analysis/3D và engine methods tiếp theo | Gate B: offline đóng/mở rồi sync lên API/Atlas thật, phiên mới đọc được; luồng online đầy đủ xuyên suốt |
| Ngày 3, 18–19/11, đến T+60h | Multi-tab/401/sync lỗi, test quyền; hỗ trợ form/test FE-3 | Lỗi CSV/limits/version stale; hỗ trợ FE-3 | Hoàn thiện ma trận method/analysis/offline parity, sửa lỗi | Gate C: công bố từng tính năng đã/ chưa đạt, chạy kịch bản báo cáo thật |
| T+60–72h, trước báo cáo 19/11 | Cả nhóm đóng băng tính năng, sửa lỗi, clean build, diễn tập mất mạng/khôi phục, chuẩn bị dữ liệu và commit báo cáo | | | Không thêm thư viện/đổi kiến trúc giờ cuối; có hướng dẫn chạy độc lập |

**Đánh giá thực tế:** phần lớn UI/engine/sync chưa có trong main; 27 API + 27 method + offline/sync trong 72 giờ có rủi ro rất cao. Ba method đầu là đường tích hợp ưu tiên, không phải sự chấp thuận tự bỏ 24 method còn lại. Nếu Gate A/B trễ hoặc còn method chưa đạt, báo chủ dự án ngay để quyết định phạm vi báo cáo; không trình bày mock/local demo là hệ thống hoàn chỉnh.

## 7. Checklist nghiệm thu và bàn giao dev-frontend

- [ ] Từng feature có màn hình và hành vi thực tế, trạng thái loading/empty/error/success; không còn chỉ là thư mục/index rỗng nhưng ghi hoàn thành.
- [ ] Flow online: register/login → project → import → table/filter/select → preview/Apply → history/restore → analysis/3D → workspace reload; hồ sơ/logout/delete đúng contract.
- [ ] Flow offline: app đã cache mở lại được khi chặn mạng, dữ liệu nguồn/snapshot/history bền vững, các method đã nhận nghiệm thu chạy đúng; không mất dữ liệu khi quota/lỗi/reload.
- [ ] Flow sync: dữ liệu được đọc lại từ server ở phiên mới; ID mapping, retry mất response, partial resume, conflict và sai tài khoản có test.
- [ ] Ma trận đủ 27 method có cột online/offline/parity/test; mọi giới hạn chưa đạt ghi rõ và báo chủ dự án, không làm mờ trạng thái bằng UI.
- [ ] Lint/typecheck/architecture/build đạt; thêm unit test có ý nghĩa cho outbox/ID mapping/engine và E2E auth/data/offline/sync. Chọn test tooling bổ sung sớm cùng BE-1 nếu cần.
- [ ] Tách E2E hiện tại database=false khỏi E2E nghiệp vụ dùng server/database test thật. page.route chỉ dùng để tạo lỗi có kiểm soát, không làm giả thành công cho ca nghiệm thu sync.
- [ ] README feature, local DB version/migration, service worker cache/update và protocol cập nhật; không lưu token/secret trong snapshot/cache hoặc commit dữ liệu cá nhân.
- [ ] Bàn giao commit hash, lệnh cài/chạy/test, tài khoản test qua kênh riêng, CSV mẫu và kịch bản demo; không phụ thuộc máy của tác giả.

Lệnh hiện có: `npm run lint -w frontend`, `npm run typecheck -w frontend`, `npm run build -w frontend`, `npm run test:e2e:frontend`, `npm run test:e2e:install -w frontend`. Bộ Playwright hiện chỉ kiểm trang health; phải bổ sung cấu hình/fixture DB-enabled và offline thực sự trước khi dùng làm bằng chứng hoàn chỉnh.

### Kịch bản báo cáo bắt buộc phải diễn tập

1. Đăng nhập hai tài khoản thử để chứng minh quyền dữ liệu; import CSV có number/text/missing và kiểu ngày.
2. Chỉnh một ô và chạy một phép xử lý; so preview, Apply, history, restore ra version mới, chart/3D cập nhật đúng.
3. Chặn mạng và mở lại app đã cache; import hoặc thao tác local, xem rõ trạng thái chưa sync.
4. Có mạng trở lại, xác thực nếu cần và đồng bộ; mở phiên khác để đọc dữ liệu từ server.
5. Lặp lại ca mất response sau commit, retry không trùng; tạo server version mới trước sync để chứng minh conflict không ghi đè/mất bản local.

Các kịch bản trên là gate tích hợp quan trọng nhất. Chúng không thay thế việc nghiệm thu các endpoint/method còn lại trong ma trận hợp đồng.


## Phạm vi bổ sung đã được chủ dự án yêu cầu — 17/11/2026

Bổ sung vào FE-06/FE-07: edit_cell chuyển từ panel xử lý sang bảng dòng khi click điểm3D; EDA gồm boxplot chọn cột, histogram/phân phối và frequency chart; sửa hệ tọa độ/trục; màu missing/outlier xét toàn dòng/mọi cột number. Transformation thêm TF-IDF, mở rộng API/core/validator và sync offline tương ứng. Tổng hiện tại28method (27panel+edit_cell qua bảng điểm);27endpoint giữ nguyên. Quyết định kỹ thuật/công thức/limits ghi tại API.md; kết quả kiểm thử và giới hạn ở [báo cáo bổ sung](../reports/frontend-eda-tfidf-2026-11-17.md). Các mốc27method trong kế hoạch gốc là phạm vi trước bổ sung.
