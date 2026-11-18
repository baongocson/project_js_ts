# Dashboard 3D

Khung dự án theo yêu cầu giảng viên: NestJS modular monolith và React/Vite, dùng TypeScript. Định tuyến theo sheet **Trang tính1** trong tài liệu API đã cung cấp.

## Chạy bằng Docker Desktop

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/init-docker.ps1
docker compose up -d --build --wait --wait-timeout 180
```

Mở https://localhost:8443. MongoDB và dữ liệu Docker độc lập với Atlas hiện tại; đăng ký tài khoản mới. HTTPS dùng CA cục bộ nên trình duyệt có thể cảnh báo. Xem [hướng dẫn Docker](docs/docker.md) để tin cậy CA, bật Ollama, giữ dữ liệu và triển khai lên server.

## Chạy phát triển với Node.js

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

`GET /api/v1/health` ping database khi được bật. BE-1 triển khai 4 API Auth và 3 API Users. BE-2 bổ sung 6 API Projects và 4 API Datasets với CSV/storage/snapshot/idempotency/publish/recovery; xem [báo cáo BE-2](docs/teamwork/nguyen-be2.md). BE-3 triển khai 10 API Processing/History/Analysis và đủ 27 method trong packages/data-core. Trang /offline có auth, CSV, bảng local, xử lý/restore offline, IndexedDB và đồng bộ có ID mapping. Xem [kết quả xử lý checklist](docs/reports/backend-plan-remediation-2026-11-16.md).

AuthGuard và OwnershipGuard đã gắn toàn cục: thiếu JWT/session hợp lệ trả 401 trước kiểm ID, rồi kiểm quyền project/dataset/version/preview. Health và Auth là public; Auth mutations vẫn kiểm Origin và rate limit. Các guard scaffold không dùng của Projects/Datasets/Processing/History/Analysis đã được bỏ; không thay đổi global guards hoặc ownership trong service. Xem [BE-1 bàn giao](docs/teamwork/be1-handoff.md).

## Kiểm thử

ESLint dùng chung qua `eslint.config.mjs` ở gốc: kiểm JavaScript/TypeScript, biến/import không dùng, Promise và React Hooks. Không áp vào dependency, build output hoặc thư mục video. Các lệnh từ gốc:

```powershell
npm run lint                  # kiểm toàn dự án, không sửa file
npm run lint:fix              # tự sửa các lỗi có hỗ trợ
npm run lint -w frontend      # chỉ frontend
npm run lint -w backend       # chỉ backend
```

Lint bổ sung cho typecheck, kiểm kiến trúc và test. Xem [quy tắc và cách dùng ESLint](docs/architecture/code-quality.md).

Backend dùng Jest, ts-jest, Nest Testing và Supertest, tập trung trong `backend/src/test/`. Test đọc source TypeScript; production build loại `src/test` khỏi `dist`. Bộ DTO contract cũ có override guard tường minh khi database tắt; bộ security HTTP và integration BE-1 kiểm guard thật. Frontend dùng Playwright Chromium: bộ health/transport riêng và bộ acceptance HTTPS với auth, cookie, offline/reload, sync, retry/conflict và MongoDB replica tạm.

```powershell
npm run test:unit
npm run test:e2e:install -w frontend # một lần, tải Chromium
npm run test:e2e
npm run test:e2e:backend            # chỉ backend
npm run test:e2e:frontend           # chỉ browser + health backend
# Cần Atlas đã cấu hình; có dữ liệu thử và cleanup/rollback
npm run test:integration
npm run test:be1 -w backend        # HTTP + Atlas thật, có dữ liệu thử/cleanup
```

Trước khi chạy backend với database bật, chạy `npm run auth:init-secret -w backend` để tạo secret cục bộ nếu chưa có; lệnh không in secret hoặc thay khóa hợp lệ. HTTPS cùng origin hoặc reverse proxy HTTPS được yêu cầu khi nghiệm thu cookie Secure trong trình duyệt. Xem [cấu trúc test](backend/src/test/readme.md) và [BE-1 bàn giao](docs/teamwork/be1-handoff.md).

Frontend tổ chức theo chiều import `app → features → shared` và `app → shared`; typecheck kiểm cả chiều import và vòng phụ thuộc. E2E frontend tự build hai workspace, chạy preview 4173 và Nest 4300 với database tắt, không dùng Atlas. Xem [frontend README](frontend/README.md) và [trạng thái thực hiện refactor](docs/refactor/refactor-status.md).

Xem [kiến trúc và bước tiếp theo](docs/architecture/architecture.md). Cấu trúc tham chiếu tài liệu chính thức [NestJS](https://docs.nestjs.com/modules) và [Vite](https://vite.dev/guide/).

## Nghiệm thu backend + offline qua HTTPS

```powershell
npm run build -w @dashboard/data-core
npm run test:integration:local -w backend
npm run test:acceptance -w frontend
```

Bộ acceptance cần Chromium (`npm run test:e2e:install -w frontend`) và OpenSSL trong PATH hoặc biến OPENSSL_BIN. Runner tạo chứng chỉ một ngày, MongoDB replica riêng, backend 4310 và HTTPS reverse proxy 4174; không thay .env. Các cổng phải rảnh. Chứng chỉ test được chấp nhận bằng fingerprint chỉ trong browser test; không thay đổi TLS của ứng dụng. Runner tự dừng server/replica và xóa thư mục tạm.

Mở `/offline` để lưu CSV, chọn method/cột/tham số, xử lý hoặc restore khi mất mạng. Sau khi có mạng, đăng nhập/khôi phục phiên và chọn đồng bộ. Bản local/CSV/checkpoint nằm trong IndexedDB, không chứa token. Đồng bộ dùng key cố định cho create/import/Preview/Apply/restore, kiểm tài khoản, source hash, typed data/position/lineage và server head; không ghi đè khi conflict hoặc tự chuyển sang tài khoản khác. Lần đầu cần mở online để cache app shell; xóa browser storage sẽ xóa dữ liệu local.

Các ca kiểm và giới hạn được ghi tại [báo cáo remediation](docs/reports/backend-plan-remediation-2026-11-16.md).

## Gợi ý AI local

Qwen3 4B qua Ollama gợi ý trên toàn bộ cột của dataset online theo sáu tab xử lý, không cần chọn cột/phương pháp trước. AI chỉ tham khảo; người dùng xem Preview rồi mới Apply. Chạy `npm run ai:setup` một lần, sau đó `npm run dev:ai`; kiểm tra mô hình thật bằng `npm run ai:check`. Không thêm lưu trữ/ERD. Xem [kiến trúc, thiết lập và giới hạn](docs/architecture/local-ai.md).

Các script AI local hiện dành cho Windows; runtime/model không đi kèm Git. Docker Compose có chế độ Ollama riêng, xem [hướng dẫn Docker](docs/docker.md). Team có thể dùng một server chung để người dùng chỉ mở website. Xem thêm [hướng dẫn AI cho team](docs/architecture/local-ai-deployment.md).
