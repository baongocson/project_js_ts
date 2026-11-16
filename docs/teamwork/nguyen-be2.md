# Nguyễn — BE-2

Trạng thái: đã triển khai phạm vi BE-2 và kiểm chứng các luồng bên dưới; còn gate tích hợp BE-3/frontend ngoài phạm vi gói này. Nhánh `feat/be-2-nguyen`, nền `bfaedf6` từ `dev-backend`. Không commit/push/merge/PR. Phạm vi được người dùng xác nhận ngày 16/11/2026, theo backend implementation plan và toàn bộ đặc tả Sơn 13 mục.

## Phạm vi

6 API Projects, 4 API Datasets; workspace persistence/CAS; CSV nguồn filesystem; parser/inference/missing; typed snapshot/chunks/SHA-256; receipt/lease/heartbeat/recovery; transaction publish/lifecycle/fence; delete/recovery; contract mapping/replay/resume/conflict; types và codec trong data-core. Không triển khai thay engine 27 method, Auth hoặc ownership.

## Các yêu cầu BE-2 đã triển khai

| API | Implementation |
| --- | --- |
| POST /api/v1/projects | Transaction tạo project/workspace mặc định và receipt; replay cùng key/payload |
| GET /api/v1/projects | Owner filter, lifecycle, sort/tie, pagination |
| GET /api/v1/projects/:projectId | Project/dataset metadata, workspace normalization; không ghi DB |
| PATCH /api/v1/projects/:projectId | Rename có parent/user/session fence |
| PATCH /api/v1/projects/:projectId/workspace | Nested PATCH, optimistic revision/base, no-op giữ revision/updatedAt |
| DELETE /api/v1/projects/:projectId | Mark deleting + fence, cascade dùng BE-1; 204 sau cleanup; lỗi 503 và recovery |
| POST /api/v1/projects/:projectId/datasets | Multipart CSV, checksum nguồn, inference, staged chunks ngoài publish transaction, publish V1/history/receipt nguyên tử |
| GET /api/v1/datasets/:datasetId/versions/:versionId | Published version metadata và columns |
| GET .../rows | Kiểm integrity, decode, filter/sort/pagination, typed output |
| GET .../rows/:rowId | Lookup độc lập page/filter; ROW_NOT_FOUND |

Giữ đúng 12 collection, không thêm endpoint. Không sửa API wire contract/DTO/ERD. Source path không công khai. CSV giữ byte-for-byte; đường dẫn sinh từ receipt ID/lease token; exclusive create, fsync/readback checksum. Import chỉ publish sau khi source được xác minh. Candidate và mỗi batch ghi có receipt/user/project/session fence; publish transaction ngắn cập nhật version/current/revision/history/receipt.

Recovery import: chỉ cleanup placeholder chưa published có receipt hết lease/failed; transaction tranh cùng receipt/parent fence, không suy rollback từ thời gian đơn thuần. Worker khởi động/định kỳ; orphan source được kiểm tham chiếu trước khi dọn. Candidate building/staged/discarding không còn được preview/history/currentVersion hoặc pending lease tham chiếu được dọn sau grace2lease; chỉ xử lý candidate cũ, không chạm published. Delete project worker dùng marker deleting có sẵn và AccountCleanupService, không tạo job collection. Cleanup chung có sửa kiểm ENOENT theo error.code để xử lý file chưa tồn tại, kể cả lỗi khác JavaScript realm; không đổi Auth/ownership.

StorageWriteBarrier đăng ký source writer trước khi kiểm fence, không giữ transaction trong khi IO. Sau khi marker deleting commit, cleanup project/user chờ source writer trong tiến trình kết thúc rồi unlink/cascade, **không trả204 rồi để publisher ghi file muộn**. Integration giữ writer ở barrier, xác minh delete còn chờ sau marker, thả writer, nhận import409/delete204 và kiểm file đã mất. Orphan từ process crash vẫn do recovery dọn. Contract này theo mô hình một backend process của Sơn; không tuyên bố hỗ trợ nhiều process dùng chung filesystem.

## Kết quả kiểm thử thực tế đến hiện tại

- Core unit: **14/14 đạt**, gồm ESM/CommonJS parity, CSV, inference/overrides, codec qua chunk/UTF-8, giới hạn, sort/filter, mapping và conflict/resume.
- Backend unit: **29/29 đạt**,17suite, gồm storage byte-for-byte/exclusive-write/path validation/missing cleanup và workspace normalization.
- HTTP E2E DB tắt: **49/49 đạt** ngoài sandbox, gồm JSON trên100KiB được chuyển đến DTO và body vượt1MiB trả413. Không dùng kết quả này chứng minh persistence.
- Integration ban đầu thiếu MONGODB_URI nên không chạy được. Theo lựa chọn người dùng, đã thêm replica set MongoDB 8.0.16 tạm riêng, provision đủ validator/index trước test, tự dừng sau test.
- Integration tổng: **69/69 đạt**,4suite (BE-2:17ca, BE-1:9ca, schema/index/health:43ca), gồm receipt recovery không vượt session revoke.
- Lượt BE-2 cuối17/17 đạt sau kiểm thêm pagination đến Number.MAX_SAFE_INTEGER và HTTP import nguồn đúng16.000.000byte; nguồn16.000.001byte trả413. Candidate vượt100MiB trả413 trước khi tạo version.
- `npm run typecheck`: đạt backend runtime/test, frontend runtime/test/architecture, data-core. `npm run lint`: đạt toàn dự án. `npm run build`: đạt backend, frontend và CJS/ESM core.
- Chưa kiểm browser/offline sync thật; không dùng Node contract tests thay gate FE.

Ca Superagent đọc response ô4,4MB từng gặp ECONNRESET. Ca hiện tại xác minh source/chunks/decoded snapshot và dùng native Node fetch đọc đúng response HTTP4,4MB, đã PASS. Chưa kết luận nguyên nhân của Superagent; chưa kiểm UI trình duyệt với ô lớn.

## Interface và dependency

- Tái sử dụng `CurrentPrincipal`, OwnershipService và `fence` của BE-1. Không sửa Auth/ownership implementation.
- `ProjectStateService.bindImport` là transaction participant để Datasets không tự ghi projects/workspaces.
- `OperationWriterService.append` ghi history qua boundary Processing, yêu cầu transaction; không chứa thuật toán BE-3.
- `SnapshotPublisherService.prepare/publish` cho BE-3: prepare candidate theo chunk; publish có expectedCurrentVersion/revision, receipt và hook transaction cho preview CAS. BE-3 vẫn chịu trách nhiệm kiểm preview expiry/no-op/invalid, clone source khi restore và specification/summary thật, cùng cleanup preview/candidate có liên kết.
- `IdempotencyService.claim/run/touch/complete`: BE-3 claim đúng project/actionScope và payload chuẩn hóa, replay trước stale/applied, chạy preparation trong `run` để heartbeat, mọi transaction batch gọi touch. Không lưu token xác thực trong receipt.
- RecoveryFenceService ở infrastructure chỉ chạm epoch của active user/project để serialize cleanup với publisher; không thay quyền HTTP hoặc viết trường nghiệp vụ của module khác.
- AccountCleanupModule dùng StorageModule chung. Runtime phải inject AccountCleanupService qua module để có cùng StorageWriteBarrier; constructor bổ sung optional participant cho fixture/recovery sau process restart khi không còn writer cũ. Không thay API xóa user.
- FE-1/FE-3 phải nối outbox durable, engine-version check, V1/lineage mapping, stable key/checkpoint và conflict handling. Đã có helper/test contract, chưa có bằng chứng đóng/mở app rồi sync, mất mạng và mở phiên khác đọc lại. Engine 27 method và các API BE-3 chưa được triển khai trong phạm vi này.

Root workspaces/dependency/build/lint/lockfile được cập nhật để tiêu thụ data-core. Bộ test BE-1 chỉ đổi fixture/expectation ở route BE-2 đã thành nghiệp vụ; không nới kiểm quyền hoặc đổi Auth. Không đổi wire contract/DTO shape/ERD. Các interface mới nội bộ đã được giải thích trước khi sửa; BE-1/BE-3 cần review lúc tích hợp, không cần migration schema.

## Phần chưa hoàn thành trong toàn hệ thống và lỗi/giới hạn còn lại

- Engine27method, preview/Apply/History/Analysis HTTP và orchestration restore của BE-3 chưa được viết trong gói này theo giới hạn người dùng xác nhận. Publisher nội bộ có test thật, không coi là10API BE-3 đã triển khai.
- Frontend outbox, engine-version handshake, replay/resume/conflict, checkpoint và mở phiên khác đọc sau sync chưa tích hợp; xem [contract sync BE-2](be2-sync-contract.md). Không tuyên bố đồng bộ toàn hệ thống hoàn thành.
- Kiểm thử dùng MongoDB8.0.16 replica set local thật, chưa xác minh trên Atlas/deployment/HTTPS browser ở lượt này. Không có cấu hình Atlas trong checkout, không tạo hoặc thay .env/secret thật.
- Filesystem storage theo cấu hình một máy/tiến trình của đặc tả; chưa nghiệm thu HA/shared filesystem, distributed limiter hoặc load benchmark. Không thêm giới hạn dòng/ô để né tải.
- Bộ test đã kiểm rollback do participant/ledger fail, mất response HTTP thật sau commit, expired lease/heartbeat/takeover, cross-owner/session fence, startup/periodic recovery và import/delete race. Chưa thử tắt điện/kill OS giữa fsync và disk flush; không coi fault injection là chứng minh mọi kiểu hỏng hạ tầng.

## Đối chiếu đủ13mục đặc tả Sơn

| Mục | Phần BE-2 và bằng chứng / dependency |
| --- | --- |
| 1.27API | Giữ27route hiện có, không thêmroute;10route BE-2 có protected HTTP integration.10route BE-3 còn scaffold, không tính hoàn thành |
| 2.Kiến trúc | Controller→Service→Repository; writer module công khai cho participant; đúng12collection/registry gốc |
| 3.data-core | Types/parser/codec/missing/equality/query/sync contract, CJS/ESM cùng fixture; engine/statistics do BE-3 |
| 4.Storage/snapshot | CSV byte-for-byte/checksum, generated private key, codec stream/chunks/encoded cap và integrity tests; barrier chặn file muộn sau204 |
| 5.Auth/quyền | Tái sử dụng principal/guard/fence BE-1; cross-owner/auth-before-ID/session-revoke tests |
| 6.Rate/logging | Không đổi auth limiter; logging BE-2 chỉ requestId/action pattern/elapsed/code/status, không body/query/token header; error envelope dùng cùng requestId |
| 7.Project/workspace/delete | CRUD, no-op/revision/base CAS, normalization không ghi GET, mark deleting/recovery, kiểm startup/periodic callbacks và race |
| 8.CSV/typed | BOM/delimiter/quotes/newline/blank-record/field-count/positions, whole-column inference/overrides/unsafe integer/missing/header-only/header rỗng-trùng; unit+HTTP tests |
| 9.Version/idempotency | Batch lease fence + heartbeat/takeover, immutable published, publish/history/receipt transaction, concurrent candidate winner, rollback và actual response loss |
| 10.27methods | Chủ sở hữu BE-3, không triển khai thay hoặc tạo fake engine; core contracts bàn giao |
| 11.Preview/history/analysis | BE-2 cung cấp readSnapshot/prepare/publish; candidate CAS/restore-new-version test thật qua internal participant. HTTP nghiệp vụ/TTL preview/analysis do BE-3 |
| 12.Sync | Không bulk-sync/job; stable key/V1 mapping/lineage/engine+version conflict/resume contracts đã test; durable outbox/browser parity và nghiệm thu phiên khác cần FE/BE-3 |
| 13.Lỗi/nghiệm thu | Giữ statuses/envelope/limits; lint/typecheck/build/unit/HTTP/integration được ghi theo kết quả thực tế; toàn hệ thống chưa nghiệm thu vì gate BE-3/FE |

## Hướng dẫn

Từ gốc repo:

```powershell
npm install
npm run test -w @dashboard/data-core
npm run test:unit
npm run test:be2:local -w backend
npm run test:integration:local -w backend
npm run lint
npm run typecheck
npm run test:e2e:backend
npm run build
```

Replica runner chỉ tạo server loopback và random database riêng, không dùng application URI. Lần đầu cần tải mongod; binary cache ở backend/storage/test-binaries (Git ignored). Runtime database thực phải có replica set và schema/index đã provision; cấu hình qua backend/.env riêng, không gửi/commit secret. test:integration bình thường vẫn dùng cấu hình database được cung cấp; test:integration:local dùng replica set tạm.

`ORIGINAL_STORAGE_ROOT` mặc định backend/storage/originals. `IDEMPOTENCY_LEASE_MS=60000`, `IDEMPOTENCY_HEARTBEAT_MS=20000`; yêu cầu 0 < heartbeat < lease. `PROJECT_CLEANUP_ENABLED`, `IMPORT_RECOVERY_ENABLED` mặc định bật; recovery startup và mỗi 60 giây. Test tắt sweep toàn cục và gọi recovery theo project thử riêng.

Giới hạn giữ nguyên: nguồn 16.000.000 bytes; JSON 1 MiB; chunk 4 MiB; encoded snapshot 100 MiB; columns 1000; page size 100. Không thêm row/cell/correlation cap.

## File chỉnh sửa

- README.md
- backend/.env.example
- backend/package.json
- backend/readme.md
- backend/src/common/domain/cell-comparison.ts
- backend/src/common/domain/cell-policy.ts
- backend/src/common/dto/cell.dto.ts
- backend/src/common/filters/api-exception.filter.ts
- backend/src/config/environment.ts
- backend/src/infrastructure/database/account-cleanup.module.ts
- backend/src/infrastructure/database/account-cleanup.service.ts
- backend/src/infrastructure/idempotency/README.md
- backend/src/main.ts
- backend/src/modules/datasets/datasets.controller.ts
- backend/src/modules/datasets/datasets.module.ts
- backend/src/modules/datasets/datasets.repository.ts
- backend/src/modules/datasets/datasets.service.ts
- backend/src/modules/datasets/readme.md
- backend/src/modules/projects/projects.controller.ts
- backend/src/modules/projects/projects.module.ts
- backend/src/modules/projects/projects.repository.ts
- backend/src/modules/projects/projects.service.ts
- backend/src/modules/projects/readme.md
- backend/src/readme.md
- backend/src/test/e2e/http.e2e-spec.ts
- backend/src/test/integration/modules/auth/auth.integration-spec.ts
- backend/src/test/utils.ts
- eslint.config.mjs
- package-lock.json
- package.json

## File tạo mới

- backend/scripts/test-local-replica.cjs
- backend/src/common/be2-request-log.interceptor.ts
- backend/src/infrastructure/database/be2-records.ts
- backend/src/infrastructure/database/be2-repository.ts
- backend/src/infrastructure/database/recovery-fence.service.ts
- backend/src/infrastructure/idempotency/idempotency.module.ts
- backend/src/infrastructure/idempotency/idempotency.service.ts
- backend/src/infrastructure/storage/original-storage.service.ts
- backend/src/infrastructure/storage/storage-write-barrier.service.ts
- backend/src/infrastructure/storage/storage.module.ts
- backend/src/modules/datasets/csv-upload.interceptor.ts
- backend/src/modules/datasets/dataset-mappers.ts
- backend/src/modules/datasets/import-recovery.service.ts
- backend/src/modules/datasets/snapshot-hash.ts
- backend/src/modules/datasets/snapshot-publisher.service.ts
- backend/src/modules/processing/operation-writer.module.ts
- backend/src/modules/processing/operation-writer.service.ts
- backend/src/modules/projects/project-state.module.ts
- backend/src/modules/projects/project-state.service.ts
- backend/src/modules/projects/workspace-normalization.ts
- backend/src/test/integration/modules/datasets/be2.integration-spec.ts
- backend/src/test/unit/modules/datasets/storage.spec.ts
- backend/src/test/unit/modules/projects/workspace-normalization.spec.ts
- docs/teamwork/be2-sync-contract.md
- docs/teamwork/nguyen-be2.md
- packages/data-core/README.md
- packages/data-core/package.json
- packages/data-core/scripts/mark-esm.cjs
- packages/data-core/src/cell.ts
- packages/data-core/src/codec.ts
- packages/data-core/src/csv.ts
- packages/data-core/src/index.ts
- packages/data-core/src/query.ts
- packages/data-core/src/sync-contract.ts
- packages/data-core/src/types.ts
- packages/data-core/test/esm.test.cjs
- packages/data-core/test/import-codec.test.cjs
- packages/data-core/test/query-limits.test.cjs
- packages/data-core/test/sync.test.cjs
- packages/data-core/tsconfig.esm.json
- packages/data-core/tsconfig.json
