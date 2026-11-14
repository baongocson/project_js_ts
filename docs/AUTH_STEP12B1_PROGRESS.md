# Auth — Bước 12B1: MongoDB persistence boundary

## Cơ sở
- Base: branch `codex/auth-session`, gồm Offline MVP `abae4ac` và Auth Core Step12A.
- Không thay đổi API, DTO, MongoDB validator/index, hoặc 12 collections.
- Bước này **không kích hoạt các API Auth**. Register/login/refresh/logout vẫn trả 501; không báo chúng đã chạy.

## Thay đổi
1. Sửa `scrypt` dùng callback Promise giữ rõ `N=32768, r=8, p=1, maxmem=64MiB`; không dùng default ngầm như bản sửa thủ công tạm thời.
2. `auth.repository.ts`: thao tác typed collection `users`, `authSessions`, tạo user và session, truy vấn user, tìm session còn hạn, CAS rotation, revoke.
3. DatabaseModule global để cung cấp cùng Mongoose connection cho provider AuthRepository khi `DATABASE_ENABLED=true`. Constructor optional cho môi trường unit/HTTP-contract test với Database disabled, khi gọi database sẽ trả 503, không giả lập thành công.
4. Thêm test độc lập không cần Atlas để xác nhận điều kiện CAS, trạng thái phiên và cấu trúc document.

## Kiểm chứng trên máy người dùng
```
npm run check:no-any
npm run typecheck
npm run build
npm run test:auth-core -w backend
npm run test:auth-repository -w backend
npm run test:contracts -w backend
npm run test:http -w backend
```

Các test repository kiểm tra lệnh đối với mock collection, **không** chứng minh ghi MongoDB thực. Sau khi 12B2 nối controller/service, phải thêm test integration Atlas test database tách biệt và test HTTP thật.

## Tiếp theo — 12B2
Nối Register, Login, Refresh, Logout vào Repository + Service, cấu hình secret ngoài source và HTTP-only cookie. Origin allowlist + rate limiting; xử lý 409 duplicate, 401 auth sai, token reuse sau rotation, logout idempotent. Chỉ bật API sau khi kiểm tra bảo mật và cập nhật HTTP tests hiện kỳ vọng 501.
