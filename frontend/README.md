# Frontend Dashboard 3D

Giao diện workspace hiện lấy bố cục/tương tác từ `frontend_mau`, triển khai lại trong app/features/shared:8tab,3D cạnh form theo nhóm, bảng bên dưới và History riêng. WebGL Three.js/Fiber lazy-load có projection/pin/zoom và SVG fallback. API/data-core/typed data/offline/sync giữ theo contract hiện tại. Xem [bản đồ thay đổi giao diện](../docs/reports/frontend-reference-redesign-2026-11-17.md), và [bổ sung EDA/TF-IDF/sửa ô](../docs/reports/frontend-eda-tfidf-2026-11-17.md).

React + Vite + TypeScript strict. Dùng React Router để tổ chức app và Playwright để kiểm thử trình duyệt theo lựa chọn đã xác nhận. Có auth/profile/theme, project dashboard online, workspace import/table/processing/history/analysis/3D và local offline/sync. Dùng chung typed form/core/adapters giữa online và local. Sản phẩm vẫn đang được hoàn thiện; xem checklist/tiến độ để biết các gate và phần còn mở.

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
test/E2E/               # Playwright trên browser + backend thật
scripts/                # kiểm chiều import và vòng phụ thuộc
```

main mount AppProviders → App → router → page. Trang hệ thống dùng hook gọi shared/api → Vite proxy → Nest. App ghép features qua public index; feature dùng shared hoặc public boundary feature khác, không tạo vòng import. Shared không phụ thuộc app/features. Index là đầu mối export, type dùng `export type`; CSS được nạp một lần qua index.css.

Các feature đều có triển khai trong `api/components/hooks/pages`: page ghép hook với giao diện; hook quản lý state/effect/nghiệp vụ; API/adapter giao tiếp dữ liệu; component hiển thị model và phát sự kiện. Các page Analysis/Processing/History/Import được nhúng vào workspace, không tạo URL riêng. Workspace liên feature được app/pages/WorkspacePage ghép từ app/hooks/useWorkspace và app/components/WorkspaceView. Xem [báo cáo cấu trúc và kiểm chứng](../docs/reports/frontend-feature-structure-2026-11-18.md).

HTTP client trước ở lib đã chuyển nguyên trách nhiệm sang shared/api. src/types cũ chỉ có .gitkeep nên được bỏ; type HealthResponse thuộc shared/api vì là hợp đồng health hạ tầng. Không có type nghiệp vụ dùng chung nào bị nhân bản. Styles light/dark/responsive nằm trong shared/style/global.css. Session chung chỉ giữ access token trong bộ nhớ; cookie refresh HttpOnly/Secure theo backend.

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
npm run test:unit -w frontend
npm run test:acceptance -w frontend
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


## Routes và trạng thái hiện tại

- `/login`, `/register`, `/profile`: phiên, hồ sơ, theme và account cleanup có xác nhận.
- `/projects`, `/projects/:id`: server CRUD/workspace; import/table typed/multi-filter/sort/page/selection; 27 method trong panel với Preview/Apply và sửa ô trực tiếp từ điểm 3D, history/restore và 5 analysis APIs/3D.
- `/offline` hoặc `/local/projects`: CSV original/options, version/history/outbox và local workspace; same core/adapters; sync center có progress/outbox, manual/opt-in auto sync với API probe/backoff/owner pin và pre-Apply content guard.
- `/system` và `/`: trang kết nối/health; fallback not-found vẫn có test riêng.

IndexedDB giữ tên `dashboard3d-projects-v1`, **schema 2** thêm workspaces; không clear DB hoặc đổi nhãn engine khi nâng cấp. Đóng tab cũ nếu upgrade bị chặn. Workspace local có CAS/normalization, config export/retry khi quota. Bản nháp online ở localStorage riêng account/project/tab, recovery/export tường minh; không chứa token. Xem [offline README](src/features/offline/README.md).

App shell production được đăng ký cache từ provider, loại API/credentials khỏi cache. Khi online, navigation tải shell mới và cache assets hash tương ứng; lần mở đầu cần mạng. Dev Vite/HMR không thay cho nghiệm thu cache production. Không xóa storage để xử lý engine mismatch; giữ/export dữ liệu trước khi dọn.

Chạy acceptance theo lựa chọn gate nếu cần: `npm run test:acceptance -w frontend -- --grep "local workspace"`. Runner vẫn build và dùng MongoDB/chứng chỉ riêng; chuyển tiếp đối số Playwright để không phải chạy lại toàn suite cho mọi sửa nhỏ. Không chạy đồng thời hai runner vì dùng chung cổng/dist/output.

[Checklist](../docs/reports/frontend-readiness-checklist-2026-11-16.md), [tiến độ](../docs/reports/frontend-implementation-progress-2026-11-16.md), [ma trận processing](../docs/reports/frontend-processing-matrix-2026-11-16.md) ghi bằng chứng và giới hạn. Backup/source recovery, reconnect/sync center và quota import/Apply/checkpoint đã có gate; editor typed, Retry-After và blocked-upgrade đã có gate; đang đóng lifecycle tài khoản, review UX và tài liệu bàn giao; không tuyên bố toàn frontend hoàn tất chỉ vì các gate hiện có qua. Nghiệm thu cục bộ không thay triển khai production/Atlas/multi-browser.

Đợt 17/11: xem [recovery/sync report](../docs/reports/frontend-recovery-sync-2026-11-17.md). Auto sync chỉ chạy khi tab đang mở, sau manual account binding và opt-in; backup restore không tự bật auto sync.

Profile và `/offline` dùng chung hộp xác nhận logout/delete. Có lựa chọn giữ hoặc xóa local theo tài khoản; delete cần nhập XÓA và xác nhận hậu quả của bản giữ lại. Guest và tài khoản khác không bị cleanup. Bản backup dữ liệu chưa bao gồm workspace config. Xem [hướng dẫn test](test/README.md) và [kiểm kê cập nhật](../docs/reports/frontend-status-checklist-2026-11-17.md).
