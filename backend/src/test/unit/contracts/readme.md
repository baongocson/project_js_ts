# Test unit/contracts

Nội dung: filter-workspace.spec.ts; profile-project.spec.ts; query.spec.ts; resource-id.spec.ts; restore-retry.spec.ts.

Nhánh tương ứng phần code được kiểm; hợp đồng liên module được giữ riêng trong unit/contracts. Mỗi spec giữ các input/assertion hiện có sau khi chuyển cấu trúc; không tạo nghiệp vụ giả để test PASS.

Chạy từ gốc: `npm run test:unit`. Không cần database. Luồng và setup chi tiết xem backend/src/test/readme.md.
