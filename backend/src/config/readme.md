# backend/src/config

Kiểm tra biến môi trường và constants giới hạn hiện hành.

## Cấu trúc

- environment.ts — mã TypeScript của thành phần tương ứng.
- resource-limits.ts — mã TypeScript của thành phần tương ứng.

## Luồng và phạm vi

environment.ts kiểm PORT, DATABASE_ENABLED và origin; resource-limits.ts giữ giới hạn API đã chốt. Giữ loader môi trường hiện có tại database.connection.ts trong đợt cấu trúc này, không tự di chuyển thêm runtime. Không lưu secret thật vào source.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
