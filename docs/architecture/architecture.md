# Kiến trúc và phạm vi khung

> Cập nhật BE-1 ngày 16/11/2026: Auth/Users đã có persistence, global AuthGuard/OwnershipGuard, rate limit và cleanup tài khoản. 20 API nghiệp vụ còn lại vẫn scaffold. Trạng thái và interface tích hợp chi tiết tại [BE-1 bàn giao](../plans/be1-handoff.md).

Nguồn chuẩn: [API.xlsx](../api/API.xlsx), [ERD.html](../erd/ERD.html).

Backend NestJS + Express, modular monolith. Frontend React + Vite + TypeScript. API prefix /api/v1. Controller → Service → Repository → MongoDB. Module chỉ export boundary cần chia sẻ; tránh import vòng. Đã có DTO/validation và 12 schema/validator/index MongoDB. BE-1 triển khai 7 API Auth/Users cùng global JWT/session/ownership và account cleanup; 20 route nghiệp vụ khác vẫn trả501 sau bảo vệ. Không ghi database từ các service pending. Chi tiết vận hành và kiểm thử Atlas tại [database.md](../database/database.md).

Cấu trúc module hiện có controller/service/guard/repository/module đặt phẳng, kèm security/, dto/ và README. AuthGuard/OwnershipGuard đã gắn toàn cục; Auth/Users có CRUD cần thiết, các guard/repository còn lại vẫn là scaffold chưa dùng cho nghiệp vụ. Schema vẫn tập trung trong infrastructure/database, không tạo schema trùng trong module.

Kiểm thử backend tập trung tại backend/src/test: unit chia common/modules/contracts, e2e có nhánh modules/auth và suite HTTP liên module, integration nằm dưới infrastructure/database; dùng setup.ts/utils.ts chung. Chỉ tạo nhánh có test thực tế. Jest biên dịch test TypeScript với kiểm tra kiểu; Nest Testing tạo app/module, Supertest gửi request HTTP. Test không được đưa vào build production.

Frontend có app/providers/router (React Router), features theo tính năng và shared/api/ui/style. Chiều import: app → features → shared, app → shared; kiểm tự động khi typecheck. main.tsx giữ nhiệm vụ mount/CSS, App.tsx gọi router. Health là phần hạ tầng của app; các feature nghiệp vụ còn khung. Playwright kiểm trang hệ thống trên Chromium qua Vite proxy và backend Nest thật với database=false; test lỗi HTTP/mạng dùng interception có kiểm soát. Xem [frontend README](../../frontend/README.md) và [trạng thái refactor](../refactor/refactor-status.md).

## Quyền sở hữu collection dự kiến

- Users: users
- Auth: authSessions
- Projects: projects, workspaces
- Datasets: datasets, datasetVersions, versionColumns, dataChunks
- Processing: processingPreviews, previewChanges, processingOperations
- History: đọc processingOperations qua service; restore gọi luồng publish dùng chung
- Infrastructure: idempotencyRecords
- Analysis: đọc snapshot published qua DatasetsService, không cần collection riêng

Mỗi collection có một nơi sở hữu ghi. Định nghĩa persistence tập trung tại infrastructure/database/collection-contracts.ts để dùng chung giữa Mongoose và BSON validator. Module nghiệp vụ giữ quyền sở hữu repository/service ghi theo danh sách trên. autoIndex/autoCreate tắt; db:provision tạo index có kiểm soát, startup chỉ xác minh. FK/transaction nghiệp vụ ngoài Auth/Users vẫn cần BE-2/3 triển khai; dùng transaction fence BE-1 khi ghi để không tái tạo dữ liệu sau logout/delete.

## Ràng buộc cần giữ khi bổ sung nghiệp vụ

- Không tin ownerId/userId từ body; guard kiểm tra JWT, session và ownership.
- Published snapshot bất biến; preview tạo candidate staged; Apply chỉ nhận previewId.
- Import/Apply/restore dùng transaction ngắn + CAS revision + receipt idempotency + lease/fence.
- MongoDB cần replica set hỗ trợ transaction. Không upload/tính thống kê bên trong transaction.
- API version khác dataset version. Restore tạo version mới.
- CSV <=16.000.000 byte; chunk <=4 MiB; JSON <=1 MiB; encoded snapshot <=100 MiB.
- Chunk binary không tự hỗ trợ index giá trị ô; cần benchmark filter/sort/correlation.
- Một method/preview; filter UI không giới hạn scope xử lý; statisticsScope whole-columns.
- Xóa thật chỉ trả 204 sau khi dọn xong; chặn worker publish sau delete.

## Thứ tự tiếp theo

1. Tích hợp frontend auth HTTPS và nối session/ownership/fence BE-1 vào các service mới.
2. Project + workspace + import + đọc bảng.
3. Preview edit_cell + Apply + history + restore.
4. Kiểm thử retry, concurrent Apply, rollback, expiration, cross-owner và cleanup.
5. Bổ sung analysis, 3D và các thuật toán còn lại.
