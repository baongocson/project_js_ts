# E2E trình duyệt

`system.e2e.spec.ts` kiểm bốn hành vi:

1. Trang chủ gọi health qua proxy đến backend Nest thật và hiển thị trạng thái.
2. Khi health trả 503, hiển thị lỗi HTTP thay vì báo đã kết nối.
3. Khi request bị lỗi mạng, hiển thị lỗi và thoát trạng thái chờ.
4. URL không tồn tại có thể quay về trang chủ; reload vẫn hoạt động.

Các ca lỗi dùng page.route để tạo điều kiện lỗi có thể lặp lại. Không giả lập đăng nhập thành công: chưa có trang auth hoặc nghiệp vụ đăng nhập. Chỉ thêm auth.e2e.spec.ts khi luồng đó được triển khai, không tạo test rỗng chỉ vì video lấy tên auth làm ví dụ.

Chạy `npm run test:e2e:frontend` từ gốc repo. Mặc định dùng Chromium headless; trace chỉ giữ khi thất bại. Không có yêu cầu coverage hoặc ma trận browser khác được chốt trong video.
