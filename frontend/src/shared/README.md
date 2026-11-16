# Shared

Thành phần nền tảng dùng chung, không import app hoặc features.

- api/: URL gốc, JSON transport và health hạ tầng, gồm type HealthResponse thuộc hợp đồng endpoint health.
- ui/: Section đang được trang hệ thống dùng; các primitive khác chỉ thêm khi có nhu cầu thực tế.
- style/: CSS chung được nạp một lần từ src/index.css.
- index.ts: export các API/type/UI công khai; không tự nạp CSS qua barrel.

API và type riêng của nghiệp vụ thuộc feature tương ứng. Chưa có type nghiệp vụ dùng chung cần quyết định vị trí. Nếu có, xác định chủ sở hữu trước khi bổ sung.

Chạy `npm run typecheck -w frontend`; E2E `npm run test:e2e:frontend` kiểm đường đi thực tế app → shared/api → proxy → Nest backend.
