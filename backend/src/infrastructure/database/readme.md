# backend/src/infrastructure/database

Kết nối MongoDB và registry schema/validator/index tập trung.

## Cấu trúc

- collection-contracts.ts — mã TypeScript của thành phần tương ứng.
- database.cli.ts — mã TypeScript của thành phần tương ứng.
- database.connection.ts — mã TypeScript của thành phần tương ứng.
- database.module.ts — mã TypeScript của thành phần tương ứng.
- database.provision.ts — mã TypeScript của thành phần tương ứng.

## Luồng và phạm vi

database.connection.ts đọc env và mở kết nối; collection-contracts.ts khai báo schema/index; database.provision.ts xác minh hoặc provision khi gọi riêng; database.module.ts tích hợp Nest; database.cli.ts cung cấp lệnh vận hành. Schema không nhân đôi trong module. Test tại src/test/integration, chạy riêng khi có Atlas; không tự provision từ test.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
