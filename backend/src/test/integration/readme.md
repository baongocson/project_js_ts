# Integration backend

infrastructure/database/database.integration-spec.ts kiểm schema/index/validator/transaction trên Atlas; database-health.integration-spec.ts kiểm health với kết nối thật. Các file chỉ được chuyển vị trí và cập nhật import trong refactor, giữ nguyên assertion và rollback/cleanup.

Luồng: đọc môi trường → kết nối database đã provision → kiểm hợp đồng → dữ liệu thử → rollback/xóa đúng bản ghi thử → đóng kết nối. Không provision, drop collection hoặc in credentials từ test.

Từ gốc: npm run test:integration. Chạy riêng khi cần xác minh database thật; không tự chạy trong unit/E2E mặc định. Chưa chạy lại Atlas ở đợt refactor cấu trúc này.

BE-1 thêm modules/auth/auth.integration-spec.ts, kiểm HTTP+Atlas thật, dùng tài khoản/graph/file thử riêng. Chạy npm run test:be1 -w backend để chạy riêng. Integration đã được chạy lại trong đợt BE-1; xem docs/plans/be1-handoff.md cho kết quả mới nhất thay vì trạng thái refactor lịch sử phía trên.
