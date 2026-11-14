# DatasetsModule

## Trách nhiệm

- Các route liên quan: `POST /projects/:projectId/datasets; GET /datasets/:id/versions/:id và /rows` dưới prefix `/api/v1`.
- Collection sử dụng: `datasets, datasetVersions, versionColumns, dataChunks`.
- Cấu trúc NestJS: controller (nhận/validate HTTP) → service (nghiệp vụ) → repository (truy cập DB, khi được triển khai).

## Trạng thái tại commit 1067712 và bản vá offline

Đã có Controller, DTO/validation, Module và Service placeholder. **Chưa có nghiệp vụ hoạt động**; request hợp lệ vẫn trả `501 NOT_IMPLEMENTED`. Không mô tả module là hoàn thành khi chưa thay Service và chạy test nghiệp vụ thực tế.

## Triển khai còn thiếu

Chưa có parser multipart CSV, typed codec/chunk store, version publisher. CSV <=16.000.000 bytes; không tự thay đổi dữ liệu gốc.

## Kiểm thử và tiêu chí nghiệm thu

1. Unit: pure validators/policies, dữ liệu hợp lệ và edge cases.
2. HTTP contract: đúng method/path, request DTO, response DTO, status/error, guard.
3. Integration: repository với DB test riêng và rollback/các unique index.
4. E2E: thực hiện đường đi UI → API → DB → UI khi luồng đã có đầy đủ.
5. Ghi lệnh, phiên bản, kết quả pass/fail vào báo cáo; không đánh dấu đã test nếu chưa chạy.

## Nguồn hợp đồng

- `docs/API.md` (27 endpoints)
- `docs/dto-contract.md` (DTO, D01–D26)
- `docs/ERD.html` và `docs/database.md` (schema/index)

**Ràng buộc:** TypeScript không dùng `any`; không tự thay đổi schema hoặc public API đã chốt.
