# Dashboard 3D

Khung dự án theo yêu cầu giảng viên: NestJS modular monolith và React/Vite, dùng TypeScript. Định tuyến theo sheet **Trang tính1** trong tài liệu API đã cung cấp.

## Chạy phát triển

Yêu cầu Node.js >=22.12 và npm. Tại thư mục gốc:

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm run dev
```

Chỉ sao chép file môi trường nếu chưa có. File `.env` ở thư mục gốc có sẵn được giữ nguyên và không tự nạp vào ứng dụng. Backend nạp `backend/.env`, rồi fallback `atlas-credentials.env`; frontend nạp `frontend/.env`. Biến môi trường tiến trình có ưu tiên cao nhất. Không đưa bí mật vào biến `VITE_*`.

- Frontend: http://localhost:5173
- Health API: http://localhost:3000/api/v1/health
- Backend riêng: `npm run start:dev -w backend`
- Frontend riêng: `npm run dev -w frontend`
- Kiểm tra kiểu: `npm run typecheck`
- Build cả hai: `npm run build`

Vite proxy `/api` về backend trong môi trường phát triển. Production cần reverse proxy hoặc cấu hình VITE_API_BASE_URL lúc build, CORS origin phù hợp và HTTPS cho cookie xác thực.

## MongoDB

File mẫu có `DATABASE_ENABLED=false` để chạy khung không cần MongoDB. Máy hiện tại đã cấu hình Atlas với database `dashboard_3d`. Đã triển khai 12 schema/validator và toàn bộ index theo ERD; `autoIndex` tắt. Dùng `npm run db:provision -w backend` để tạo/cập nhật có kiểm soát, `npm run db:verify -w backend` để xác minh, `npm run test:database -w backend` để kiểm thử trên Atlas. Backend bật database sẽ kiểm tra kết nối, replica set và schema/index trước khi phục vụ. Xem [hướng dẫn database](docs/database.md).

## Cấu trúc

```text
backend/src/
  main.ts, app.module.ts, app.controller.ts, app.service.ts
  common/filters/
  config/
  infrastructure/database/, infrastructure/idempotency/
  modules/{auth,users,projects,datasets,analysis,processing,history}/
    *.module.ts, *.controller.ts, *.service.ts
    dto/, schemas/, repositories/
frontend/
  src/main.tsx, src/App.tsx, src/index.css
  src/assets/, components/, features/, lib/, types/
  public/, vite.config.ts, tsconfig.json
```

`GET /api/v1/health` ping database khi được bật. 27 endpoint nghiệp vụ có DTO/validation/response contract nhưng vẫn trả **501 NOT_IMPLEMENTED** với error envelope; chưa có auth, idempotency hay thuật toán thực thi. Schema MongoDB và index đã có, chưa nối nghiệp vụ vào persistence. Frontend hiển thị trạng thái kết nối, chưa phải dashboard hoàn chỉnh.

Xem [kiến trúc và bước tiếp theo](docs/architecture.md). Cấu trúc tham chiếu tài liệu chính thức [NestJS](https://docs.nestjs.com/modules) và [Vite](https://vite.dev/guide/).
