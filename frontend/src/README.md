# Mã nguồn frontend

`main.tsx` nạp CSS một lần và mount App trong AppProviders. `App.tsx` gọi AppRouter qua app/index; dùng đường dẫn index tường minh để tránh xung đột App.tsx với thư mục app trên Windows.

- app/: router, providers, trang hệ thống và hook kiểm tra kết nối.
- features/: khung các tính năng nghiệp vụ; xem trạng thái tại từng README.
- shared/: transport HTTP, UI và style dùng chung.
- assets/: tài nguyên tĩnh; hiện chỉ có placeholder.
- components/: placeholder có trước, hiện không có code để di chuyển. Không thêm component mới tại đây; dùng feature/components hoặc shared/ui theo phạm vi.
- index.css: nạp shared/style/global.css, giữ giao diện hiện tại.

Chiều import: app → features → shared và app → shared. Chạy `npm run typecheck -w frontend` để kiểm kiểu và kiến trúc. Cách chạy ứng dụng/test xem [frontend README](../README.md).
