# Auth API 12B2 — HTTP + MongoDB (bản vá cần xác minh trên máy)

## Nguồn và giới hạn
- Dựa trực tiếp trên `Auth_12B2_Source.zip` được bàn giao 15/11/2026.
- Không chỉnh sửa ERD, 12 collections, 27 route hoặc DTO D01–D26.
- Bốn route Auth chuyển sang logic thật **chỉ khi DATABASE_ENABLED=true**; khi tắt DB, giữ 501 cho hợp đồng HTTP skeleton cũ. Khi chạy thực tế, phải kiểm tra hoạt động với Atlas (chưa xác minh từ môi trường tạo patch).
- Password dùng **bcryptjs 12 rounds**, phù hợp `docs/API.md`, thay vì `scrypt` của Auth Core trước. `auth-crypto.ts` giữ các hàm JWT/refresh; `hashPassword/verifyPassword` scrypt cũ không còn được AuthService sử dụng.
- Access JWT HS256, TTL 900 giây; refresh opaque 256-bit, lưu hash SHA256, cookie HttpOnly/Secure/SameSite=Lax/Path=/api/v1/auth; Mongo session tuyệt đối 7 ngày; rotation CAS không gia hạn hạn tuyệt đối.
- Không trả `passwordHash`, `refreshTokenHash`, `rotationCounter`, `sessionId` qua response.
- Auth mutation yêu cầu Origin khớp `FRONTEND_ORIGIN` chính xác khi DB bật. Login sai email/mật khẩu dùng chung một lỗi.

## Cài đặt
Sau khi giải nén patch ở gốc repo (đúng nhánh `codex/auth-session`), chạy:

```cmd
npm install bcryptjs@^3.0.3 -w backend
npm run check:no-any
npm run typecheck
npm run build
npm run test:auth-core -w backend
npm run test:auth-repository -w backend
npm run test:auth-service -w backend
npm run test:contracts -w backend
npm run test:http -w backend
```

`npm install` cũng cập nhật `package-lock.json`: **phải commit lockfile** cùng thay đổi mới. Không chạy `npm ci` trước khi lockfile được cập nhật.

## Cấu hình cục bộ (không đẩy Git)
Trong `backend/.env` (hoặc biến môi trường tiến trình):

```ini
DATABASE_ENABLED=true
MONGODB_URI=<URI Atlas của bạn, KHÔNG gửi vào chat/Git>
MONGODB_DB_NAME=dashboard_3d
FRONTEND_ORIGIN=http://localhost:5173
AUTH_ACCESS_TOKEN_SECRET=<chuỗi ngẫu nhiên bí mật, >=32 UTF-8 bytes>
```

Khuyến nghị tạo secret bằng `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`, chỉ đặt vào `.env` cá nhân, không đăng lên chat. URI cần mật khẩu mới nếu credential cũ đã lộ.

## Những việc **chưa** đạt và không được báo hoàn thành
- Chưa xác minh 4 API với Atlas thật; cần HTTP + Atlas integration tests (dùng DB/test users riêng).
- `Origin` đã kiểm tra trong service nhưng chưa triển khai RateLimitGuard theo tài liệu (`API.md` yêu cầu 429), chưa có hệ thống phân tán/chống brute force.
- Chưa có JWT Guard kiểm tra token và session cho Users/Projects/Datasets/Processing/History.
- Cookie `Secure` trên môi trường local HTTP có thể có khác biệt giữa trình duyệt; production bắt buộc HTTPS.
- Bộ HTTP skeleton 38 tests vẫn thử `DATABASE_ENABLED=false` và xác nhận 501. Chúng **không** chứng minh các API Auth mới chạy thật.
- Chưa triển khai kiểm thử API qua HTTP DB-enabled, refresh rotation concurrency thật, kiểm thử rate limiting và login attempts.

## Diễn giải test
- `auth-service.test.cjs`: mô phỏng repository, kiểm tra register/login/refresh/logout và xử lý lỗi; **không** thay thế Atlas integration test.
- Auth khi DB tắt trả 501 như bản gốc; các API khác vẫn trả 501.
- Chỉ tạo commit sau khi test trên Windows PASS. Chưa merge vào main.
