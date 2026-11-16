# Backend Dashboard 3D

NestJS modular monolith. BE-1 triển khai Auth4/Users3 và guard/ownership. BE-2 bổ sung Projects6/Datasets4 cùng storage/snapshot/idempotency/publish/recovery. 10 API Processing/History/Analysis và engine27method thuộc BE-3 còn scaffold. Xem [BE-1](../docs/plans/be1-handoff.md) và [BE-2](../docs/teamwork/nguyen-be2.md).

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

Luồng hiện tại: HTTP → global AuthGuard → OwnershipGuard → pipe/DTO → controller → service/repository. Health/Auth public; auth mutation có Origin/rate guard. Auth/Users dùng persistence thật khi bật database; khi tắt vẫn giữ 501 ở service để test DTO cô lập. Thiếu phiên ở route bảo vệ luôn 401, không tự bỏ guard vì DB tắt. BE-2/3 cần gọi transaction fence trong service; guard trước request không thay thế kiểm lifecycle/revoke trong transaction ghi.

Giữ schema/index ở infrastructure/database, không nhân đôi trong module và không tự xóa security/validation/common. Không dựng hệ thống AI mới; hướng dẫn AI trong video là có điều kiện.

## Chạy và kiểm thử từ gốc

```powershell
npm run start:dev -w backend
npm run auth:init-secret -w backend
npm run build -w backend
npm run typecheck -w backend
npm run lint -w backend
npm run lint:fix -w backend
npm run test:unit
npm run test:e2e:backend
npm run test:contracts -w backend
# Chỉ khi cần kiểm trên database thật đã cấu hình:
npm run test:integration
npm run test:be1 -w backend
npm run test:be2:local -w backend
npm run test:integration:local -w backend
```

Môi trường giữ nguyên: backend/.env rồi fallback atlas-credentials.env, biến tiến trình ưu tiên cao hơn. Không đưa secret vào tài liệu/log. Xem [test README](src/test/readme.md), [database](../docs/database/database.md), [kiến trúc](../docs/architecture/architecture.md), [trạng thái refactor](../docs/refactor/refactor-status.md).

ESLint dùng cấu hình chung ở gốc, kiểm cả source/test với tsconfig.spec.json và giữ value import cần cho Nest DI. Xem [quy tắc lint](../docs/architecture/code-quality.md).
