# backend/src/common/filters

Xử lý exception HTTP.

## Cấu trúc

- api-exception.filter.ts — mã TypeScript của thành phần tương ứng.

## Luồng và phạm vi

ApiExceptionFilter lấy status/code/message/details, thêm requestId và che chi tiết lỗi 500 khỏi client; ghi log phía server khi phù hợp. E2E kiểm error envelope qua HTTP.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
