# ProcessingModule

Preview và Apply phép xử lý.

## Cấu trúc

| Thành phần | Trách nhiệm |
| --- | --- |
| processing.controller.ts | Khai báo route và gọi validation DTO trước khi chuyển đến service. |
| processing.service.ts | Điều phối nghiệp vụ; bản main hiện còn trả HTTP 501 cho nghiệp vụ chưa triển khai. |
| processing.guard.ts | File guard riêng. Khung hiện từ chối với 501 nếu được gọi; chưa gắn vào controller. |
| processing.repository.ts | Ranh giới truy cập dữ liệu, đang là khung, chưa có CRUD. |
| processing.module.ts | Đăng ký controller, service, guard và repository với NestJS. |
| security/ | Chính sách bảo mật riêng của module khi triển khai; không chứa secret. |
| dto/ | Kiểu request/response và validation hiện có; xem README bên trong. |

## Luồng và trạng thái

Luồng đang chạy: HTTP → DTO/pipe → controller → service → HTTP 501 khi chưa có nghiệp vụ. Luồng dự kiến sau khi triển khai bảo mật: HTTP → guard → DTO → controller → service → repository → database. Guard đã đăng ký provider nhưng chưa dùng @UseGuards để không thay hành vi API của main bằng một kiểm tra bảo mật giả. Không dùng guard này để tuyên bố route đã được bảo vệ.

Schema/validator/index vẫn do infrastructure/database quản lý tập trung. Không tạo bản schema thứ hai trong module. Chưa triển khai thêm nghiệp vụ, kết nối hay collection trong đợt cấu hình này.

## Kiểm thử

Test tập trung trong backend/src/test: unit/, e2e/, integration/. Chạy npm run test:unit hoặc npm run test:e2e:backend từ gốc repo. Test hiện kiểm hợp đồng và trạng thái khung, không chứng minh CRUD đã hoàn thành. Mã nguồn JS/TS, không dùng kiểu any.


## BE-3B — Processing API implementation (branch integration)

Three routes (`POST previews`, `GET previews/:previewId`, `POST operations`) are now handled by `ProcessingService` and share the published/staged snapshot boundary of BE-2. The pure Data Core remains the sole algorithm implementation.

- Create: owner check -> idempotency claim -> base-version CAS check -> pure processing -> stage candidate via `SnapshotPublisherService.prepare` -> store all row-change indices in batches -> complete receipt and mark ready/invalid in one transaction. Invalid and no-op produce no candidate, no history.
- Read: owner + 30-minute expiry -> page previewChanges -> reconstruct typed before/after cells from published base and staged/published candidate. Applied previews remain readable until expiry.
- Apply: idempotency replay first -> expiry, readiness and specHash check -> revision CAS -> BE-2 `SnapshotPublisherService.publish` atomically writes published version, operation, preview-applied state and receipt. No duplicate publication on retries.
- Recovery: periodically purge expired preview metadata/changes behind recovery fences; BE-2 ImportRecovery removes now-unreferenced staged candidate chunks/columns (never published versions).

**Integration boundary:** `DatasetsRepository.stagedSnapshot` and `DatasetsService.readPreviewCandidate` are additive BE-2-side read interfaces; coordinate with BE-2 owner before merging. They never expose a candidate without a validated dataset/preview owner.

**Remaining verification:** run actual MongoDB replica-set integration/E2E tests for concurrency, stale revisions, expired preview cleanup, idempotency replay, ownership/deletion fences and large snapshots. Existing unit and mocked orchestration tests do not establish these guarantees. Implement History/Restore and Analysis separately. The shared pure engine currently rejects non-UTC datetime conversion and has conservative HTML handling; these must be reviewed against final acceptance criteria.
