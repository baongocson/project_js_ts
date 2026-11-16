# BE-1 — Auth, Users và nền bảo vệ API

Nhánh thực hiện: **dev-backend**. Ngày: **16/11/2026**. Code hiện ở working tree, chưa commit/push trong lượt này. Đây là bàn giao BE-1, không phải tuyên bố BE-2/BE-3 hoặc frontend/sync đã hoàn thành.

## Chức năng đã triển khai

| API | Khi database bật |
| --- | --- |
| POST /api/v1/auth/register | 201, user projection, email chuẩn hóa unique, bcryptjs cost12. Không tự login. |
| POST /api/v1/auth/login | 200, access900giây + refresh cookie; session Mongo thật, user-active fence trong transaction. |
| POST /api/v1/auth/refresh | 200, lookup SHA256 refresh hash, rotation CAS với một winner, giữ hạn tuyệt đối7ngày. Token cũ401. |
| POST /api/v1/auth/logout | 204, revoke session rồi clear cookie đúng attributes. Cookie thiếu/invalid/revoked vẫn204. |
| GET /api/v1/users/me | 200, projection công khai. |
| PATCH /api/v1/users/me | 200, nested patch đúng contract, transaction kiểm lại user/session để tránh race logout/delete. |
| DELETE /api/v1/users/me | 204 chỉ sau cascade xong. Lỗi503 giữ marker deleting, revoke session và có thể recovery. |

Health vẫn public. Auth endpoints public đối với JWT nhưng bắt buộc Origin hợp lệ và rate guard. Global AuthGuard/OwnershipGuard bảo vệ tất cả route nghiệp vụ còn lại. Không có token/session hợp lệ thì401 ngay cả khi database tắt. 20 API thuộc Projects/Datasets/Processing/History/Analysis còn pending501 **sau** xác thực/quyền; không tính chúng đã chạy nghiệp vụ thật.

## Bảo mật và cấu hình

- Access JWT HS256: kiểm signature, exp, iat, sub/sid, issuer/audience; token TTL900giây. Secret tối thiểu32UTF-8bytes, lấy từ môi trường.
- Refresh256bit random, database chỉ giữ SHA256 hash. Cookie HttpOnly/Secure/SameSite=Lax/Path=/api/v1/auth, expiry tuyệt đối7ngày. Logout làm access token cùng session mất hiệu lực ngay ở request tiếp theo.
- Email ASCII/trim/lowercase và password byte rules giữ nguyên. Password bcrypt cost12. Unknown account vẫn chạy bcrypt với dummy hash cùng cost; lỗi credentials chung.
- Origin exact allowlist, không nhận ownerId/userId từ body. Không tin X-Forwarded-For khi chưa cấu hình trusted proxy.
- Rate limit một process: register10/15m/IP, login60/15m/IP, failure5/15m/IP+email, refresh60/m/IP và session, logout60/m/IP. Các biến AUTH_*_LIMIT trong .env.example có thể điều chỉnh;429 có Retry-After.
- Rate bucket có giới hạn bộ nhớ và sweep; không distributed/persistent qua restart. Nếu mở nhiều instance, phải thay bằng backend limiter dùng chung trước khi tuyên bố cùng hạn mức toàn hệ thống.
- Backend DB module global để module repository dùng default connection. Kết nối startup fail nhanh thay vì retry9lần; không bỏ verify schema/index hoặc yêu cầu transaction Mongo.

Chạy từ gốc:

```powershell
npm install
npm run auth:init-secret -w backend
npm run start:dev -w backend
```

Lệnh init chỉ tạo secret local nếu chưa cấu hình, không in secret và không thay khóa hợp lệ. Trong lượt này đã tạo secret trong backend/.env cục bộ; file bị Git bỏ qua. Không commit/gửi .env. DATABASE_ENABLED=true cần Mongo đã provision và config hợp lệ; khi false Auth/Users service giữ501 để test DTO cô lập, không giả persistence thành công.

Cookie Secure cần HTTPS để nghiệm thu cookie jar trình duyệt: đặt reverse proxy HTTPS cùng origin cho frontend và /api, FRONTEND_ORIGIN đúng origin HTTPS. BE-1 Supertest kiểm Set-Cookie và gửi cookie tường minh, **chưa kiểm đăng nhập browser HTTPS**. Frontend auth UI cũng chưa có trong gói này.

## Interface để BE-2 và BE-3 làm song song

### Principal và thứ tự guard

Import từ `backend/src/modules/auth/security/auth-context.ts`:

```ts
interface Principal { userId: string; sessionId: string }
// Controller:
method(@CurrentPrincipal() principal: Principal) { /* chuyển xuống service */ }
```

Principal đã xác thực, không lấy identity từ body/header tự định nghĩa. Health/Auth dùng Public; **không đặt Public lên module nghiệp vụ để vượt test**. Không gắn các module guard placeholder501 lên controller; global guard đã thực hiện bước bảo vệ.

Thứ tự: JWT/session/user active → syntax ID → parent/owner/relation → DTO/service. Thiếu auth401 trước ID400, sai owner403, tài nguyên thiếu404, project deleting đọc404/ghi409. Version phải published và cùng dataset; preview phải cùng dataset. Apply có `@PreviewBodyOwner()` để kiểm previewId trong body, không phụ thuộc tên hàm.

Các method công khai của OwnershipService (được AuthModule global export):

```ts
project(projectId: string, principal: Principal, write?: boolean)
dataset(datasetId: string, principal: Principal, write?: boolean)
version(datasetId: string, versionId: string): Promise<void>
preview(datasetId: string, previewId: string): Promise<void>
fence(principal: Principal, projectId: string | undefined, session: ClientSession): Promise<void>
```

**BE-2/3 phải gọi fence trong mỗi transaction mutation/publish/batch ghi**, không chỉ tin guard đã chạy. Fence cập nhật writeEpoch user/project active và chạm session chưa revoke/hết hạn, cùng transaction với ghi nghiệp vụ. Nếu logout/delete cạnh tranh, transaction phải conflict/retry hoặc từ chối; không được ghi sau lifecycle bị khóa. Không có project mới thì truyền undefined, sau khi tạo có projectId phải kiểm parent.

Guard không đọc row/cell binary chunk khi codec chưa có. BE-2/3 phải kiểm rowId/columnId đúng version, body baseVersion/currentVersion, ID mapping, lifecycle/revision/idempotency và mọi relation nghiệp vụ còn lại trong service. Guard list projects không thay filter ownerId trong query repository. Guard cũng không triển khai idempotency/lease/receipt cho các mutation BE-2/3.

### Cleanup chung

Import AccountCleanupModule từ `infrastructure/database/account-cleanup.module.ts`, inject AccountCleanupService:

```ts
markUserDeleting(userId: Types.ObjectId, principal?: Principal): Promise<void>
removeUser(userId: Types.ObjectId): Promise<void>
removeProject(projectId: Types.ObjectId): Promise<void>
```

markUserDeleting transaction đổi lifecycle, tăng fence và revoke sessions/mark projects. `principal` bắt buộc ở HTTP flow; bỏ qua chỉ dành cho cleanup nội bộ/test có chủ đích. `removeProject` chỉ cho project deleting (đã thiếu thì no-op), không tự cho phép xóa project active.

Cascade đi theo12collection đã có: previewChanges/previews, chunks/columns/versions, operations, original source, dataset/workspace/receipts/project, cuối cùng sessions/user. Batches ngoài transaction sau khi fence. Lỗi file/database không bị nuốt thành204; marker còn để recovery. Worker startup và mỗi60giây tiếp tục user deleting; một user lỗi không chặn user khác. Không có job collection mới hoặc distributed queue.

BE-2 phải lưu `originalFile.storageKey` là **đường dẫn tương đối bên dưới ORIGINAL_STORAGE_ROOT**, mặc định backend/storage/originals. Cleanup kiểm đường dẫn thực/symlink, chỉ unlink file nguồn đó, không recursive delete hoặc xóa cả root. Missing file được coi đã dọn; key thoát root bị chặn. Nếu đổi storage adapter/định dạng key, phải cập nhật chung với cleanup trước tích hợp.

BE-2 chịu trách nhiệm vòng đời delete project riêng và scheduling recovery project độc lập khi triển khai route đó; BE-1 worker hiện resume **user deleting**, không tự đoán/xóa mọi project deleting của một user active.

## Kiểm chứng và cách chạy

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run test:be1 -w backend
npm run test:integration
npm run build
```

- Unit25ca: hợp đồng cũ + token/secret/rate limit.
- Backend HTTP48ca:40ca DTO contract cũ với override guard **tường minh**,8ca security không override. Không dùng DTO suite database=false để chứng minh đăng nhập thành công.
- Atlas BE-1:9ca không override guard/persistence. Kiểm bcrypt/projection, auth/session/rotation cạnh tranh, JWT/session expiry/logout, quyền project/dataset/version/preview, mutation fence, Users/cascade đủ collection và file nguồn, lỗi503 rồi recovery bằng service instance mới.
- Integration tổng52ca =43ca database/schema/index/health hiện có +9ca BE-1. Không drop/provision; tài khoản/file/ID thử riêng, cleanup/rollback đúng graph. Account sweeper toàn app bị tắt trong test để không động vào deleting user có sẵn; recovery chỉ dọn user của lượt test.
- Frontend Playwright4ca hiện có vẫn là health/router/error với DB tắt. Test build frontend/backend trong quá trình chạy, chưa phải nghiệm thu browser login/offline/sync.

Lượt đầu chạy Atlas trong sandbox bị DNS timeout; chạy lại với quyền network được duyệt đã PASS. Không skip lỗi mạng thành PASS. Secret test sinh riêng trong process rồi restore môi trường, không thay secret .env.

## Phần chưa thuộc kết quả BE-1

- Chưa triển khai20API còn lại, engine27method, shared data-core, import/publish/idempotency, analysis/history hay đồng bộ offline.
- Chưa kiểm concurrent publish/delete thực tế vì publisher BE-2/3 chưa có; đã có fence và test từ chối session revoke/parent deleting. Họ phải nối fence vào transaction và bổ sung concurrency tests tương ứng.
- Browser HTTPS cookie flow và frontend single-flight refresh cần FE-1 tích hợp. Không tắt Secure để làm demo HTTP trông thành công.
- Chưa triển khai limiter distributed hoặc deployment nhiều instance. Rate settings/state hiện là single-process như đặc tả.
- Không thay API/DTO/ERD, không cherry-pick toàn auth branch cũ và không ghi đè frontend.

Trước commit, review diff và chỉ stage file thuộc BE-1; không stage .env, storage, video, cache hoặc build. Lệnh/init config và README đã được cập nhật để thành viên khác nhận nhánh có thể chạy/test lại.
