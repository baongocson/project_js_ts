# backend/src/common

DTO, validation, policy và xử lý lỗi dùng chung.

## Cấu trúc

- domain/ — thư mục con, xem README bên trong.
- dto/ — thư mục con, xem README bên trong.
- filters/ — thư mục con, xem README bên trong.
- interceptors/ — request logging ở hai chiều của handler.
- pipes/ — DtoValidationPipe gọi parser kiểm request.
- validation/ — thư mục con, xem README bên trong.

## Luồng và phạm vi

Controller dùng pipe/parser để kiểm cấu trúc request; policy thuần quyết định no-op, comparison và canonical request. Exception filter chuyển lỗi thành envelope HTTP. Không mở kết nối database hoặc ghi dữ liệu tại common. Test tại src/test/unit (common/, modules/, contracts/) và src/test/e2e.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
