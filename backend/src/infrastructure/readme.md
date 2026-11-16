# backend/src/infrastructure

Kết nối database và quy tắc hỗ trợ persistence.

## Cấu trúc

- database/ — thư mục con, xem README bên trong.
- idempotency/ — thư mục con, xem README bên trong.

## Luồng và phạm vi

database/ quản lý kết nối/schema/validator/index; idempotency/ hiện có retry policy thuần, chưa có cơ chế receipt/transaction nghiệp vụ. Không tạo kết nối third-party mới trong lần cấu hình này.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
