# AI Prompting Log — Auth Core

- Input: Tiếp tục dự án trên nhánh `codex/auth-session`, bảo toàn API/DTO/ERD đã chốt, TS không dùng `any`, test toàn bộ.
- Yêu cầu triển khai: Auth core tách khỏi HTTP và DB; Node built-in crypto, password salted hash, opaque 256-bit refresh, hashed storage, JWT 15 phút, tests.
- Kiểm soát: Không giả vờ 4 API đã hoàn thành; 27 route vẫn giữ behavior 501 ở giai đoạn này, chưa có DB calls hoặc secret trong Git.
- Đầu ra: auth-crypto.ts, auth-crypto.test.cjs, script test, tiến độ và hướng dẫn.
- Kiểm thử: xem log thử nghiệm tại thời điểm chạy ở máy phát triển; chạy lại ở máy người dùng trước commit.
