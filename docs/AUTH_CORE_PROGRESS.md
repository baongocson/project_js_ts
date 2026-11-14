# Bước 12A — Auth Core (chưa bật API nghiệp vụ)

## Scope đã triển khai
- `backend/src/modules/auth/security/auth-crypto.ts`: hash mật khẩu bằng scrypt với salt ngẫu nhiên; verify; tạo refresh token 256-bit; lưu SHA-256 hash của refresh token; absolute refresh TTL 7 ngày; access JWT HS256 với `iss`, `aud`, `sub`, `sid`, 15 phút và xác minh chữ ký.
- `backend/test/auth-crypto.test.cjs`: test hash/verify, mật khẩu không bị chuẩn hóa, salt độc lập, refresh entropy/hash/expiry, JWT chữ ký/audience/issuer/expiry và từ chối `alg=none`.
- Không thêm thư viện ngoài; dùng `node:crypto` trên Node >=22.12.

## Chưa hoàn thành — KHÔNG tuyên bố Auth đã chạy
- 4 endpoint register/login/refresh/logout **vẫn trả 501**. Chưa có repository MongoDB, atomic refresh rotation, OriginGuard, rate limit, cookie flags, ownership guard, access token middleware.
- `DATABASE_ENABLED=false` vẫn chạy bản demo offline, chưa xác thực. Không gửi token hoặc mật khẩu qua API cho tới khi lớp HTTP và session được triển khai trọn vẹn.
- Cần test integration thực sự với Atlas/dev DB, test race refresh và test 401/403; không dùng production secret cho test.
- `ACCESS_TOKEN_SECRET` chưa được thêm vào cấu hình runtime; khi tích hợp API thật phải tạo bằng CSPRNG và lưu trong `.env` riêng, KHÔNG commit.

## Cách kiểm tra
```
npm run check:no-any
npm run typecheck
npm run build
npm run test:auth-core -w backend
npm run test:contracts -w backend
npm run test:http -w backend
```

## Kế tiếp — 12B
1. AuthRepository kết nối collection `users`, `authSessions` đã chốt; không đổi BSON schema.
2. Register/Login với các status, projection đúng API.md; không lộ password hash.
3. Refresh rotation CAS theo `refreshTokenHash`, chống double-use, cố định hạn 7 ngày; Logout revoke session.
4. Origin allowlist, rate limits, `Secure` cookie theo môi trường HTTPS, JwtAuthGuard, ownership; cập nhật HTTP tests (27 endpoint không còn đồng loạt 501).
