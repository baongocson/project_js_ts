# Kiến trúc theo luồng xử lý hành động

Ngày cập nhật: 20/11/2026. Tài liệu này mô tả cấu trúc đã triển khai trong mã nguồn; các kế hoạch refactor cũ là tài liệu lịch sử.

## Luồng online

```text
Người dùng thao tác
  → Component
  → Hook (state, effect, loading/error, điều hướng)
  → Service nếu có nghiệp vụ
  → API (endpoint, method, query/body, response của endpoint)
  → shared/api/http-client.ts (fetch, token, status, body, lỗi)
  → HTTP request
  → Node.js / Express / NestJS
  → Middleware → Guard → Interceptor chiều vào → Pipe
  → Controller → Service → Repository → MongoDB
  → Repository trả dữ liệu → Service → Controller
  → Interceptor chiều ra → NestJS/Express gửi HTTP response
  → HTTP client → API → Service nếu có → Hook cập nhật state
  → React render Component
```

Page ghép hook với component. Khi người dùng thao tác, callback của hook được gọi; không có yêu cầu page phải nằm trong từng lượt gọi hàm. Hook vẫn giữ điều phối gắn với giao diện, AbortController, generation, timer và điều hướng.

Service không phụ thuộc React. Service chứa quy tắc nghiệp vụ hoặc quy trình nhiều bước; không tạo service rỗng cho CRUD chỉ chuyển tiếp request. API không import service. Repository không import service/controller. Kiểu dữ liệu dùng `import type` có thể đi qua ranh giới khi cần hợp đồng chung.

Luồng trên là luồng thành công điển hình. Guard có thể gọi service/repository để đọc phiên và quyền trước controller. Lỗi có thể đi qua interceptor rồi tới `ApiExceptionFilter`, hoặc tới filter ngay từ guard/pipe. CORS/preflight có thể kết thúc sớm. Các interceptor chỉ chạy ở nơi đã đăng ký; không tạo interceptor rỗng cho từng route.

## Tổ chức frontend

```text
frontend/src/
├── app/
│   ├── components/, pages/, hooks/
│   └── services/workspace-service.ts
├── features/<feature>/
│   ├── components/, pages/, hooks/
│   ├── services/       # Khi có nghiệp vụ
│   ├── api/            # Khi có endpoint HTTP
│   ├── repositories/   # Khi có lưu trữ local
│   ├── domain/         # Khi cần nhóm quy tắc/hợp đồng độc lập
│   ├── types.ts
│   └── index.ts
└── shared/
    ├── api/http-client.ts
    └── ui/, style/
```

Chiều giữa các vùng vẫn là `app → features → shared`; feature khác truy cập qua public `index.ts`. Không gom toàn bộ hook/service của mọi tính năng vào một thư mục lớn.

| Tính năng | Thay đổi chính |
|---|---|
| Projects | `services/project-service.ts` kiểm tên cho create/rename; bản nháp ở `repositories/workspace-drafts.ts` |
| Datasets | `services/import-service.ts` đọc nguồn, kiểm dung lượng, tạo typed preview/options và gọi import API; hook giữ wizard state |
| Processing | `services/online-processing.ts` kiểm version và gom category; `services/processing-session.ts` giữ key/receipt target và phân loại retry; endpoint ở `api/processing-api.ts` |
| Analysis | Hợp đồng ở `analysis-contract.ts`, endpoint online ở `api/analysis-api.ts`, phân tích local ở `services/analysis-service.ts` |
| Auth | Token, refresh, khóa và session store ở `services/session-service.ts`; `hooks/session.ts` chỉ subscribe/bootstrap React |
| Offline | Sync/backup/local processing/recovery ở `services/`; IndexedDB ở `repositories/`; preview reconstruction và progress events ở `domain/` |
| Workspace | `app/services/workspace-service.ts` ghép project/dataset API và lưu/khôi phục bản nháp; hook giữ state/effect và lịch lưu |

History và các CRUD đơn giản tiếp tục dùng `Hook → API → HTTP client`. Các hàm thuần đã có như `methods.ts`, `scatter-model.ts` và các types giữ phạm vi tính năng; không bắt buộc di chuyển chỉ để đủ tên thư mục.

## Luồng offline

```text
Component → Hook → Service → Repository local → IndexedDB
                         └→ @dashboard/data-core (CSV, xử lý, phân tích)

Khi đồng bộ:
Hook → Sync service → ProjectApi → HTTP client → Backend
                    └→ Repository local lưu checkpoint
```

Giữ nguyên database `dashboard3d-projects-v1`, schema version 2, object stores, Web Locks, account binding, version/CAS, snapshot/history/outbox và các khóa retry bền vững. Việc đổi cấu trúc không yêu cầu migration hoặc xóa dữ liệu.

`processing-adapter.ts` và `sync-coordinator.tsx` ở gốc offline là entry point tương thích mỏng; triển khai thực tế nằm trong services/hooks/components.

## Tổ chức backend

Giữ module theo nghiệp vụ. Mỗi module có controller/service/repository, DTO và policy riêng khi cần. `common/interceptors/` chứa request logging, `common/pipes/` chứa `DtoValidationPipe`, `common/filters/` chứa filter lỗi. CSV upload interceptor thuộc `modules/datasets/interceptors/`.

Các thay đổi về truy cập dữ liệu:

- `OwnershipService → OwnershipRepository`: service giữ quyết định quyền và lifecycle; repository thực hiện đọc/ghi dưới cùng transaction.
- `ImportRecoveryService → ImportRecoveryRepository`: service giữ lịch recovery và phối hợp storage/dataset.
- `AccountCleanupService → AccountCleanupRepository`: service giữ thứ tự cleanup và kiểm tra đường dẫn file; repository dọn collection.
- `IdempotencyService → IdempotencyRepository`: service giữ lease, replay, heartbeat và phân loại lỗi; repository lưu receipt và CAS.
- `OperationWriterRepository` và `RecoveryFenceRepository` mang tên đúng trách nhiệm lưu trữ.
- `UsersService` thực hiện authorization fence trong transaction trước `UsersRepository.patch`, tránh repository gọi ngược service.
- `AppService → HealthRepository` cho ping database.
- Projects repository trả dữ liệu lưu trữ; service chuyển ObjectId/ngày sang response HTTP hiện tại.

Không thay endpoint, DTO HTTP, thuật toán, mã lỗi hoặc phiên bản engine. `packages/data-core` tiếp tục là nguồn thuật toán dùng chung FE/BE.

## Một ví dụ để lần theo mã

Tạo project:

1. `frontend/src/features/projects/components/ProjectsView.tsx`: submit.
2. `hooks/useProjects.ts`: trạng thái gửi, key cho lần thử và điều hướng.
3. `services/project-service.ts`: chuẩn hóa/kiểm tên.
4. `api/projects-api.ts`: POST projects và Idempotency-Key.
5. `frontend/src/shared/api/http-client.ts`: fetch, xác thực và response.
6. `backend/src/main.ts`, `modules/auth/auth.module.ts`: middleware, global guards, validation/filter.
7. `modules/projects/projects.controller.ts`: request pipe và chuyển cho service.
8. `modules/projects/projects.service.ts`: idempotency, transaction và tạo project/workspace.
9. `modules/projects/projects.repository.ts`: ghi MongoDB.
10. Kết quả quay về qua interceptor, HTTP client và hook; hook điều hướng đến workspace.

## Kiểm tra

```sh
npm run typecheck
npm run build
npm run test:unit -w frontend
npm run test:offline -w frontend
npm run test:unit -w backend
npm run test:e2e -w backend
npm run test:integration:local -w backend
npm run test:acceptance -w frontend
```

`typecheck` chạy thêm checker kiến trúc của từng phía. Frontend kiểm chiều import, public feature boundary, cycle, vị trí fetch/requestJson và cấm runtime import ngược giữa các tầng cùng feature. Backend cấm controller gọi repository, service/controller lấy kết nối hoặc gọi collection, repository import ngược service/controller. Đây là kiểm tra tĩnh cho các mẫu mã hiện tại; review vẫn cần kiểm tra trách nhiệm nghiệp vụ và các kiểu truy cập động.

Integration/acceptance runner dùng MongoDB replica tạm và database tên riêng. Windows sandbox cần cho phép kết nối loopback để chạy HTTP/MongoDB/browser test; lỗi `connect EACCES 127.0.0.1` trước khi gửi request không phải bằng chứng lỗi nghiệp vụ.

## Kết quả kiểm chứng ngày 20/11/2026

| Kiểm tra | Kết quả |
|---|---|
| Typecheck toàn workspace, gồm checker FE/BE | Đạt |
| Build backend và frontend | Đạt; Vite còn cảnh báo chunk lớn |
| Frontend unit | 38/38, gồm 4 ca bổ sung cho service CSV/project và khóa Preview/Apply |
| Offline replay | 10/10 |
| Backend unit | 72/72 trong 25 suite |
| Backend HTTP E2E | 52/52 trong 4 suite |
| Integration MongoDB tạm | 139/139 trong 6 nhóm: BE2, Auth, Database, Health, BE3, method matrix |
| Browser acceptance toàn bộ | 52/53 ở lượt đầu; ca đăng nhập sau offline reload timeout dù login trả 200 |
| Kiểm tra lại ca browser timeout | 1/1 khi chạy riêng; sau đó cả nhóm account lifecycle 7/7. Không đổi assertion, timeout hoặc mã để làm test qua; nguyên nhân timeout ở lượt đầu chưa được kết luận |
| Lint mã ứng dụng và checker/test liên quan | Đạt |
| Thử chủ động đưa import sai tầng vào checker | Từ chối đúng 6/6 trường hợp; các file thử đã xóa |
| git diff --check cho phần refactor | Đạt |

`npm run lint` toàn repo còn 9 lỗi trong các file có sẵn ở `docs/slide/.build/author.mjs`, `check_html.mjs` và `add-two-slides/check_delivery.mjs`. Phần slide/Docker/Nginx có thay đổi từ trước đợt refactor được giữ nguyên. Test HTTP/MongoDB/browser ban đầu bị sandbox chặn loopback; các kết quả phía trên là sau khi chạy lại với quyền kết nối localhost.
