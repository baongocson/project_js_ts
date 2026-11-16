# Kiểm thử frontend

`E2E/` chứa test trình duyệt Playwright cho hành vi đang có. Cấu hình ở playwright.config.ts; tsconfig.test.json kiểm kiểu test và cấu hình. Chưa có unit runner riêng vì nghiệp vụ frontend chưa được triển khai.

Từ gốc repo:

```powershell
npm run test:e2e:install -w frontend  # một lần: tải Chromium
npm run test:e2e:frontend
```

Script build frontend và backend trước khi chạy. Playwright tự mở Nest trên 4300 với DATABASE_ENABLED=false và Vite preview trên 4173, proxy /api về Nest thử. Không dùng server phát triển đang chạy, không kết nối Atlas, không đọc/ghi dữ liệu nghiệp vụ; hai cổng thử phải rảnh. Biến VITE_API_BASE_URL lúc build của bộ test được cố định /api/v1 để dùng đúng proxy thử.

Lỗi HTTP/mạng được mô phỏng riêng trong browser; test kết nối thành công đi qua backend thật. Xem README trong E2E để biết giới hạn. Kết quả/trace nằm ở test-results và bị Git bỏ qua; production bundle không chứa test.
