# Test integration/infrastructure/database

Nội dung: database-health.integration-spec.ts; database.integration-spec.ts.

Nhánh tương ứng phần code được kiểm; hợp đồng liên module được giữ riêng trong unit/contracts. Mỗi spec giữ các input/assertion hiện có sau khi chuyển cấu trúc; không tạo nghiệp vụ giả để test PASS.

Chạy từ gốc: `npm run test:integration`. Kết nối Atlas thật, chạy riêng khi cần; chưa chạy lại trong refactor này. Luồng và setup chi tiết xem backend/src/test/readme.md.
