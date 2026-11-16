# App

Lắp ghép ứng dụng và cấu hình cấp cao nhất.

- providers.tsx: StrictMode và BrowserRouter; chưa cần store hoặc auth provider vì chưa có nghiệp vụ.
- router.tsx: route `/` hiển thị SystemOverviewPage, route khác hiển thị trang không tìm thấy với liên kết về trang chủ. Không thêm route đăng nhập giả.
- pages/: trang vỏ ứng dụng hiện có, không phải màn hình nghiệp vụ của auth/analysis.
- hooks/: kiểm tra backend health và cleanup yêu cầu.
- index.ts: export AppRouter, AppProviders cho entrypoint.

Luồng: main → AppProviders → App → AppRouter → page → shared. Khi feature có page, router import từ index của feature. App được dùng features/shared; features/shared không import app.

Từ gốc repo: `npm run dev -w frontend`, `npm run test:e2e:frontend`. Hosting production cần SPA fallback về index.html cho đường dẫn client, đồng thời giữ reverse proxy API.
