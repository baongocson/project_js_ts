# HTTP và health dùng chung

http-client.ts đọc VITE_API_BASE_URL, mặc định /api/v1, chuẩn hóa dấu / khi ghép URL và dùng fetch. requestJson<T> chuyển RequestInit (bao gồm signal) tới fetch, giữ thông báo lỗi HTTP `API trả mã <status>`, parse JSON khi thành công. T chỉ kiểm ở compile time, chưa phải runtime schema validator.

health.ts gọi GET health và khai báo HealthResponse. Health là endpoint hạ tầng; không đặt hợp đồng auth/project vào đây. index.ts export transport, getHealth và type response.

Giữ hành vi trước refactor: chưa tự đính Bearer token, chưa refresh token hoặc xử lý cookie xác thực. Không lưu secret trong biến VITE_*. Luồng có xác thực sẽ được bổ sung khi nghiệp vụ đó được triển khai.

E2E kiểm health qua backend thật, lỗi HTTP và mạng; xem test/E2E/README.md. Chạy `npm run test:e2e:frontend` từ gốc repo.
