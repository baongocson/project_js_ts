# HƯỚNG DẪN TỪ SỐ 0 — API, DTO, ERD DASHBOARD 3D

**Nguồn:** `docs/API.md`, `docs/dto-contract.md`, `docs/ERD.html`, `docs/architecture.md`, `docs/database.md` tại commit `1067712` (14/11/2026).
**Trạng thái mã nguồn:** 27 endpoint đã có route + DTO/validation nhưng nghiệp vụ còn trả 501; Database provision/test được ghi nhận trong tài liệu, không có nghĩa là 27 API đã chạy.
**Mục đích:** hiểu *nó là gì → vì sao cần → chạy như thế nào → kiểm thử ra sao*. Đây là tài liệu đọc để hiểu bản thiết kế, không phải báo cáo giả định đã triển khai.

## 1. Bản đồ hệ thống và các từ khóa

```text
Người dùng → React/Vite (Frontend) → HTTP /api/v1 → NestJS (Backend) → MongoDB Atlas
                                ↓             ↓
                     Controller → Service → Repository → Collection
Offline cơ bản (đề xuất): Browser → JS local engine + IndexedDB (chưa sync với server)
```

**API** là hợp đồng giao tiếp: URL + HTTP method + input + output + status/error + quyền. **Endpoint** là một method trên một path, ví dụ `GET /api/v1/projects`. **Controller** nhận và phân phối yêu cầu; **Service** thực hiện nghiệp vụ; **Repository** đọc/ghi DB; **Module** khai báo cách NestJS lắp các thành phần. **DTO (Data Transfer Object)** biểu diễn dữ liệu được phép gửi/nhận; **validation** kiểm tra định dạng, còn service kiểm tra quyền và quy tắc phụ thuộc database.

**ERD** là bản đồ đối tượng lưu trữ và quan hệ; **collection** tương tự nhóm document trong MongoDB, không giống route. **Snapshot/Version** là ảnh chụp dữ liệu ở một thời điểm; bản published không sửa tại chỗ. **Preview** là bản xem trước, chưa công bố. **Apply** công bố phiên bản mới. **Operation** là bản ghi thao tác thành công. **Idempotency-Key** bảo vệ khỏi việc gửi lại cùng một yêu cầu tạo thêm kết quả khi mạng rớt.

Phân biệt `API v1` là *phiên bản hợp đồng endpoint* với `Dataset V1/V2` là *phiên bản nội dung dữ liệu*; hai hệ thống đánh số độc lập.

## 2. Luồng nghiệp vụ hoàn chỉnh (để giải thích khi thầy hỏi)

1. Đăng ký/đăng nhập → Backend kiểm tra mật khẩu, lưu `authSessions`, cấp token; request sau phải xác thực session.
2. Tạo Project → ghi `projects` và `workspaces`; chủ sở hữu nằm ở `projects.ownerId`.
3. Import CSV → kiểm tra file, xác định kiểu cột → tạo `datasets` và `datasetVersions` V1, `versionColumns`, `dataChunks`, operation `kind=import`; currentVersion trỏ V1.
4. Xem bảng/3D/Analysis → đọc đúng published version, dữ liệu dựng từ chunk + schema; client xoay điểm bằng biến đổi toán học.
5. Preview phép xử lý → cố định baseVersion + specification, tạo candidate staged và `previewChanges`; chưa đổi V1.
6. Apply → kiểm idempotency và revision, transaction publish candidate thành V2, đổi currentVersion và ghi operation `kind=process`.
7. History → GET `processingOperations` đã commit theo thứ tự mới trước. Restore V1 khi hiện tại V2 → tạo V3 nội dung giống V1, parent=V2, restoredFrom=V1.
8. Offline → trình duyệt tiếp tục tính với dữ liệu đã tải trong IndexedDB; những thay đổi cục bộ *chưa được tự động coi là published trên Atlas*. Đồng bộ cần kiểm tra phiên bản, authorization, idempotency và xung đột.

## 3. Từng API: tại sao tồn tại và hợp đồng là gì?

### AuthController

**Module chịu trách nhiệm:** AuthModule (authSessions; đọc user qua Users).

#### API 01 — `POST /api/v1/auth/register`

- **Làm gì:** Tạo tài khoản mới với email chuẩn hóa duy nhất và mật khẩu đã băm.
- **Vì sao cần:** Đăng ký tạo danh tính riêng để phân biệt dữ liệu của nhiều người, đồng thời chặn email trùng và không bao giờ lưu mật khẩu thô.
- **Request DTO / tham số:** `RegisterDto`. **Response DTO:** `RegisterResponseDto`.
- **Đầu vào theo API:** { "email": "string", "password": "string" }
- **Kết quả theo API:** 201 Created: { "user": { "_id", "email", "displayName": null, "preferences", "createdAt" } }
- **Kiểm tra khi nhận request:** OriginGuard, RateLimitGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (sai định dạng email/mật khẩu), 409 (emailNormalized đã tồn tại), 429 (quá giới hạn gọi)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 02 — `POST /api/v1/auth/login`

- **Làm gì:** Xác thực mật khẩu, tạo bản ghi trong authSessions và cấp cặp Access/Refresh Token.
- **Vì sao cần:** Đăng nhập xác thực người sử dụng và tạo phiên, từ đó Backend biết ai có quyền với Project/Dataset nào.
- **Request DTO / tham số:** `LoginDto`. **Response DTO:** `LoginResponseDto`.
- **Đầu vào theo API:** JSON: { "email": "string", "password": "string" }
- **Kết quả theo API:** 200 OK: { "accessToken", "expiresIn": 900, "user": { "_id", "email", "displayName", "preferences" } } /  Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth
- **Kiểm tra khi nhận request:** OriginGuard, RateLimitGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (thiếu trường), 401 (sai email hoặc mật khẩu), 403 (tài khoản đang ở trạng thái deleting), 429 (spam)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 03 — `POST /api/v1/auth/refresh`

- **Làm gì:** Đổi refresh token qua cookie, kiểm tra hash/phiên và cấp access token mới.
- **Vì sao cần:** Access token sống ngắn; refresh giúp người dùng duy trì phiên mà không phải nhập mật khẩu thường xuyên, nhưng phải chặn token đã dùng lại.
- **Request DTO / tham số:** `EmptyBodyDto + cookie`. **Response DTO:** `RefreshResponseDto`.
- **Đầu vào theo API:** Cookie: refresh_token /  Body rỗng; Origin phải nằm trong allowlist.
- **Kết quả theo API:** 200 OK: { "accessToken", "expiresIn": 900 } /  Set-Cookie thay refresh_token mới; không trả rotationCounter.
- **Kiểm tra khi nhận request:** RefreshSessionGuard, OriginGuard, RateLimitGuard
- **Trường hợp lỗi phải xét:** 401 AUTH_REFRESH_INVALID / SESSION_REVOKED / SESSION_EXPIRED, bao gồm token cũ sau rotation; 403 ORIGIN_REJECTED; 429 RATE_LIMITED. Không cam kết trả 409 REFRESH_CONFLICT.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 04 — `POST /api/v1/auth/logout`

- **Làm gì:** Thu hồi phiên từ refresh cookie, vẫn dùng được khi access token đã hết hạn.
- **Vì sao cần:** Logout thu hồi session để token cũ không tiếp tục sử dụng được, kể cả khi access token đã hết hạn.
- **Request DTO / tham số:** `EmptyBodyDto + cookie`. **Response DTO:** `204: không body`.
- **Đầu vào theo API:** Cookie: refresh_token nếu có; body rỗng; kiểm tra Origin.
- **Kết quả theo API:** 204 No Content; xóa cookie refresh_token với đúng Path và thuộc tính đã dùng.
- **Kiểm tra khi nhận request:** OriginGuard, RateLimitGuard
- **Trường hợp lỗi phải xét:** 403 ORIGIN_REJECTED; 429 RATE_LIMITED; lỗi hạ tầng theo quy ước chung.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

### UsersController

**Module chịu trách nhiệm:** UsersModule (users; xóa dùng bộ điều phối).

#### API 05 — `GET /api/v1/users/me`

- **Làm gì:** Lấy thông tin tài khoản, tên hiển thị và preferences của người dùng đang đăng nhập.
- **Vì sao cần:** Frontend cần tải hồ sơ hiện tại mà không phải lưu danh tính và quyền truy cập dưới dạng dữ liệu tự khai.
- **Request DTO / tham số:** `JWT session`. **Response DTO:** `PublicUserDto`.
- **Đầu vào theo API:** Không có body (nhận diện qua Access Token)
- **Kết quả theo API:** 200 OK: { "_id", "email", "displayName", "preferences": { "theme" }, "createdAt", "updatedAt" }
- **Kiểm tra khi nhận request:** JwtAuthGuard
- **Trường hợp lỗi phải xét:** 401 SESSION_INVALID / USER_INACTIVE; không trả trường nội bộ lifecycle/writeEpoch.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 06 — `PATCH /api/v1/users/me`

- **Làm gì:** Cập nhật một phần thông tin cá nhân gồm displayName và preferences (như theme sáng/tối).
- **Vì sao cần:** Cho phép cập nhật tên hiển thị và giao diện mà không thay toàn bộ hồ sơ; PATCH phân biệt không gửi và gửi null.
- **Request DTO / tham số:** `PatchUserDto`. **Response DTO:** `PatchUserResponseDto`.
- **Đầu vào theo API:** { "displayName"?: "string", "preferences"?: { "theme": "light|dark|system" } } /  Ít nhất một trường; PATCH chỉ thay các trường được gửi.
- **Kết quả theo API:** 200 OK: { "_id", "displayName", "preferences", "updatedAt" }
- **Kiểm tra khi nhận request:** JwtAuthGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 VALIDATION_ERROR / EMPTY_PATCH; 401 SESSION_INVALID; 409 RESOURCE_DELETING
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 07 — `DELETE /api/v1/users/me`

- **Làm gì:** Chuyển trạng thái sang deleting, thu hồi mọi phiên, xóa toàn bộ project, dataset, chunk và xóa hẳn user.
- **Vì sao cần:** Xóa tài khoản phải dọn cả dữ liệu phụ thuộc để không để lại phiên, Project, Dataset và history vô chủ.
- **Request DTO / tham số:** `JWT session`. **Response DTO:** `204: không body`.
- **Đầu vào theo API:** Không có body
- **Kết quả theo API:** 204 No Content chỉ sau khi xóa thật hoàn tất; không sử dụng 202 ở bản thiết kế này.
- **Kiểm tra khi nhận request:** JwtAuthGuard
- **Trường hợp lỗi phải xét:** 401 SESSION_INVALID; 409 RESOURCE_DELETING khi tác vụ đang xóa; 503 SERVICE_UNAVAILABLE nếu chưa hoàn tất.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

### ProjectsController

**Module chịu trách nhiệm:** ProjectsModule (projects, workspaces).

#### API 08 — `POST /api/v1/projects`

- **Làm gì:** Tạo project mới ở trạng thái empty cùng với một bản ghi workspace mặc định.
- **Vì sao cần:** Project là vùng làm việc độc lập; tạo Workspace cùng lúc để giao diện có trạng thái ban đầu ngay.
- **Request DTO / tham số:** `ProjectNameDto + Idempotency-Key`. **Response DTO:** `CreateProjectResponseDto`.
- **Đầu vào theo API:** Header: Idempotency-Key | Body: { "name": "string" }
- **Kết quả theo API:** 201 Created: { "project": { "_id", "name", "lifecycle": "empty", "createdAt", "updatedAt" }, "workspace": { "_id", "revision": 1, "activeTab": "collection" } }
- **Kiểm tra khi nhận request:** JwtAuthGuard, IdempotencyInterceptor, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (tên rỗng hoặc thiếu Idempotency-Key), 401 (chưa đăng nhập), 409 (trùng key nhưng khác payload)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 09 — `GET /api/v1/projects`

- **Làm gì:** Liệt kê danh sách các project thuộc quyền sở hữu của người dùng hiện tại có phân trang và lọc.
- **Vì sao cần:** Người dùng có thể có nhiều Project; pagination/filter tránh tải toàn bộ danh sách và tránh dữ liệu người khác.
- **Request DTO / tham số:** `ListProjectsQueryDto`. **Response DTO:** `ListProjectsResponseDto`.
- **Đầu vào theo API:** Query: ?page=1&limit=10&lifecycle=ready&sort=-updatedAt / Sort allowlist: -updatedAt, updatedAt, -createdAt, createdAt, name, -name. Lifecycle optional empty hoặc ready; thiếu thì lấy cả hai. Page/limit theo quy ước.
- **Kết quả theo API:** 200 OK: { "items": [{ "_id", "name", "lifecycle", "updatedAt" }], "page": 1, "limit": 10, "total": 25 }
- **Kiểm tra khi nhận request:** JwtAuthGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (tham số page hoặc limit vượt ngưỡng cho phép), 401 (chưa đăng nhập)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 10 — `GET /api/v1/projects/:projectId`

- **Làm gì:** Lấy thông tin project, trạng thái workspace đã chuẩn hóa và metadata của dataset hiện tại (nếu có).
- **Vì sao cần:** Mở Project cần một lần đọc đủ Project, Workspace và Dataset đang dùng, kèm điều chỉnh tham chiếu UI đã lỗi thời.
- **Request DTO / tham số:** `ResourceParamsDto`. **Response DTO:** `ProjectDetailResponseDto`.
- **Đầu vào theo API:** Param: projectId
- **Kết quả theo API:** 200 OK: { "project": {...}, "workspace": {...}, "dataset": null | { "_id", "currentVersionId", "revision", "originalFile" }, "workspaceAdjusted": false, "adjustments": [] }
- **Kiểm tra khi nhận request:** JwtAuthGuard, ProjectOwnerGuard
- **Trường hợp lỗi phải xét:** 401 (chưa đăng nhập), 403 (không phải chủ sở hữu), 404 (không tìm thấy hoặc đang deleting)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 11 — `PATCH /api/v1/projects/:projectId`

- **Làm gì:** Cập nhật tên hiển thị của project.
- **Vì sao cần:** Đổi tên Project là cập nhật metadata, không tác động Dataset hoặc phiên bản dữ liệu.
- **Request DTO / tham số:** `ProjectNameDto`. **Response DTO:** `RenameProjectResponseDto`.
- **Đầu vào theo API:** Param: projectId | Body: { "name": "string" }
- **Kết quả theo API:** 200 OK: { "_id", "name", "updatedAt" }
- **Kiểm tra khi nhận request:** JwtAuthGuard, ProjectOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (tên không hợp lệ), 403 (không thuộc quyền sở hữu), 404 (project không tồn tại)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 12 — `PATCH /api/v1/projects/:projectId/workspace`

- **Làm gì:** Lưu trạng thái tab đang mở, trục 3D (chartConfig), ô/cột đang chọn (selection) và trạng thái bảng (tableState).
- **Vì sao cần:** Lưu tab, trục 3D, bộ lọc và vị trí bảng giúp mở lại đúng trạng thái. Revision ngăn hai tab ghi đè nhau.
- **Request DTO / tham số:** `PatchWorkspaceDto`. **Response DTO:** `PatchWorkspaceResponseDto`.
- **Đầu vào theo API:** { "revision": 3, "boundVersionId": "ObjectId|null", "activeTab"?: "outliers", "chartConfig"?: {...}, "selection"?: {...}, "tableState"?: {...} }
- **Kết quả theo API:** 200 OK: { "workspace": { "_id", "revision": 4, "boundVersionId", "activeTab", "chartConfig", "selection", "tableState", "updatedAt" }, "workspaceAdjusted": false, "adjustments": [] }
- **Kiểm tra khi nhận request:** JwtAuthGuard, ProjectOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 VALIDATION_ERROR; 401/403/404 theo quy ước; 409 WORKSPACE_REVISION_CONFLICT / BASE_VERSION_STALE / RESOURCE_DELETING / 400 EMPTY_PATCH nếu chỉ revision/boundVersionId hoặc nested object rỗng không có field cập nhật. Payload có field nhưng giá trị không đổi không phải lỗi.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 13 — `DELETE /api/v1/projects/:projectId`

- **Làm gì:** Đánh dấu deleting, khóa đọc/ghi và xóa sạch workspace, dataset, versions, chunks, previews, history, idempotency.
- **Vì sao cần:** Xóa Project phải dọn đủ nội dung, kể cả phiên bản, preview, idempotency và history, không chỉ xóa tên Project.
- **Request DTO / tham số:** `ResourceParamsDto`. **Response DTO:** `204: không body`.
- **Đầu vào theo API:** Param: projectId
- **Kết quả theo API:** 204 No Content khi đã xóa thật toàn bộ; không dùng 202.
- **Kiểm tra khi nhận request:** JwtAuthGuard, ProjectOwnerGuard
- **Trường hợp lỗi phải xét:** 401 SESSION_INVALID; 403 FORBIDDEN; 404 NOT_FOUND; 409 RESOURCE_DELETING; 503 SERVICE_UNAVAILABLE
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

### DatasetsController

**Module chịu trách nhiệm:** DatasetsModule (datasets, datasetVersions, versionColumns, dataChunks).

#### API 14 — `POST /api/v1/projects/:projectId/datasets`

- **Làm gì:** Nhập CSV tối đa 16.000.000 byte; parse thành dòng/cell typed có ID, mã hóa codec rồi chia dataChunks theo byte.
- **Vì sao cần:** Import CSV biến file người dùng thành Dataset có schema, rowId/columnId và phiên bản V1 để các thao tác sau này có mốc đối chiếu.
- **Request DTO / tham số:** `ImportDatasetRequestDto (file + ImportOptionsDto + key)`. **Response DTO:** `ImportDatasetResponseDto`.
- **Đầu vào theo API:** Header: Idempotency-Key /  Multipart: file + importOptions JSON { encoding:"utf-8", delimiter:",|;|tab", headerPolicy:"first-row", missingPolicy:"default-v1" } / importOptions.columnTypes?: [{position: integer 0..999, logicalType: number|text|date|datetime|boolean|mixed}]. ID cột chưa có trước import nên dùng position; không trùng, phải thuộc header thực tế. Trước khi gửi, frontend hiển thị suy kiểu theo cột và cho sửa; bỏ columnTypes thì server tự suy, có gửi thì server kiểm tra lại toàn cột, không chỉ sample.
- **Kết quả theo API:** 201 Created: { "dataset": { "_id", "currentVersionId", "revision", "originalFile" }, "version": { "_id", "versionNumber": 1, "rowCount", "columnCount" }, "columns": [...], "operationId" }
- **Kiểm tra khi nhận request:** JwtAuthGuard, ProjectOwnerGuard, FileInterceptor, IdempotencyInterceptor
- **Trường hợp lỗi phải xét:** 400 CSV_INVALID / VALIDATION_ERROR; 401/403/404 theo quy ước; 409 DATASET_ALREADY_EXISTS / IDEMPOTENCY_CONFLICT; 413 FILE_TOO_LARGE nếu file >16.000.000 byte. / CSV_INVALID details.issues[{code,recordIndex,lineStart,lineEnd,columnPosition?,message}]: vị trí record logic và physical line 1-based, columnPosition 0-based. Dòng trắng vật lý ngoài quoted báo CSV_BLANK_RECORD; dòng lệch field báo CSV_FIELD_COUNT_MISMATCH. Terminal newline không là record mới. Không echo nội dung ô.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 15 — `GET /api/v1/datasets/:datasetId/versions/:versionId`

- **Làm gì:** Lấy metadata của một phiên bản dữ liệu cụ thể kèm danh sách cấu trúc cột (versionColumns).
- **Vì sao cần:** Phiên bản dữ liệu bất biến; endpoint này cho phép xem schema/metadata chính xác của V1, V2… mà không nhầm bản hiện tại.
- **Request DTO / tham số:** `ResourceParamsDto`. **Response DTO:** `VersionResponseDto`.
- **Đầu vào theo API:** Param: datasetId, versionId
- **Kết quả theo API:** 200 OK: { "version": { "_id", "versionNumber", "state", "rowCount", "columnCount", "encodedByteSize" }, "columns": [{ "columnId", "name", "position", "logicalType", "format", "lineage" }] }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard
- **Trường hợp lỗi phải xét:** 403 (không thuộc quyền sở hữu), 404 (version không tồn tại hoặc đang ở trạng thái staging chưa công bố)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 16 — `GET /api/v1/datasets/:datasetId/versions/:versionId/rows`

- **Làm gì:** Giải mã luồng byte từ dataChunks, áp dụng bộ lọc/sắp xếp và trả về trang 10 dòng dữ liệu.
- **Vì sao cần:** Dữ liệu lớn không thể gửi toàn bộ mỗi lần; bảng cần đọc theo trang, filter và sort từ một snapshot cố định.
- **Request DTO / tham số:** `RowsQueryDto`. **Response DTO:** `RowsResponseDto`.
- **Đầu vào theo API:** Query: ?page=1&limit=10&sort=colUuid:asc&filters=...
- **Kết quả theo API:** 200 OK: { "rows": [{ "rowId", "position", "cells": {...} }], "page": 1, "limit": 10, "totalRows": 5000, "filteredRows": 120, "totalPages": 12 }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (cú pháp filter sai hoặc columnId không tồn tại trong version), 403 (sai quyền), 404 (không tìm thấy)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 17 — `GET /api/v1/datasets/:datasetId/versions/:versionId/rows/:rowId`

- **Làm gì:** Lấy nguyên dòng khi click điểm 3D, độc lập trang/lọc hiện tại.
- **Vì sao cần:** Khi nhấp điểm 3D phải truy ngược được chính xác rowId dù bảng đang lọc/sắp xếp sang trang khác.
- **Request DTO / tham số:** `ResourceParamsDto`. **Response DTO:** `RowResponseDto`.
- **Đầu vào theo API:** Param: datasetId, versionId, rowId
- **Kết quả theo API:** 200 OK: { "versionId", "row": { "rowId", "position", "cells": {...} } }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 INVALID_ID; 401/403 theo quy ước; 404 ROW_NOT_FOUND / VERSION_NOT_FOUND
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

### AnalysisController

**Module chịu trách nhiệm:** AnalysisModule (đọc snapshot; không có collection riêng).

#### API 18 — `GET /api/v1/datasets/:datasetId/versions/:versionId/analysis/summary`

- **Làm gì:** Tính toán dung lượng gốc, tổng số dòng, số cột, số ô missing, số dòng duplicate và thống kê outlier cho màn hình Collection.
- **Vì sao cần:** Màn Collection cần số dòng/cột, missing, duplicates, outlier và kiểu cột để đánh giá chất lượng dữ liệu trước khi xử lý.
- **Request DTO / tham số:** `SummaryQueryDto`. **Response DTO:** `AnalysisSummaryResponseDto`.
- **Đầu vào theo API:** Query: ?outlierMethod=iqr&outlierThreshold=1.5&outlierColumnIds=id1,id2 /  Không gửi danh sách: xét toàn bộ cột number.
- **Kết quả theo API:** 200 OK: { "versionId", "originalByteSize", "rowCount", "columnCount", "missingCount", "missingRate", "missingByColumn": [{"columnId","count","rate"}], "duplicateRowCount", "outliersByColumn": [{"columnId","count","lower","upper","status","reason"}], "datatypes": [...] }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (tham số ngưỡng không hợp lệ), 403 (sai quyền), 404 (không tìm thấy version)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 19 — `GET /api/v1/datasets/:datasetId/versions/:versionId/analysis/columns/:columnId/distribution`

- **Làm gì:** Histogram/tần suất của một cột, missing và ngưỡng outlier; value counts đầy đủ dùng endpoint phân trang riêng.
- **Vì sao cần:** Cho phép khảo sát phân phối một cột (histogram/outlier) thay vì chỉ nhìn giá trị từng ô.
- **Request DTO / tham số:** `DistributionQueryDto`. **Response DTO:** `DistributionResponseDto`.
- **Đầu vào theo API:** Query: ?bins=20&outlierMethod=iqr&threshold=1.5 /  value counts: dùng endpoint /value-counts.
- **Kết quả theo API:** 200 OK: { "columnId", "logicalType", "missingCount", "histogram": [...], "histogramStatus", "outlierBounds": null | {"lower","upper","count"}, "outlierStatus", "reason" }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (cột không tồn tại), 403 (sai quyền), 404 (không tìm thấy)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 20 — `GET /api/v1/datasets/:datasetId/versions/:versionId/analysis/correlation`

- **Làm gì:** Tính hệ số tương quan Pearson cho các cặp cột số đủ dữ liệu và trả về N/A kèm lý do cho các cặp cột khác.
- **Vì sao cần:** Giúp nhận biết các cặp thuộc tính số có tương quan; nhóm loại không hỗ trợ phải giải thích rõ thay vì bịa hệ số.
- **Request DTO / tham số:** `CorrelationQueryDto`. **Response DTO:** `CorrelationResponseDto`.
- **Đầu vào theo API:** Query: ?method=pearson
- **Kết quả theo API:** 200 OK: { "columns": [{"columnId","name","logicalType"}], "matrix": [[1,0.85,null]], "validPairCounts": [[100,85,0]], "naReasons": [{"rowColumnId","columnColumnId","reason":"non_numeric|insufficient_pairs|constant_column"}] }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 UNSUPPORTED_METHOD; 401/403/404 theo quy ước.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 21 — `GET /api/v1/datasets/:datasetId/versions/:versionId/analysis/points-3d`

- **Làm gì:** Trích xuất tọa độ X, Y, Z, đánh dấu màu missing/outlier, đếm số điểm bị ẩn do thiếu tọa độ và công bố thông tin sampling.
- **Vì sao cần:** Cung cấp tập điểm và thông số phù hợp để dựng không gian X/Y/Z; frontend xoay và chiếu bằng toán học.
- **Request DTO / tham số:** `Points3dQueryDto`. **Response DTO:** `Points3dResponseDto`.
- **Đầu vào theo API:** Query: ?xColumnId=uuid&yColumnId=uuid&zColumnId=uuid&colorMode=missing&outlierColumnIds=id1,id2&outlierMethod=iqr&threshold=1.5&maxPoints=10000
- **Kết quả theo API:** 200 OK: { "points": [{ "rowId", "x", "y", "z", "missingCount", "isOutlier", "outlierColumnIds": [] }], "hiddenMissingCoordsCount", "hiddenInvalidCoordsCount", "sampling": { "applied", "totalEligible", "returned", "method":"stable-rowid" } }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (trục chọn không phải là cột kiểu number), 403 (sai quyền), 404 (không tìm thấy)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 22 — `GET /api/v1/datasets/:datasetId/versions/:versionId/analysis/columns/:columnId/value-counts`

- **Làm gì:** Đếm và phân trang toàn bộ category, phục vụ bảng value counts và mapping ordinal.
- **Vì sao cần:** Đếm tần suất giá trị/category, hữu ích cho dữ liệu phân loại và chọn cấu hình mã hóa.
- **Request DTO / tham số:** `ValueCountsQueryDto`. **Response DTO:** `ValueCountsResponseDto`.
- **Đầu vào theo API:** Query: ?page=1&limit=50&sort=-count&includeMissing=true
- **Kết quả theo API:** 200 OK: { "columnId", "items": [{ "value": {"kind":"text","value":"A"}, "isMissing":false, "count":12, "rate":0.12 }], "page", "limit", "totalCategories", "totalPages", "missingCount", "totalRows" }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 INVALID_QUERY; 401/403 theo quy ước; 404 COLUMN_NOT_FOUND / VERSION_NOT_FOUND
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

### ProcessingController

**Module chịu trách nhiệm:** ProcessingModule (processingPreviews, previewChanges, processingOperations).

#### API 23 — `POST /api/v1/datasets/:datasetId/previews`

- **Làm gì:** Chạy thử phép tiền xử lý (cleaning, missing, outliers, scaling, transformation, encoding, sửa ô), tạo candidate version (staged) và lập chỉ mục previewChanges.
- **Vì sao cần:** Không sửa dữ liệu ngay: Preview tính trước candidate, thống kê thay đổi và lỗi để người dùng quyết định.
- **Request DTO / tham số:** `CreatePreviewDto + key`. **Response DTO:** `CreatePreviewResponseDto`.
- **Đầu vào theo API:** Header: Idempotency-Key / Body: { "baseVersionId":"ObjectId", "specification": { "method":"fill_mean", "parameters":{}, "scope":{"type":"columns","columnIds":["uuid"]}, "statisticsScope":{"type":"whole-columns"} } } / Không gửi engineVersion; server tự gán.
- **Kết quả theo API:** 201 Created: { "previewId", "status":"ready|invalid", "baseVersionId", "candidateVersionId": "ObjectId|null", "engineVersion", "specHash", "summary": {...}, "schemaChanges": {...}, "diagnostics": {"errors":[],"warnings":[]}, "expiresAt" } / canApply:boolean; no-op trả201 status=ready, canApply=false, warning NO_CHANGES_DETECTED (Không có thay đổi). Invalid cũng canApply=false. / Diagnostics thêm truncated:boolean. Tối đa100 mẫu tổng ưu tiên errors, counts là tổng thật. Summary có schema cụ thể theo quy ước; giữ envelope hiện hành.
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, IdempotencyInterceptor, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 VALIDATION_ERROR / UNSUPPORTED_METHOD / UNSUPPORTED_SCOPE; 401/403/404 theo quy ước; 409 BASE_VERSION_STALE / IDEMPOTENCY_CONFLICT; 413 LIMIT_EXCEEDED. Lỗi dữ liệu khi chạy: 201 với status=invalid.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 24 — `GET /api/v1/datasets/:datasetId/previews/:previewId`

- **Làm gì:** Lấy thông tin tổng hợp của preview kèm phân trang 5 cặp dòng trước/sau (before/after) để highlight các ô thay đổi.
- **Vì sao cần:** Người dùng xem nhiều trang của Preview, mỗi trang hiển thị các dòng bị tác động; không nhầm với dữ liệu đã Apply.
- **Request DTO / tham số:** `PreviewQueryDto`. **Response DTO:** `PreviewResponseDto`.
- **Đầu vào theo API:** Param: datasetId, previewId | Query: ?page=1&limit=5
- **Kết quả theo API:** 200 OK: { "preview": {...}, "changes": [{ "rowId", "ordinal", "changeKind", "beforePosition": null|0, "afterPosition": null|0, "beforeCells": null|{}, "afterCells": null|{}, "diffColumnIds": [] }], "page": 1, "limit": 5, "totalChanges": 120, "totalPages": 24 }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 403 (sai quyền), 404 (preview không tồn tại), 410 (Gone - preview đã hết hạn expiresAt)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 25 — `POST /api/v1/datasets/:datasetId/operations`

- **Làm gì:** Công bố candidateVersion của preview thành published version mới, nâng revision của dataset và ghi sổ processingOperations.
- **Vì sao cần:** Apply là bước commit: chỉ publish snapshot đã Preview, đổi currentVersion và ghi operation nguyên tử, chống retry tạo trùng.
- **Request DTO / tham số:** `ApplyPreviewDto + key`. **Response DTO:** `ApplyPreviewResponseDto`.
- **Đầu vào theo API:** Header: Idempotency-Key | Body: { "previewId": "ObjectId" } (không nhận lại bộ tham số để tránh lệch với preview)
- **Kết quả theo API:** 201 Created: { "operation": { "_id", "kind": "process", "baseVersionId", "resultVersionId", "summary", "createdAt" }, "dataset": { "currentVersionId", "revision" } }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, IdempotencyInterceptor, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (preview ở trạng thái invalid), 409 (dataset đã bị tab khác thay đổi revision hoặc preview đã applied), 410 (preview hết hạn) / 409 NO_CHANGES_TO_APPLY khi preview không có thay đổi, không publish version và không ghi history.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

### HistoryController

**Module chịu trách nhiệm:** HistoryModule (đọc processingOperations; restore gọi Processing publish service).

#### API 26 — `GET /api/v1/datasets/:datasetId/operations`

- **Làm gì:** Lấy danh sách các thao tác đã commit thành công (import, process, restore) theo thứ tự thời gian giảm dần.
- **Vì sao cần:** History là sổ thao tác thành công; cho phép xem ai làm gì, khi nào, từ bản nào sang bản nào để có thể truy vết.
- **Request DTO / tham số:** `HistoryQueryDto`. **Response DTO:** `HistoryResponseDto`.
- **Đầu vào theo API:** Query: ?page=1&limit=20&kind=process
- **Kết quả theo API:** 200 OK: { "items": [{ "_id", "kind", "actorId", "baseVersionId", "resultVersionId", "specification", "summary", "createdAt" }], "page": 1, "limit": 20, "total": 14 }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 (sai tham số phân trang), 403 (sai quyền), 404 (dataset không tồn tại)
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

#### API 27 — `POST /api/v1/datasets/:datasetId/versions/:versionId/restore`

- **Làm gì:** Khôi phục dữ liệu về trạng thái của một phiên bản cũ bằng cách tạo ra một phiên bản published mới sao chép từ bản đích.
- **Vì sao cần:** Restore không quay ngược và ghi đè lịch sử: khi đang V4 khôi phục V2, hệ thống tạo V5 mới với nội dung V2.
- **Request DTO / tham số:** `RestoreVersionDto + key`. **Response DTO:** `RestoreVersionResponseDto`.
- **Đầu vào theo API:** Header: Idempotency-Key | Param: datasetId, versionId | Body: { "expectedCurrentVersionId": "ObjectId" }
- **Kết quả theo API:** 201 Created: { "operation": { "_id", "kind": "restore", "baseVersionId", "resultVersionId", "createdAt" }, "newVersion": { "_id", "versionNumber", "parentVersionId", "restoredFromVersionId" } }
- **Kiểm tra khi nhận request:** JwtAuthGuard, DatasetOwnerGuard, IdempotencyInterceptor, ValidationPipe
- **Trường hợp lỗi phải xét:** 400 VALIDATION_ERROR cho request/ID sai. 401/403 theo quyền. 404 VERSION_NOT_FOUND nếu target không tồn tại/chưa published/không thuộc dataset. 409 BASE_VERSION_STALE nếu expectedCurrent lệch. 409 NO_CHANGES_TO_RESTORE nếu target là current. Idempotency theo quy ước.
- **Cách test khi đã triển khai:** gửi request hợp lệ → kiểm HTTP/status/body và dữ liệu DB; gửi thiếu/sai quyền hoặc input sai → kiểm lỗi, không làm thay đổi tài nguyên. Với GET phải xác nhận không ghi DB; với POST phải test retry/idempotency khi hợp đồng yêu cầu.

## 4. DTO: phân biệt request, response và validate

1. **Request DTO** (ví dụ `RegisterDto`, `CreatePreviewDto`) định nghĩa field cho phép client gửi, field bắt buộc/optional, kiểu dữ liệu và quy tắc chuẩn hóa.
2. **Query DTO** (ví dụ `RowsQueryDto`, `HistoryQueryDto`) xác định `page`, `limit`, filter, sort hợp lệ; không nhận khóa truy vấn tùy ý.
3. **Response DTO** (ví dụ `VersionResponseDto`, `HistoryResponseDto`) định nghĩa *cái Backend cam kết trả*, không trả document MongoDB nguyên xi hoặc các trường mật khẩu/token/hash/private storage.
4. **DTO không thay thế nghiệp vụ**: TypeScript types/validation không biết liệu ObjectId có thuộc Project hiện tại hay không. Service/guard phải kiểm owner, FK logic, version published, CAS/idempotency.

### Quyết định DTO quan trọng đã chốt (D01–D26)

- **D01:** Email ASCII, tối đa 254 ký tự sau trim/lowercase; không bỏ dấu cộng/dấu chấm.
- **D02:** displayName sau trim dài 1–100 Unicode code point; null xóa, blank báo lỗi; không NFC.
- **D03:** Theme mặc định system, enum light/dark/system.
- **D04:** Tên project sau trim dài 1–100 code point, cho phép trùng.
- **D05:** Sort name/createdAt/updatedAt cả hai chiều, default -updatedAt; tie _id DESC.
- **D06:** Decimal separator chọn dấu chấm hoặc phẩy; grouping mặc định false, bật thì dùng ký hiệu còn lại với nhóm chữ số hợp lệ.
- **D07:** Chuyển số nhận trim ngoài, dấu +/-, E/e; parse đầy đủ; integer không safe không âm thầm làm tròn.
- **D08:** V1 date YYYY-MM-DD, datetime ISO8601; không tự đoán DD/MM/YYYY.
- **D09:** Thiếu offset dùng timezone chọn, mặc định UTC; offset nguồn ưu tiên. DST ambiguous/nonexistent báo lỗi.
- **D10:** Date→datetime lấy 00:00 theo zone; chiều ngược lấy ngày theo zone. Boolean dùng mapping tường minh, default true/1 và false/0.
- **D11:** One-hot nhận text/boolean; number chỉ khi asCategory=true. Chưa mixed/date/datetime ở V1.
- **D12:** Encoding mặc định bỏ nguồn, có tùy chọn giữ nguồn.
- **D13:** source_category hoặc source_ordinal, suffix nếu trùng; bỏ nguồn thay tại vị trí nguồn, giữ nguồn chèn sau.
- **D14:** Missing one-hot mặc định all-null. Nếu bật missingCategory, gộp một category và tính vào trần hiện có; không sửa dữ liệu nguồn.
- **D15:** Ordinal đủ mọi category nonmissing, không thừa; label hữu hạn, duy nhất, được âm/thập phân; giữ token missing.
- **D16:** Missing cuối cả tăng và giảm.
- **D17:** Text so code point, không trim/casefold/NFC; mixed theo number/date/datetime/boolean/text rồi giá trị.
- **D18:** Contains không phân biệt hoa/thường, không trim/NFC. Ordered filters chỉ number/date/datetime cùng kind; eq/ne exact typed.
- **D19:** Value-counts gộp missing trong kết quả, mặc định include; không thay snapshot hoặc duplicate equality.
- **D20:** Histogram cột hằng một bin; allmissing/nonnumeric trả[] kèm lý do, không lỗi toàn màn hình.
- **D21:** Tách counts dòng/cột; updatedCell chỉ ô có ở cả hai bản và đổi value/kind/token; không cộng ô của cột thêm/xóa.
- **D22:** Tối đa100 mẫu diagnostics tổng, errors trước; tổng thực tế giữ trong counts, có truncated.
- **D23:** V1 Pearson cho number, các loại khác null kèm lý do; chưa thêm association category/text.
- **D24:** Restore current:409 NO_CHANGES_TO_RESTORE, không version/history. Target missing/unpublished/wrong dataset:404 VERSION_NOT_FOUND.
- **D25:** Preview applied còn trong vòng đời:200; expired còn record:410; đã purge:404; không thêm tombstone.
- **D26:** Failed transient xác nhận rollback được retry cùng key/hash qua leaseCAS; deterministic replay lỗi. Chưa rõ commit thì recovery, không blind retry. Auth trước ID/quyền, receipt trước stale/consumed nhưng không vượt quyền hoặc xóa.

### Ví dụ Request → DTO → Service → Response

**Tạo Project:** Client gửi `POST /api/v1/projects` có JWT, header `Idempotency-Key` và `{ "name": "Nghiên cứu dữ liệu" }`. DTO kiểm tên. Guard kiểm session. Service kiểm receipt của key, tạo Project và Workspace nguyên tử (khi triển khai); trả `201` đúng `CreateProjectResponseDto`. Gửi lại cùng key/cùng body phải không tạo Project thứ hai.

**Restore:** Client gửi `POST /api/v1/datasets/:datasetId/versions/:versionId/restore` + key + `expectedCurrentVersionId`. DTO kiểm hình dạng và ID, guard kiểm chủ sở hữu, service xác nhận version target thuộc cùng Dataset, có publish, chưa stale. Tạo snapshot mới, ghi operation mới; không sửa dữ liệu bản target. D24 xác định restore bản đang current trả `409 NO_CHANGES_TO_RESTORE`.

## 5. ERD: giải thích đủ 12 collection

| Collection | Lưu gì? | Vì sao tách riêng? |
|---|---|---|
| `users` | Người dùng, email chuẩn hóa, hash mật khẩu, preferences | Một nguồn định danh và quyền sở hữu. Mọi Project trỏ đến ownerId, không trùng email. |
| `authSessions` | Phiên đăng nhập, refresh-token hash, rotation, expire/revoke | Tách phiên khỏi tài khoản: một người có nhiều thiết bị; logout/refresh có thể vô hiệu hóa phiên riêng. |
| `projects` | Tên, trạng thái và ownerId của từng dự án | Phân vùng nghiệp vụ và quyền sở hữu; một user có nhiều Project. |
| `workspaces` | Tab, trục 3D, selection, filter, sort, page, revision | Trạng thái giao diện không phải dữ liệu CSV; có thể thay mà không tạo DatasetVersion. |
| `datasets` | Liên kết Project, metadata import, currentVersionId, revision | Một Project tối đa một Dataset; Dataset trỏ phiên bản hiện hành. |
| `datasetVersions` | Mỗi snapshot, parentVersionId, restoredFromVersionId, trạng thái và counts | Bản published bất biến, cho phép truy vết, Undo bằng Restore tạo bản mới. |
| `versionColumns` | columnId ổn định, tên, thứ tự, datatype, format, lineage | Schema mỗi phiên bản có thể thay đổi sau chuyển kiểu/one-hot, nên không gắn cứng vào Dataset. |
| `dataChunks` | Payload Binary chia theo byte, codecVersion, checksum | Tránh BSON document quá lớn và hỗ trợ snapshot lớn; row/cell ở bên trong payload. |
| `processingPreviews` | Preview tạm, base/candidate, hash cấu hình, trạng thái, hết hạn | Tách bước xem trước khỏi bước công bố; invalid preview không bao giờ đổi dữ liệu hiện hành. |
| `previewChanges` | Các rowId bị ảnh hưởng, ordinal, vị trí trước/sau | Phân trang đúng mọi dòng thay đổi; không chỉ giữ năm ví dụ. |
| `processingOperations` | Nhật ký import/process/restore đã commit | History chỉ ghi thành công; operation nối bản trước với đúng một bản kết quả. |
| `idempotencyRecords` | Key digest, requestHash, status, response receipt, lease | Retry khi mất mạng không tạo trùng và phân biệt request trùng cùng key với request khác nội dung. |

### Các quan hệ chính

- `users (1) → projects (n)`: mỗi Project có owner; owner là nguồn kiểm tra quyền.
- `users (1) → authSessions (n)`: mỗi thiết bị/phiên có quyền thu hồi độc lập.
- `projects (1) → workspaces (1)`: một Project nhớ đúng một trạng thái UI.
- `projects (1) → datasets (0 hoặc 1)`: Project mới có thể rỗng; unique `datasets.projectId` ngăn nhập hai dataset.
- `datasets (1) → datasetVersions (n)`: mỗi lần import/apply/restore tạo bản mới; `currentVersionId` là con trỏ hiện hành.
- `datasetVersions (1) → versionColumns/dataChunks (n)`: một phiên bản sở hữu schema và nội dung bất biến.
- `datasets/versions → processingPreviews → previewChanges`: các dữ liệu tạm để xem trước, không là lịch sử thành công.
- `datasets (1) → processingOperations (n)`: lịch sử các thao tác đã commit; mỗi resultVersionId có đúng một operation.
- `users → idempotencyRecords`: key+scope+hash phân biệt retry; chưa có collection riêng cho từng thuật toán.

### Ví dụ V4 khôi phục V2

```text
V1 → V2 → V3 → V4   (currentVersionId = V4)
                │
                └─ restore nội dung V2 → V5
V5.parentVersionId = V4
V5.restoredFromVersionId = V2
Operation(kind=restore, baseVersionId=V4, resultVersionId=V5)
V1, V2, V3, V4 vẫn còn nguyên.
```

**Vì sao phải tạo V5?** Nếu đổi trực tiếp `currentVersionId` sang V2 rồi sửa V2, lịch sử và khả năng truy vết bị đứt. V5 giữ dòng thời gian và nguyên tắc published snapshot bất biến.

### Index, transaction, CAS: vì sao phải có?

- **Unique index:** DB tự chặn dữ liệu trùng (email, dataset/project, một chunkIndex/version, một resultVersion/operation…). TypeScript type không đủ để bảo đảm khi có hai request đồng thời.
- **MongoDB transaction:** commit một nhóm ghi liên quan cùng thành công hoặc cùng rollback, tránh currentVersion đổi nhưng operation/history không ghi được. Atlas replica set hỗ trợ transaction.
- **CAS (Compare-And-Swap):** ghi có điều kiện theo `revision/currentVersionId`; tab thứ hai đang giữ bản cũ nhận 409, không ghi đè âm thầm.
- **Idempotency record:** retry cùng key + payload nhận kết quả cũ, key giống nhưng payload khác bị từ chối; phải kiểm receipt theo đúng thứ tự được tài liệu quy định.
- **Staging:** xử lý nhiều chunks bên ngoài transaction; chỉ khi snapshot hoàn chỉnh mới publish bằng transaction ngắn.

## 6. Offline trong bản demo: ranh giới đúng

Giảng viên được diễn giải là: **web đang mở mà mất Backend/mạng thì vẫn xử lý được một số chức năng cơ bản; sau đó đồng bộ lên server**. Không yêu cầu mở trang từ đầu khi offline cho mốc demo trước mắt.

| Khi nào? | Trong code demo cục bộ | Trên Backend Atlas |
|---|---|---|
| Đang online nhưng người dùng import CSV trực tiếp trên web | Browser lưu IndexedDB, hiển thị bảng/3D | **Chưa được gửi lên Atlas** |
| Backend bị tắt giữa phiên | Preview/Apply/Restore cục bộ vẫn chạy | Không có request commit |
| Backend trở lại | Vẫn có local data | **Tự đồng bộ chưa triển khai** |

**Lưu ý kiến trúc:** LocalVersion trong demo chưa phải DatasetVersion canonical. Không bao giờ đẩy thẳng local ID/versionNumber thành MongoDB versionNumber. Khi tích hợp sync cần server-authoritative API, mapping ID, auth, Idempotency-Key, CAS/revision, nhận diện xung đột và UX chọn xử lý.

## 7. Tình trạng triển khai và checklist đọc code

1. `backend/src/main.ts` bootstrap NestJS; `app.module.ts` ghép module. Theo dõi request từ controller qua service đến repository.
2. `backend/src/modules/*/dto` là validation/types; đây là contract, **chưa phải triển khai database nghiệp vụ**.
3. `backend/src/infrastructure/database/collection-contracts.ts` là nơi khai báo 12 Mongo schemas/validators/index. `docs/database.md` mô tả 46 integration tests pass tại máy nhóm trưởng.
4. `frontend/src/features/offline` là demo xử lý cục bộ; chưa có server sync/ownership. Test local-engine đã chạy; React full build/E2E cần xác minh môi trường.
5. Sau offline, làm Auth/session/ownership → Project/workspace → CSV import/version snapshot → edit_cell Preview/Apply → History/Restore → Analysis và 3D trên dữ liệu thật.
6. Mỗi module phải có README; mã JS/TS không được sử dụng kiểu `any`; mọi loại test cần có mô tả mục tiêu, dữ liệu đầu vào và bằng chứng thực thi.

## 8. Câu hỏi giảng viên có thể hỏi

**Hỏi: Đã có 27 API rồi sao vẫn 501?** — Vì đã có hợp đồng Controller/DTO nhưng service chưa có nghiệp vụ; router có đường dẫn không đồng nghĩa có hệ thống hoạt động.

**Hỏi: Tại sao không lưu CSV thành một MongoDB document?** — MongoDB có giới hạn BSON document; ERD thiết kế dataChunks payload theo byte kèm codec/schema/version để hỗ trợ file lớn và các snapshot.

**Hỏi: Điểm 3D có dùng video không?** — Không. Demo Canvas tính ba tọa độ số, dùng sin/cos quay theo yaw/pitch và phép chiếu phối cảnh mỗi frame. Đây là phép chiếu 3D toán học, không phải ảnh/video chuyển động.

**Hỏi: Offline có thật hay chỉ ẩn lỗi?** — Demo local xử lý bằng JS và IndexedDB khi Backend mất; chưa có đồng bộ Atlas. Bật/tắt Backend khi trang đang mở là kiểm thử offline hiện có; không được tuyên bố sync đã đạt.

**Hỏi: Unit, integration và E2E khác nhau thế nào?** — Unit kiểm hàm riêng (CSV/Preview); integration kiểm nhiều thành phần thật phối hợp (NestJS+MongoDB transaction/index); E2E thao tác từ trình duyệt qua Backend đến DB và phản hồi UI. Test case là kịch bản đầu vào/hành động/kỳ vọng, có thể dùng ở cả ba mức.

**Hỏi: Code do AI viết thì ai chịu trách nhiệm?** — Nhóm phải trình bày được sơ đồ luồng, DTO và lý do validation, tự chạy được các test và chỉ xác nhận chức năng đã kiểm chứng.

**Trạng thái bản hướng dẫn:** sinh từ tài liệu commit `1067712`, kiểm tra trực tiếp API.md 27 dòng, DTO contract và các quy tắc ERD; nếu GitHub có commit mới, phải so sánh lại.
