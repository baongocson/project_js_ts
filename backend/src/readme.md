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

main.ts khởi động AppModule. Luồng HTTP: middleware → guard → interceptor chiều vào → pipe → controller → service → repository → MongoDB; kết quả đi qua interceptor chiều ra và framework gửi response. Lỗi được chuẩn hóa bởi ApiExceptionFilter. Guard có thể đọc phiên/quyền qua service/repository trước controller.

Database kết nối tại infrastructure; service không truy vấn collection trực tiếp. Ownership, idempotency, cleanup và recovery đã tách repository riêng. DTO/policy và packages/data-core giữ hợp đồng/thuật toán dùng chung. test/ chứa unit, E2E và integration, không nằm trong bản build production. Xem [kiến trúc theo luồng hành động](../../docs/refactor/request-flow-architecture.md).

`npm run typecheck -w backend` gồm kiểm kiểu và kiểm tra kiến trúc controller/service/repository.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
