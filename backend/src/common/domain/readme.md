# backend/src/common/domain

Các quy tắc thuần cho typed cell và canonical request.

## Cấu trúc

- canonical-request.ts — mã TypeScript của thành phần tương ứng.
- cell-comparison.ts — mã TypeScript của thành phần tương ứng.
- cell-policy.ts — mã TypeScript của thành phần tương ứng.

## Luồng và phạm vi

Cell policy giữ kiểu và missing tokens; cell-comparison phục vụ sort/filter; canonical-request tạo biểu diễn ổn định mà không trim hoặc chuẩn hóa dữ liệu người dùng. Không có I/O. Kiểm bằng src/test/unit (common/, modules/, contracts/).

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.
