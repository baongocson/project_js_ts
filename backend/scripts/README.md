# Backend setup scripts

`init-auth-secret.cjs` tạo secret ngẫu nhiên 48 byte trong backend/.env nếu cấu hình hiệu lực chưa có secret. Ưu tiên biến tiến trình → backend/.env → atlas-credentials.env, tương ứng runtime. Không in secret, không sửa credential Atlas, không thay secret hợp lệ có sẵn. Nếu secret đã cấu hình nhưng quá ngắn, lệnh báo lỗi để tránh tự xoay khóa làm mất hiệu lực phiên.

Từ gốc repo chạy `npm run auth:init-secret -w backend`. Không commit backend/.env; không gửi giá trị secret trong chat hoặc screenshot. Test dùng secret ngẫu nhiên riêng và khôi phục môi trường sau khi kết thúc.
