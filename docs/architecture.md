# Kiến trúc và phạm vi khung

Nguồn chuẩn: D:\JS_TS\project_js_ts\docs\API.xlsx, D:\JS_TS\project_js_ts\docs\ERD.html

Backend NestJS + Express, modular monolith. Frontend React + Vite + TypeScript. API prefix /api/v1. Controller → Service → Repository → MongoDB. Module chỉ export service cần chia sẻ; tránh import vòng. Chưa có guard/DTO nghiệp vụ, schema hay index thật; toàn bộ 27 route nghiệp vụ trả 501. Không triển khai auth giả, không ghi database từ route placeholder.

## Quyền sở hữu collection dự kiến

- Users: users
- Auth: authSessions
- Projects: projects, workspaces
- Datasets: datasets, datasetVersions, versionColumns, dataChunks
- Processing: processingPreviews, previewChanges, processingOperations
- History: đọc processingOperations qua service; restore gọi luồng publish dùng chung
- Infrastructure: idempotencyRecords
- Analysis: đọc snapshot published qua DatasetsService, không cần collection riêng

Mỗi collection có một nơi sở hữu ghi. Chưa tạo schema tối giản dễ khiến hiểu nhầm rằng đã đủ ERD. Khi triển khai cần đủ field, unique/partial index và validator theo ERD; autoIndex tắt, phải có bước tạo index có kiểm soát.

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

1. Hoàn thiện DTO, schema/index và auth/session/ownership.
2. Project + workspace + import + đọc bảng.
3. Preview edit_cell + Apply + history + restore.
4. Kiểm thử retry, concurrent Apply, rollback, expiration, cross-owner và cleanup.
5. Bổ sung analysis, 3D và các thuật toán còn lại.
