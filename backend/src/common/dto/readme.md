# backend/src/common/dto

Kiểu cell, diagnostics, summary và response dùng chung.

## Cấu trúc

- cell.dto.ts — mã TypeScript của thành phần tương ứng.
- response.dto.ts — mã TypeScript của thành phần tương ứng.

## Luồng và phạm vi

Validation chuyển unknown thành DTO hợp lệ; response producer/mapper chọn trường được phép xuất. Type/interface không tự validate hay bỏ secret. Các module import kiểu dùng chung; hợp đồng được kiểm tại src/test/unit (common/, modules/, contracts/).

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
