# Auth — BE-1

Đã triển khai register/login/refresh/logout khi DATABASE_ENABLED=true. AuthController là Public đối với JWT nhưng có AuthMutationGuard kiểm Origin và rate limit trước pipe. Khi database tắt, service tiếp tục trả 501 sau validation cho các test DTO; route bảo vệ không tự bỏ JWT vì DB tắt.

## Luồng

Controller → validation parser → AuthService → AuthRepository → MongoDB. Register tạo user với bcryptjs cost 12, unique emailNormalized và response projection. Register không tự đăng nhập/cấp session. Login kiểm mật khẩu, user active, tạo session qua transaction parent fence rồi cấp JWT 900 giây và refresh cookie. Refresh lookup SHA256 hash, rotation CAS trong transaction giữ nguyên expiresAt tuyệt đối 7 ngày. Logout revoke hash rồi clear cookie; cookie thiếu/không hợp lệ/đã revoke vẫn 204.

AuthGuard và OwnershipGuard đăng ký APP_GUARD qua useExisting trong AuthModule, theo đúng thứ tự. AuthModule global export AuthGuard, AuthService, OwnershipService. Public decorator chỉ dùng cho Auth/health. Principal do guard tạo, không lấy userId/ownerId từ body.

## File

- auth.controller.ts: status, cookie HttpOnly/Secure/SameSite=Lax/Path=/api/v1/auth; không trả refresh token trong JSON.
- auth.service.ts: điều phối bcrypt, projection, Origin, login failure limit và token.
- auth.repository.ts: users/authSessions; transaction tạo/rotate session có write fence với user active; không trả thẳng document ra HTTP.
- auth.guard.ts: kiểm JWT, exp/sub/sid/iss/aud, session chưa revoke/hết hạn và user active.
- auth.module.ts: DI và global guards.
- dto/: body contract/parser giữ nguyên; security/: primitives, context, token settings, rate limit và ownership.

## Cấu hình và test

Chạy npm run auth:init-secret -w backend trước khi bật DB nếu chưa có secret; giữ backend/.env riêng, không commit. Rate limit theo biến trong .env.example, một process, không distributed. CORS/Origin exact allowlist; proxy mặc định không được tin X-Forwarded-For. Cookie Secure phải nghiệm thu browser qua HTTPS; test Supertest kiểm header và truyền cookie tường minh, không thay thế kiểm cookie jar của browser.

Từ gốc: npm run lint, npm run typecheck, npm run test:unit, npm run test:e2e:backend, npm run test:be1 -w backend. Lệnh cuối dùng Atlas thật, tạo/dọn tài khoản thử riêng; không drop/provision database. Xem docs/plans/be1-handoff.md.
