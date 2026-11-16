# Dashboard 3D

Khung dự án theo yêu cầu giảng viên: NestJS modular monolith và React/Vite, dùng TypeScript. Định tuyến theo sheet **Trang tính1** trong tài liệu API đã cung cấp.

## Chạy phát triển

Yêu cầu Node.js 22.13 trở lên trong nhánh 22.x, hoặc Node.js >=24, và npm. Tại thư mục gốc:

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

File mẫu có `DATABASE_ENABLED=false` để chạy khung không cần MongoDB. Máy hiện tại đã cấu hình Atlas với database `dashboard_3d`. Đã triển khai 12 schema/validator và toàn bộ index theo ERD; `autoIndex` tắt. Dùng `npm run db:provision -w backend` để tạo/cập nhật có kiểm soát, `npm run db:verify -w backend` để xác minh, `npm run test:database -w backend` để kiểm thử trên Atlas. Backend bật database sẽ kiểm tra kết nối, replica set và schema/index trước khi phục vụ. Xem [hướng dẫn database](docs/database/database.md).

## Cấu trúc

```text
backend/src/
  main.ts, app.module.ts, app.controller.ts, app.service.ts
  common/filters/
  config/
  infrastructure/database/, infrastructure/idempotency/
  modules/{auth,users,projects,datasets,analysis,processing,history}/
    readme.md, *.module.ts, *.controller.ts, *.service.ts
    *.guard.ts, *.repository.ts
    security/, dto/
  test/
    unit/{common,modules,contracts}/
    e2e/modules/auth/, e2e/http.e2e-spec.ts
    integration/infrastructure/database/
    setup.ts, utils.ts
frontend/
  src/main.tsx, src/App.tsx, src/index.css
  src/app/                    # router, providers, trang hệ thống
  src/features/{auth,projects,datasets,analysis,processing,history,offline}/
    api/, components/, hooks/, pages/, types.ts, index.ts, README.md
  src/shared/{api,ui,style}/
  src/assets/, components/    # placeholder cũ, chưa có code
  test/E2E/, playwright.config.ts
  scripts/                   # kiểm kiến trúc và chạy E2E
  public/, vite.config.ts, tsconfig.json
```

`GET /api/v1/health` ping database khi được bật. 27 endpoint nghiệp vụ có DTO/validation/response contract nhưng vẫn trả **501 NOT_IMPLEMENTED** với error envelope; chưa có auth, idempotency hay thuật toán thực thi. Schema MongoDB và index đã có, chưa nối nghiệp vụ vào persistence. Frontend hiển thị trạng thái kết nối, chưa phải dashboard hoàn chỉnh.

Mỗi module đã có guard riêng và repository đặt phẳng. Đây là khung cấu trúc: guard chưa gắn vào controller, repository chưa thực hiện CRUD. Không coi những file này là chức năng bảo mật/persistence đã hoàn thành.

## Kiểm thử

ESLint dùng chung qua `eslint.config.mjs` ở gốc: kiểm JavaScript/TypeScript, biến/import không dùng, Promise và React Hooks. Không áp vào dependency, build output hoặc thư mục video. Các lệnh từ gốc:

```powershell
npm run lint                  # kiểm toàn dự án, không sửa file
npm run lint:fix              # tự sửa các lỗi có hỗ trợ
npm run lint -w frontend      # chỉ frontend
npm run lint -w backend       # chỉ backend
```

Lint bổ sung cho typecheck, kiểm kiến trúc và test. Xem [quy tắc và cách dùng ESLint](docs/architecture/code-quality.md).

Backend dùng Jest, ts-jest, Nest Testing và Supertest, tập trung trong `backend/src/test/`. Bên trong chia theo common/module/infrastructure tương ứng, còn contract liên module ở unit/contracts. File ví dụ: `e2e/modules/auth/auth.e2e-spec.ts`, `unit/modules/auth/auth.service.spec.ts`. Test đọc source TypeScript; production build loại `src/test` khỏi `dist`. Frontend dùng Playwright Chromium để kiểm trang hệ thống với backend thật và các ca lỗi có kiểm soát; chưa có E2E đăng nhập vì nghiệp vụ đó chưa triển khai.

```powershell
npm run test:unit
npm run test:e2e:install -w frontend # một lần, tải Chromium
npm run test:e2e
npm run test:e2e:backend            # chỉ backend
npm run test:e2e:frontend           # chỉ browser + health backend
# Cần Atlas đã cấu hình; có dữ liệu thử và cleanup/rollback
npm run test:integration
```

Xem [cấu trúc và phạm vi test](backend/src/test/readme.md). Test Auth hiện kiểm hợp đồng 400/501 của bản main, chưa phải test đăng nhập thành công.

Frontend tổ chức theo chiều import `app → features → shared` và `app → shared`; typecheck kiểm cả chiều import và vòng phụ thuộc. E2E frontend tự build hai workspace, chạy preview 4173 và Nest 4300 với database tắt, không dùng Atlas. Xem [frontend README](frontend/README.md) và [trạng thái thực hiện refactor](docs/refactor/refactor-status.md).

Xem [kiến trúc và bước tiếp theo](docs/architecture/architecture.md). Cấu trúc tham chiếu tài liệu chính thức [NestJS](https://docs.nestjs.com/modules) và [Vite](https://vite.dev/guide/).
