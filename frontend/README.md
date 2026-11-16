# Frontend Dashboard 3D

React + Vite + TypeScript strict. Dùng React Router để tổ chức app và Playwright để kiểm thử trình duyệt theo lựa chọn đã xác nhận. Có trang trạng thái, trang /offline với auth, CSV/typed snapshot, IndexedDB, 27 method core, restore và đồng bộ server. Các màn hình nghiệp vụ chuyên sâu khác tiếp tục dùng boundary features/shared.

## Cấu trúc và luồng

```text
src/
  main.tsx, App.tsx, index.css
  app/                  # providers, router, hooks và trang hệ thống
  features/
    {auth,projects,datasets,analysis,processing,history,offline}/
      api/, components/, hooks/, pages/, types.ts, index.ts, README.md
  shared/
    api/, ui/, style/, index.ts, README.md
  assets/               # chưa có tài nguyên triển khai
  components/           # placeholder cũ, không đặt component mới tại đây
test/E2E/               # Playwright trên browser + backend thật
scripts/                # kiểm chiều import và vòng phụ thuộc
```

main mount AppProviders → App → router → page. Trang hệ thống dùng hook gọi shared/api → Vite proxy → Nest. Feature khi có code chỉ phụ thuộc shared; shared không phụ thuộc app/features. Index là đầu mối export, type dùng `export type`; CSS được nạp một lần qua index.css. Các index/types rỗng trong feature được ghi rõ là khung, không đại diện cho nghiệp vụ đã hoàn thành.

HTTP client trước ở lib đã chuyển nguyên trách nhiệm sang shared/api. src/types cũ chỉ có .gitkeep nên được bỏ; type HealthResponse thuộc shared/api vì là hợp đồng health hạ tầng. Không có type nghiệp vụ dùng chung nào bị nhân bản. Style giữ nguyên trong shared/style/global.css. Auth của /offline chỉ giữ access token trong bộ nhớ; cookie refresh HttpOnly/Secure theo backend.

## Chạy từ gốc repository

```powershell
npm install
npm run dev -w frontend
npm run build -w frontend
npm run lint -w frontend
npm run lint:fix -w frontend
npm run typecheck -w frontend
npm run check:architecture -w frontend
npm run test:e2e:install -w frontend
npm run test:e2e:frontend
```

Dev mặc định 127.0.0.1:5173, proxy /api đến 127.0.0.1:3000. VITE_API_BASE_URL mặc định /api/v1, có thể cấu hình lúc build; không dùng biến VITE cho bí mật. API_PROXY_TARGET chỉ dùng ở Vite server/preview để đổi đích proxy, không đưa vào bundle. Production cần reverse proxy API và SPA fallback về index.html.

Typecheck gồm cả mã ứng dụng/test và kiểm kiến trúc. E2E build cả hai workspace, đặt VITE_API_BASE_URL=/api/v1 riêng cho tiến trình build thử, chạy port 4173/4300 và tắt database. Không sửa .env thật. Xem [test README](test/README.md).

ESLint dùng cấu hình chung ở gốc repository, gồm TypeScript, Promise và React Hooks. lint:fix chỉ sửa lỗi được công cụ hỗ trợ; xem [quy tắc lint](../docs/architecture/code-quality.md).

Kế hoạch gốc: [frontend refactor plan](../docs/refactor/frontend-refactor-plan.md). Trạng thái thực hiện và các quyết định: [refactor status](../docs/refactor/refactor-status.md).

## Nghiệm thu backend + offline qua HTTPS

```powershell
npm run build -w @dashboard/data-core
npm run test:integration:local -w backend
npm run test:acceptance -w frontend
```

Bộ acceptance cần Chromium (`npm run test:e2e:install -w frontend`) và OpenSSL trong PATH hoặc biến OPENSSL_BIN. Runner tạo chứng chỉ một ngày, MongoDB replica riêng, backend 4310 và HTTPS reverse proxy 4174; không thay .env. Các cổng phải rảnh. Chứng chỉ test được chấp nhận bằng fingerprint chỉ trong browser test; không thay đổi TLS của ứng dụng. Runner tự dừng server/replica và xóa thư mục tạm.

Mở `/offline` để lưu CSV, chọn method/cột/tham số, xử lý hoặc restore khi mất mạng. Sau khi có mạng, đăng nhập/khôi phục phiên và chọn đồng bộ. Bản local/CSV/checkpoint nằm trong IndexedDB, không chứa token. Đồng bộ dùng key cố định cho create/import/Preview/Apply/restore, kiểm tài khoản, source hash, typed data/position/lineage và server head; không ghi đè khi conflict hoặc tự chuyển sang tài khoản khác. Lần đầu cần mở online để cache app shell; xóa browser storage sẽ xóa dữ liệu local.

Các ca kiểm và giới hạn được ghi tại [báo cáo remediation](../docs/reports/backend-plan-remediation-2026-11-16.md).
