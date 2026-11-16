# BE-1 integration với MongoDB thật

auth.integration-spec.ts khởi tạo AppModule thật với DATABASE_ENABLED=true, không override auth/ownership. Kiểm bcrypt/register/duplicate/projection, login lỗi, Origin, refresh rotation cạnh tranh/expiry, Users patch, JWT/session/logout, quyền project/dataset/version/preview, transaction fence và cascade đủ collection/file gốc. Kiểm cleanup lỗi503 và tạo mới cleanup service để tiếp tục recovery từ marker bền vững.

owned-fixture.ts tạo graph đủ dữ liệu phụ thuộc với ID/file riêng cho tài khoản của lượt test. Chỉ dọn đúng graph/tài khoản đó. Không drop/provision database hoặc tắt validator. Secret test ngẫu nhiên được giữ trong process rồi khôi phục; worker account cleanup của app được tắt trong test để không quét tài khoản có sẵn. Ca recovery gọi dọn đúng user thử bằng service instance mới; không chạy sweep toàn database để tránh tác động tài khoản khác.

Từ gốc: npm run test:be1 -w backend hoặc npm run test:integration. Cần Atlas hiện có, quyền test và network. Supertest kiểm cookie header Secure nhưng truyền cookie thủ công qua HTTP; chưa chứng minh browser HTTPS cookie flow. Không log credentials. Test failure không được skip thành PASS.
