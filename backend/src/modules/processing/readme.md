# ProcessingModule — BE-3B

Đã triển khai 3 API: `POST /datasets/:datasetId/previews`, `GET /datasets/:datasetId/previews/:previewId`, `POST /datasets/:datasetId/operations`.

- `ProcessingService` kiểm tra ownership, version/revision, engine result và quyền ghi; candidate không publish khi tạo preview.
- `ProcessingRepository` lưu preview và chỉ mục thay đổi có phân trang. TTL 30 phút, background cleanup và BE-2 orphan candidate recovery.
- Apply sử dụng `SnapshotPublisherService` (BE-2) để commit version, operation, preview state và idempotency receipt qua transaction.
- Bộ 27 phương pháp nằm trong `@dashboard/data-core`, dùng chung CJS/ESM.
- Không dùng placeholder guard `processing.guard.ts` để xác thực; các route đi qua auth toàn cục và `OwnershipService`.

**Kiểm thử đã đạt trên máy người triển khai trước audit:** Data Core 62, Backend Unit 54, Backend E2E 49; MongoDB integration 5/5 suites.
**Sau audit:** thay đổi engine và thêm tests (xem `docs/teamwork/be3-final-handoff.md`); phải chạy lại toàn bộ test trên máy local trước PR.

**Giới hạn cần phối hợp:** offline outbox chưa nối UI/IndexedDB E2E; 27 phương pháp chưa có đầy đủ ca HTTP boundary; performance trên snapshot lớn chưa chứng minh toàn diện.
