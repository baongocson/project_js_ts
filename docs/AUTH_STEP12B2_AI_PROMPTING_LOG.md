# AI Prompting Log — Auth API 12B2

- Input: `Auth_12B2_Source.zip` (Auth controller/service/repository, database, common validation, API.md, dto-contract.md) từ người dùng.
- Yêu cầu: 4 Auth API thực tế bám NestJS modular monolith, MongoDB Atlas, 27 routes, TypeScript no-any, cookie HttpOnly/Secure, không lộ thông tin nhạy cảm.
- Kiểm tra hợp đồng: tài liệu API đã chốt bcrypt cost 12; Auth Core tiền nhiệm dùng scrypt. Quyết định chọn `bcryptjs` 12 rounds trong AuthService, giữ scrypt helper cũ không sử dụng cho login.
- Thiết kế: controller trả status đúng; service kiểm tra Origin/lifecycle; repository CAS rotation; session expiresAt tuyệt đối; mapper public user có sẵn; không đổi schema.
- Rủi ro: chưa kiểm thử Atlas thật; RateLimitGuard và Ownership Guard chưa triển khai; HTTP skeleton khi DB disabled vẫn trả 501.
- Bằng chứng kiểm thử: **chưa có xác nhận PASS trên Windows**. Người vận hành chạy `npm install bcryptjs@^3.0.3 -w backend` và toàn bộ lệnh trong `AUTH_STEP12B2_HANDOFF.md`, gửi log để đối chiếu.
