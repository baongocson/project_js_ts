# E2E backend

modules/auth/auth.e2e-spec.ts kiểm registration contract 501 khi hợp lệ, 400 khi input/query sai. http.e2e-spec.ts kiểm 27 route và các trường hợp validation/idempotency header, tổng 40 ca.

Luồng: Nest AppModule thật → HTTP → pipe/DTO → controller → service. utils.ts tắt database, dùng port tạm, đóng app và khôi phục môi trường sau suite. Không cần cổng 3000 rảnh và không có test giả đăng nhập thành công.

Từ gốc: npm run test:e2e:backend. Root test:e2e chạy thêm Playwright frontend; hai bộ có vai trò khác nhau.

Cập nhật BE-1: auth/http DTO suite có override guard rõ ràng, không thay test bảo mật. security.e2e-spec.ts chạy guard thật và bổ sung 8 ca. Auth/user thành công được kiểm riêng trên Atlas qua npm run test:be1 -w backend.
