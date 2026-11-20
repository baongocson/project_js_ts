# HTTP và health dùng chung

http-client.ts đọc VITE_API_BASE_URL, mặc định /api/v1, chuẩn hóa dấu / khi ghép URL và dùng fetch. requestJson<T> chuyển RequestInit (bao gồm signal) tới fetch, giữ thông báo lỗi HTTP `API trả mã <status>`, parse JSON khi thành công. T chỉ kiểm ở compile time, chưa phải runtime schema validator.

health.ts gọi GET health và khai báo HealthResponse. Health là endpoint hạ tầng; không đặt hợp đồng auth/project vào đây. index.ts export transport, getHealth và type response.

HTTP client gắn Bearer token qua `configureAuthTransport`, xử lý refresh khi gặp 401 và chỉ phát lại request đọc hoặc mutation được đánh dấu an toàn/có Idempotency-Key. Account binding chặn phát lại dưới tài khoản khác. Auth service quản lý phiên và refresh; transport không chứa quy tắc nghiệp vụ của project/dataset. Không lưu secret trong biến VITE_*.

Luồng: Hook → Service khi cần → API của feature → requestJson → fetch. Component và service không gọi requestJson trực tiếp. Kiểu T chỉ được kiểm tra lúc biên dịch; validation dữ liệu endpoint thuộc API/service theo trách nhiệm.

E2E kiểm health qua backend thật, lỗi HTTP và mạng; xem test/E2E/README.md. Chạy `npm run test:e2e:frontend` từ gốc repo.
