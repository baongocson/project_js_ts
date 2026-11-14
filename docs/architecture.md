# Kiến trúc và phạm vi khung

Nguồn chuẩn: D:\JS_TS\project_js_ts\docs\API.xlsx, D:\JS_TS\project_js_ts\docs\ERD.html

Backend NestJS + Express, modular monolith. Frontend React + Vite + TypeScript. API prefix /api/v1. Controller → Service → Repository → MongoDB. Module chỉ export service cần chia sẻ; tránh import vòng. Đã có DTO/validation và 12 schema/validator/index MongoDB thật; toàn bộ 27 route nghiệp vụ vẫn trả 501. Chưa có guard/auth và persistence nghiệp vụ; không ghi database từ route placeholder. Chi tiết vận hành và kiểm thử Atlas tại [database.md](database.md).

## Quyền sở hữu collection dự kiến

- Users: users
- Auth: authSessions
- Projects: projects, workspaces
- Datasets: datasets, datasetVersions, versionColumns, dataChunks
- Processing: processingPreviews, previewChanges, processingOperations
- History: đọc processingOperations qua service; restore gọi luồng publish dùng chung
- Infrastructure: idempotencyRecords
- Analysis: đọc snapshot published qua DatasetsService, không cần collection riêng

Mỗi collection có một nơi sở hữu ghi. Định nghĩa persistence tập trung tại infrastructure/database/collection-contracts.ts để dùng chung giữa Mongoose và BSON validator. Module nghiệp vụ giữ quyền sở hữu repository/service ghi theo danh sách trên. autoIndex/autoCreate tắt; db:provision tạo index có kiểm soát, startup chỉ xác minh. FK logic và các transaction nghiệp vụ chưa triển khai.

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

1. Triển khai auth/session/ownership trên DTO và schema/index đã có.
2. Project + workspace + import + đọc bảng.
3. Preview edit_cell + Apply + history + restore.
4. Kiểm thử retry, concurrent Apply, rollback, expiration, cross-owner và cleanup.
5. Bổ sung analysis, 3D và các thuật toán còn lại.
