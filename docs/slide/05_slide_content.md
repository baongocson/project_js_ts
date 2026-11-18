# Nội dung slide

## 1. Dashboard 3D

Thông điệp: Phân tích và tiền xử lý dữ liệu CSV

- Đồ án ứng dụng web TypeScript
- Online, offline và quản lý phiên bản

Nguồn: `docs/requirements/problem-statement.md`, `README.md`

Thời gian khung: 20 giây. Luyện nói: 18 giây.

## 2. Bài toán dữ liệu trước phân tích

Thông điệp: Người dùng cần kiểm tra tác động trước khi sửa dữ liệu

- CSV có thể chứa missing, dòng trùng và ngoại lai
- Sửa trực tiếp khiến lịch sử thay đổi khó truy vết
- Mất mạng có thể làm gián đoạn công việc

Nguồn: `docs/requirements/problem-statement.md`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 3. Mục tiêu và phạm vi

Thông điệp: Một workspace cho chuỗi nhập, phân tích và xử lý

- Nhập CSV UTF-8 tối đa 16.000.000 byte
- Bảng có kiểu, EDA, 3D, Preview–Apply và Restore
- Offline và đồng bộ có kiểm tra xung đột
- Chưa có cộng tác nhiều chủ sở hữu hoặc huấn luyện ML

Nguồn: `docs/requirements/problem-statement.md`, `packages/data-core/src/processing.ts`, `docs/api/API.md`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 4. Tác nhân và Use Case

Thông điệp: Người dùng quyết định mọi thay đổi dữ liệu

- Người dùng online quản lý dữ liệu thuộc tài khoản
- Người dùng local tiếp tục xử lý khi mất mạng
- Ollama hỗ trợ gợi ý cho dataset online

Nguồn: `docs/useCase/use-cases.md`, `frontend/src/app/router.tsx`, `backend/src/modules/ai/ai.controller.ts`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 5. Use Case nhập CSV

Thông điệp: CSV hợp lệ tạo snapshot đầu tiên và metadata

- Input: project, CSV và tùy chọn nhập
- Luồng chính: upload, parse typed cells, lưu và publish
- Output: dataset, version, columns và operationId
- Lỗi: quá dung lượng, dữ liệu sai hoặc request xung đột

Nguồn: `docs/api/API.md`, `backend/src/modules/datasets/datasets.controller.ts`, `backend/src/modules/datasets/datasets.service.ts`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 6. Use Case Preview–Apply

Thông điệp: Preview chuẩn bị thay đổi, Apply công bố phiên bản

- Input: baseVersionId và một specification
- Preview trả diff, diagnostics và canApply
- Apply chỉ gửi previewId cùng Idempotency-Key
- Invalid, no-op, hết hạn hoặc stale không tạo version mới

Nguồn: `backend/src/modules/processing/processing.controller.ts`, `backend/src/modules/processing/processing.service.ts`, `frontend/src/features/processing/components/ProcessingPanel.tsx`

Thời gian khung: 30 giây. Luyện nói: 28 giây.

## 7. Yêu cầu phi chức năng

Thông điệp: Các chỉ tiêu là mục tiêu nghiệm thu, cần phép đo riêng

- 20 phiên đăng nhập, 5 người thao tác tích cực
- API thường: 10 request/giây trong 10 phút, p95 ≤1 giây
- LCP ≤2,5 giây, CLS ≤0,1, 3D trung vị ≥30 FPS
- Mất storage: mục tiêu RPO ≤24 giờ, RTO ≤2 giờ

Nguồn: `docs/requirements/non-functional-requirements.md`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 8. Luồng người dùng và nhánh lỗi

Thông điệp: Mỗi bước có trạng thái tiếp tục hoặc dừng rõ ràng

- Đăng nhập, mở project, nhập CSV và phân tích
- Preview hợp lệ mới cho phép Apply
- Hết phiên, lỗi tệp hoặc conflict có thông báo riêng

Nguồn: `frontend/src/app/router.tsx`, `frontend/src/features/processing/hooks/useProcessing.ts`, `frontend/src/features/processing/components/ProcessingPanel.tsx`, `frontend/src/shared/api/http-client.ts`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 9. Kiến trúc tổng thể

Thông điệp: React gọi NestJS, MongoDB giữ dữ liệu phiên bản

- React/Vite cung cấp workspace và trạng thái UI
- NestJS modular monolith xử lý API và quyền sở hữu
- MongoDB replica set hỗ trợ transaction
- Ollama là dịch vụ tùy chọn phía backend

Nguồn: `backend/src/app.module.ts`, `frontend/src/app/router.tsx`, `compose.yaml`, `backend/src/modules/ai/ai.service.ts`

Thời gian khung: 30 giây. Luyện nói: 28 giây.

## 10. Data Core dùng chung

Thông điệp: Online và offline dùng cùng quy tắc xử lý dữ liệu

- TypeScript thuần cho typed cells, query và processing
- Backend dùng snapshot server, frontend dùng snapshot local
- 28 phương pháp gồm edit_cell và TF-IDF
- Cùng engine và dữ liệu là điều kiện đối chiếu kết quả

Nguồn: `packages/data-core/README.md`, `packages/data-core/src/types.ts`, `packages/data-core/src/processing.ts`, `docs/api/API.md`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 11. MongoDB và 12 collection

Thông điệp: Dữ liệu, bản xem trước và receipt có vai trò riêng

- Một project gắn một workspace và tối đa một dataset
- Version có columns và binary chunks
- Preview có diff, operation ghi kết quả đã công bố

Nguồn: `backend/src/infrastructure/database/collection-contracts.ts`

Thời gian khung: 30 giây. Luyện nói: 28 giây.

## 12. Schema và index

Thông điệp: Index bảo vệ tính duy nhất và hỗ trợ truy vấn

- users.emailNormalized: unique
- workspaces.projectId và datasets.projectId: unique
- dataChunks: unique theo versionId + chunkIndex
- Version published: unique theo datasetId + versionNumber

Nguồn: `backend/src/infrastructure/database/collection-contracts.ts`, `backend/src/infrastructure/database/database.provision.ts`

Thời gian khung: 25 giây. Luyện nói: 23 giây.

## 13. Vòng đời phiên bản

Thông điệp: Snapshot published bất biến, Restore tạo phiên bản mới

- Candidate đi qua building và staged trước publish
- Apply kiểm currentVersionId và revision bằng CAS
- Transaction ghi head, history và receipt cùng nhau
- Restore giữ dấu vết nguồn qua restoredFromVersionId

Nguồn: `backend/src/modules/datasets/snapshot-publisher.service.ts`, `backend/src/modules/datasets/datasets.repository.ts`, `backend/src/infrastructure/database/collection-contracts.ts`, `backend/src/modules/history/history.service.ts`

Thời gian khung: 30 giây. Luyện nói: 29 giây.

## 14. API Preview và Apply

Thông điệp: Ví dụ theo hợp đồng mã nguồn, dùng ký hiệu thay ID

- POST /api/v1/datasets/:datasetId/previews
- POST /api/v1/datasets/:datasetId/operations
- 201 thành công, 409 xung đột, 410 hết hạn
- Lỗi chung có code, message, details và requestId

Nguồn: `backend/src/modules/processing/processing.controller.ts`, `frontend/src/features/processing/api/processing-api.ts`, `backend/src/common/filters/api-exception.filter.ts`, `backend/src/modules/processing/dto/processing-response.dto.ts`

Thời gian khung: 30 giây. Luyện nói: 29 giây.

## 15. Luồng gợi ý AI local

Thông điệp: AI xếp hạng ứng viên, người dùng duyệt Preview–Apply

- Input API: group và batch, gắn dataset/version
- Code tính thống kê và tạo ứng viên trên toàn dataset
- Ollama Qwen3 4B xếp hạng, backend validate và dry-run
- Gợi ý không tự ghi dữ liệu hoặc tự Apply

Nguồn: `backend/src/modules/ai/ai.controller.ts`, `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/ollama.service.ts`, `docs/architecture/local-ai.md`

Thời gian khung: 30 giây. Luyện nói: 29 giây.

## 16. Dữ liệu và giới hạn AI

Thông điệp: Không gửi tên cột hoặc nội dung ô tới Ollama

- Gửi evidence thống kê, caution, method và ID ứng viên
- Mỗi batch tối đa 12 ứng viên, tối đa 5 gợi ý
- Một inference/process, timeout mặc định 120 giây/lượt
- Chưa có bằng chứng chi phí vận hành trong repository

Nguồn: `docs/architecture/local-ai.md`, `backend/src/modules/ai/ollama.service.ts`, `backend/src/modules/ai/ai.service.ts`, `docs/reports/local-ai-implementation-2026-11-18.md`

Thời gian khung: 25 giây. Luyện nói: 24 giây.

## 17. Đăng nhập và khôi phục phiên

Thông điệp: Ảnh thật từ acceptance, dữ liệu tài khoản thử

- Router bảo vệ các trang project và hồ sơ
- Access token dùng cho API, refresh qua cookie Secure
- Thông báo lỗi giúp người dùng sửa đầu vào

Nguồn: `frontend/src/app/router.tsx`, `frontend/src/shared/api/http-client.ts`, `backend/src/modules/auth/security/auth-crypto.ts`, `frontend/test/acceptance/ui-quality.spec.ts`

Thời gian khung: 20 giây. Luyện nói: 19 giây.

## 18. Workspace phân tích dữ liệu

Thông điệp: Ảnh thật của Collection trên fixture kiểm thử

- Bảng hiển thị typed cells và trạng thái missing
- EDA tính trên toàn phiên bản, độc lập trang bảng
- Chuyển nhóm xử lý trong cùng workspace

Nguồn: `frontend/test/acceptance/reference-workspace.spec.ts`, `frontend/src/app/hooks/useWorkspace.ts`, `frontend/src/features/analysis/README.md`

Thời gian khung: 20 giây. Luyện nói: 19 giây.

## 19. Giao diện Preview trước và sau

Thông điệp: Fixture uppercase đổi a thành A, b thành B

- Preview hiển thị 2 ô đổi giá trị và 2 dòng cập nhật
- Trạng thái ready cùng diagnostics để người dùng xem xét
- Nút Apply công bố thay đổi sau xác nhận thao tác

Nguồn: `frontend/test/acceptance/processing-workspace.spec.ts`, `frontend/src/features/processing/components/ProcessingPanel.tsx`, `frontend/src/features/processing/hooks/useProcessing.ts`

Thời gian khung: 25 giây. Luyện nói: 24 giây.

## 20. Không gian 3D và lựa chọn điểm

Thông điệp: Ảnh thật WebGL từ bộ acceptance

- Chọn ba cột số làm trục và quan sát điểm
- Hiển thị sampling, missing và outlier rõ ràng
- Có hình chiếu tương thích khi WebGL không khả dụng

Nguồn: `frontend/src/features/analysis/components/WebGLScatter.tsx`, `frontend/test/acceptance/reference-workspace.spec.ts`, `frontend/src/features/analysis/README.md`

Thời gian khung: 20 giây. Luyện nói: 19 giây.

## 21. Cấu trúc frontend

Thông điệp: Chiều import app, features và shared có kiểm tra

- app ghép router, provider và workspace
- features giữ API, hooks, components theo nghiệp vụ
- shared cung cấp transport, UI và style dùng chung
- Typecheck kèm kiểm ranh giới import và vòng phụ thuộc

Nguồn: `docs/reports/frontend-feature-structure-2026-11-18.md`, `frontend/scripts/check-architecture.mjs`, `frontend/src/app/hooks/useWorkspace.ts`

Thời gian khung: 25 giây. Luyện nói: 24 giây.

## 22. Thiết kế UI và hiệu suất frontend

Thông điệp: Theme và trạng thái thao tác có nguồn trong CSS và component

- Font hệ thống, spacing theo token, light/dark/system
- Busy, error, stale và expired điều khiển thao tác Apply
- Báo cáo build: WebGL khoảng 958 KB, gzip 256 KB
- Chưa có bằng chứng đo LCP, CLS hoặc FPS theo NFR

Nguồn: `frontend/src/shared/style/tokens.css`, `frontend/src/features/processing/components/ProcessingPanel.tsx`, `docs/reports/frontend-fix-review-2026-11-18.md`, `docs/requirements/non-functional-requirements.md`

Thời gian khung: 25 giây. Luyện nói: 24 giây.

## 23. Cấu trúc backend

Thông điệp: Controller nhận HTTP, service điều phối, repository lưu trữ

- Auth và ownership kiểm quyền theo tài nguyên
- Projects, Datasets, Processing, History, Analysis và AI
- Hạ tầng dùng chung: database, storage và idempotency
- Validation và exception filter thống nhất lỗi

Nguồn: `backend/src/app.module.ts`, `backend/src/modules/processing/processing.controller.ts`, `backend/src/modules/processing/processing.service.ts`, `backend/src/modules/processing/processing.repository.ts`, `backend/src/common/filters/api-exception.filter.ts`

Thời gian khung: 25 giây. Luyện nói: 24 giây.

## 24. Sequence Preview–Apply xuyên suốt

Thông điệp: Một thao tác được truy vết qua FE, BE và DB

- FE: useProcessing, onlineProcessing và processingApi
- BE: ProcessingController, ProcessingService
- DB: candidate, preview, diff và receipt
- Response quay về PreviewView rồi tải lại workspace

Nguồn: `frontend/src/features/processing/hooks/useProcessing.ts`, `frontend/src/features/processing/api/online-processing.ts`, `frontend/src/features/processing/api/processing-api.ts`, `backend/src/modules/processing/processing.controller.ts`, `backend/src/modules/processing/processing.service.ts`, `backend/src/modules/processing/processing.repository.ts`, `backend/src/modules/datasets/snapshot-publisher.service.ts`, `frontend/src/app/hooks/useWorkspace.ts`, `frontend/src/app/components/WorkspaceView.tsx`

Thời gian khung: 50 giây. Luyện nói: 49 giây.

## 25. Apply, retry và xung đột

Thông điệp: Receipt giúp khôi phục kết quả khi mất response

- ProcessingService.apply kiểm quyền trước replay receipt
- SnapshotPublisherService.publish dùng transaction ngắn
- publishCandidate kiểm CAS, markApplied và append history
- Mất response: retry cùng key, stale hoặc hết hạn có lỗi

Nguồn: `backend/src/modules/processing/processing.service.ts`, `backend/src/modules/datasets/snapshot-publisher.service.ts`, `backend/src/modules/processing/processing.repository.ts`, `backend/src/modules/datasets/datasets.repository.ts`, `frontend/src/features/processing/hooks/useProcessing.ts`

Thời gian khung: 40 giây. Luyện nói: 39 giây.

## 26. Offline và đồng bộ

Thông điệp: IndexedDB giữ snapshot và thao tác đã xác nhận lưu

- Data-core xử lý local, không gọi backend cho mỗi phép biến đổi
- Outbox và checkpoint giữ key, version và ID mapping
- Có mạng và đúng tài khoản mới replay lên API
- Conflict dừng đồng bộ, giữ bản local để xử lý

Nguồn: `frontend/src/features/offline/README.md`, `frontend/public/offline-worker.js`, `frontend/src/features/offline/project-sync.ts`, `frontend/src/features/offline/project-store.ts`

Thời gian khung: 30 giây. Luyện nói: 29 giây.

## 27. Kiểm thử và mức bằng chứng

Thông điệp: Số đếm thuộc từng báo cáo, không cộng thành một suite

- Báo cáo AI: backend unit 71, frontend unit 34, HTTP 52, browser 11
- Báo cáo FE: acceptance HTTPS/replica tạm 53/53
- Báo cáo FE: design-system browser 16/16
- Có .last-run passed, nhưng thiếu log đầy đủ cho mọi số đếm

Nguồn: `docs/reports/local-ai-implementation-2026-11-18.md`, `docs/reports/frontend-fix-review-2026-11-18.md`, `frontend/test-results/acceptance/.last-run.json`, `frontend/test-results/design-system/.last-run.json`, `backend/src/test/readme.md`

Thời gian khung: 30 giây. Luyện nói: 29 giây.

## 28. Docker và Nginx local

Thông điệp: Frontend tĩnh nằm trong container Nginx

- HTTPS localhost:8443 vào Nginx cổng 443
- /api giữ URI và proxy sang backend:3000
- MongoDB replica set cùng volumes lưu dữ liệu
- Có báo cáo health, SPA reload và kiểm tra local

Nguồn: `Dockerfile`, `compose.yaml`, `docker/nginx/default.conf.template`, `docs/nginx-deployment-report.md`

Thời gian khung: 30 giây. Luyện nói: 29 giây.

## 29. Bảo mật và triển khai công khai

Thông điệp: Có cơ chế bảo vệ, chưa nghiệm thu production Internet

- JWT/session, ownership, refresh cookie HttpOnly/Secure
- Origin, rate limit, validation và giới hạn payload
- Production Compose chỉ publish 443, cần domain và TLS thật
- Còn đánh giá trusted proxy, MongoDB auth và backup/restore

Nguồn: `backend/src/modules/auth/security/auth-crypto.ts`, `backend/src/modules/auth/security/ownership.service.ts`, `backend/src/modules/auth/security/auth-mutation.guard.ts`, `compose.production.yaml`, `docs/nginx-deployment-report.md`

Thời gian khung: 25 giây. Luyện nói: 24 giây.

## 30. k6 tải API chưa đạt NFR-18

Thông điệp: 9,393 request/giây, 357 dropped iterations

- Lần chạy lại: 10 phút, tối đa 5 VU, 20 phiên
- 5644 request HTTP 200, lỗi đã gửi 0%
- p95 project 1,011 giây, workspace 1,061 giây, vượt 1 giây
- Generator, proxy, Nest và MongoDB cùng máy, không qua Nginx

Nguồn: `docs/performance/results/2026-11-18T12-32-43-038Z-load/summary.json`, `docs/performance/rerun-2026-11-18.md`, `docs/performance/README.md`

Thời gian khung: 35 giây. Luyện nói: 34 giây.

## 31. k6 dữ liệu và AI warm

Thông điệp: Đạt ngưỡng trong phạm vi fixture và lượt đo local

- Dữ liệu: 20/20 workflow, 12/12 nhóm đạt p95, lỗi 0%
- Import p95 3,611 giây, TF-IDF 6,281 giây, Apply 0,845 giây
- AI Missing batch 0: 20/20 lượt, p95 5,811 giây
- Chưa đo cold start, full multi-batch hoặc chất lượng gợi ý

Nguồn: `docs/performance/results/2026-11-18T12-43-12-297Z-data/summary.json`, `docs/performance/results/2026-11-18T12-45-12-447Z-ai/summary.json`, `docs/performance/rerun-2026-11-18.md`, `docs/performance/README.md`

Thời gian khung: 30 giây. Luyện nói: 29 giây.

## 32. Kết quả, hạn chế và hướng phát triển

Thông điệp: Ưu tiên đóng các khoảng trống đo kiểm trước mở rộng

- Có chuỗi CSV, EDA/3D, Preview–Apply, History và local sync
- Đã có AI local và đóng gói Nginx, bằng chứng theo từng phạm vi
- Ưu tiên đo lại tải bằng generator riêng và đo LCP/CLS/FPS
- Tiếp theo: diễn tập backup/restore, AI cold start và deploy public

Nguồn: `docs/reports/frontend-fix-review-2026-11-18.md`, `docs/reports/local-ai-implementation-2026-11-18.md`, `docs/performance/rerun-2026-11-18.md`, `docs/nginx-deployment-report.md`, `docs/requirements/non-functional-requirements.md`

Thời gian khung: 25 giây. Luyện nói: 24 giây.

## 33. Kết luận

Thông điệp: Thay đổi dữ liệu có xem trước, phiên bản và truy vết

- Preview giúp người dùng kiểm tra tác động
- Version và receipt kiểm soát publish, retry và restore
- Bằng chứng local đi kèm giới hạn kiểm chứng

Nguồn: `backend/src/modules/processing/processing.service.ts`, `backend/src/modules/datasets/snapshot-publisher.service.ts`, `docs/performance/rerun-2026-11-18.md`, `docs/nginx-deployment-report.md`

Thời gian khung: 20 giây. Luyện nói: 19 giây.
