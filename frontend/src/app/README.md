# App

`providers.tsx` lắp BrowserRouter/StrictMode, SessionBootstrap, theme/cache effects và SyncCoordinator. `router.tsx` định nghĩa auth/profile/projects/online workspace/local/system/fallback; RequireSession chỉ bảo vệ điều hướng, quyền dữ liệu vẫn do backend.

`WorkspacePage.tsx` lắp public features table/import/processing/history/analysis, workspace CAS/autosave và account/project/tab-bound draft recovery. `AppShell` cung cấp nav, trạng thái mạng/phiên và skip link. App inject inspect/lock local callbacks vào Profile để feature auth không import ngược offline runtime.

Chiều import: app → features/shared; consumer dùng public index. Production cần SPA fallback về index.html và reverse proxy API. Chạy typecheck/architecture, health E2E và acceptance theo [frontend README](../../README.md).

## 1. Giới thiệu giao diện Neon
App ghép feature và cung cấp shell; không sở hữu schema dữ liệu.
## 2. Chức năng chính
Header glass, sidebar các route thật, menu mobile thu gọn, trạng thái kết nối, theme selector và account link. Không đổi RequireSession.
## 3. Cấu trúc thư mục
`components/AppShell.tsx`: cấu trúc trang; `ThemeSwitcher.tsx`: chọn theme; `ThemeEffect.tsx`: áp dụng; `router.tsx`: route giữ nguyên. CSS ở shared/style/shell.css.
## 4. Luồng hoạt động
Sidebar dùng NavLink đánh dấu route hiện tại. Khách lưu fe-theme rồi phát sự kiện nội bộ; ThemeEffect đọc lại bằng cùng quy tắc ưu tiên cũ. Tài khoản dùng session.patch preferences đã có, lỗi hiển thị và không giả vờ lưu thành công.
## 5. Component và hàm quan trọng
AppShell theo dõi online/offline như trước. ThemeSwitcher khóa select trong lúc lưu. ThemeEffect đăng ký và dọn listener hệ thống/storage/sự kiện theme; không thay precedence tài khoản > local > system.
## 6. Props, state và dữ liệu
children là trang hiện tại; expanded chỉ điều khiển menu mobile; theme local chỉ dành khách. Không lưu token hoặc dataset.
## 7. Hướng dẫn sử dụng
Chọn Giao diện trên header: Sáng/Tối/Theo hệ thống. Trên mobile mở Điều hướng để chọn workspace. Projects vẫn yêu cầu phiên.
## 8. Hướng dẫn kiểm thử
Chạy tsc --noEmit, eslint frontend và browser config test/design-system/playwright.config.ts theo shared/style README. Kiểm menu bằng bàn phím, route có quyền, theme/reload/system và viewport375/768/1366/1920. Test API401 không chứng minh login server.
## 9. Phụ thuộc
React, React Router, auth session hiện có, CSS variables. Không thêm thư viện.
## 10. Giới hạn và lưu ý
Glass dùng feature detection, fallback nền đặc. Menu mobile mặc định đóng. Không tạo route/API mới. Lưu theme tài khoản cần kết nối API hiện hữu; lỗi phải thử lại.
