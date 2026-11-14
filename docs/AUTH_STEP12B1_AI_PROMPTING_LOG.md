# AI prompting log — Auth Step12B1

- Yêu cầu: tiếp tục nhánh `codex/auth-session` sau 12A, không `any`, không đổi API/ERD, không dùng DB credentials trong code, giữ nguyên trạng thái endpoint chưa triển khai nếu chưa đủ bảo mật.
- Thay đổi: sửa typing/cost scrypt; typed MongoDB repository cho users/authSessions; CAS refresh, revoke và unit tests giả lập collection.
- Kiểm chứng: máy người dùng phải chạy check:no-any, typecheck, build, test:auth-core, test:auth-repository, test:contracts, test:http. Không tuyên bố Atlas integration pass tại bước này.
- Chưa làm: controller/service hoạt động, Origin/rate limit, cookie, secret provisioning, E2E, Atlas integration.
