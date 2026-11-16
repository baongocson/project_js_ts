# Test e2e/modules

Nội dung: auth/.

Nhánh tương ứng phần code được kiểm; hợp đồng liên module được giữ riêng trong unit/contracts. Mỗi spec giữ các input/assertion hiện có sau khi chuyển cấu trúc; không tạo nghiệp vụ giả để test PASS.

Chạy từ gốc: `npm run test:e2e:backend`. Không cần database. Luồng và setup chi tiết xem backend/src/test/readme.md.
