# backend/src/common/validation

Parser, pipe, decorator cho body/query/params/header.

## Cấu trúc

- dto-validation.pipe.ts — mã TypeScript của thành phần tương ứng.
- idempotency-key.decorator.ts — mã TypeScript của thành phần tương ứng.
- query.validation.ts — mã TypeScript của thành phần tương ứng.
- request.validation.ts — mã TypeScript của thành phần tương ứng.
- validation.ts — mã TypeScript của thành phần tương ứng.

## Luồng và phạm vi

Nhận unknown → kiểm field/kiểu/giá trị → chuẩn hóa theo API → trả DTO hoặc lỗi 400. Không thực hiện xác thực hay tra cứu ownership. Unit contracts kiểm các trường hợp biên; E2E kiểm toàn bộ HTTP pipeline.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
