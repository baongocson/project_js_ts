# backend/src

Source backend và test.

## Cấu trúc

- app.controller.ts — mã TypeScript của thành phần tương ứng.
- app.module.ts — mã TypeScript của thành phần tương ứng.
- app.service.ts — mã TypeScript của thành phần tương ứng.
- common/ — thư mục con, xem README bên trong.
- config/ — thư mục con, xem README bên trong.
- infrastructure/ — thư mục con, xem README bên trong.
- main.ts — mã TypeScript của thành phần tương ứng.
- modules/ — thư mục con, xem README bên trong.
- test/ — thư mục con, xem README bên trong.

## Luồng và phạm vi

main.ts khởi động AppModule; module nhận HTTP và gọi service. Database kết nối tại infrastructure; DTO/policy dùng chung tại common. test/ chứa unit, E2E và integration, không nằm trong bản build production. Các route nghiệp vụ hiện vẫn là khung trả 501.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
