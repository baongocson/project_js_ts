# Backend Dashboard 3D

NestJS modular monolith. Khung common/config/infrastructure/modules và repository đặt phẳng đã có trước đợt refactor này, được giữ nguyên. Hiện có 27 endpoint nghiệp vụ với validation/contract nhưng trả 501; health hoạt động và có thể kiểm MongoDB khi bật database.

## Cấu trúc và trách nhiệm

- src/main.ts: bootstrap Nest, prefix API, CORS, pipe/filter và HTTP server.
- src/app.module.ts: lắp ghép cấu hình, database và module nghiệp vụ.
- src/app.controller.ts, app.service.ts: endpoint health và kiểm tra kết nối.
- src/common/: DTO, validation, policy thuần và exception filter dùng chung.
- src/config/: kiểm cấu hình môi trường và constants giới hạn đã có.
- src/infrastructure/: kết nối hệ thống ngoài, schema/index tập trung, retry policy.
- src/modules/: auth, users, projects, datasets, analysis, processing, history; mỗi module giữ controller/service/repository/guard/module cùng dto/security và README.
- src/test/: test tập trung theo loại, bên trong phản ánh common/modules/infrastructure khi có test tương ứng; các hợp đồng liên module được giữ ở unit/contracts.
- jest.config.cjs, tsconfig.spec.json: runner và kiểm kiểu test; tsconfig.build.json loại test khỏi production output.

## Luồng và giới hạn

Luồng hiện tại: HTTP → pipe/DTO → controller → service trả 501 cho nghiệp vụ chưa triển khai. Guard được khai báo nhưng chưa gắn route và chưa có xác thực/phân quyền. Repository cũng chưa thực hiện CRUD. Người dùng đã xác nhận giữ nguyên trạng thái nghiệp vụ trong đợt refactor; không dùng sự hiện diện file guard để tuyên bố hệ thống đã được bảo vệ.

Giữ schema/index ở infrastructure/database, không nhân đôi trong module và không tự xóa security/validation/common. Không dựng hệ thống AI mới; hướng dẫn AI trong video là có điều kiện.

## Chạy và kiểm thử từ gốc

```powershell
npm run start:dev -w backend
npm run build -w backend
npm run typecheck -w backend
npm run lint -w backend
npm run lint:fix -w backend
npm run test:unit
npm run test:e2e:backend
npm run test:contracts -w backend
# Chỉ khi cần kiểm trên database thật đã cấu hình:
npm run test:integration
```

Môi trường giữ nguyên: backend/.env rồi fallback atlas-credentials.env, biến tiến trình ưu tiên cao hơn. Không đưa secret vào tài liệu/log. Xem [test README](src/test/readme.md), [database](../docs/database/database.md), [kiến trúc](../docs/architecture/architecture.md), [trạng thái refactor](../docs/refactor/refactor-status.md).

ESLint dùng cấu hình chung ở gốc, kiểm cả source/test với tsconfig.spec.json và giữ value import cần cho Nest DI. Xem [quy tắc lint](../docs/architecture/code-quality.md).
