# Style chung

global.css giữ nguyên stylesheet của trang trước refactor. src/index.css import file này một lần; main.tsx import src/index.css. Chưa đổi màu sắc/layout hoặc áp đặt bộ design token mới khi video chưa chốt chi tiết.

index.ts hiện không có export runtime: CSS được nạp tường minh để tránh barrel kéo theo side effect ngoài ý muốn. Khi bổ sung design token, dùng tại đây và cập nhật tài liệu. Build: `npm run build -w frontend`.
