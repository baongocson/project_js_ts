# backend/src/modules

Các module nghiệp vụ Auth, Users, Projects, Datasets, Analysis, Processing, History.

## Cấu trúc

- analysis/ — thư mục con, xem README bên trong.
- auth/ — thư mục con, xem README bên trong.
- datasets/ — thư mục con, xem README bên trong.
- history/ — thư mục con, xem README bên trong.
- processing/ — thư mục con, xem README bên trong.
- projects/ — thư mục con, xem README bên trong.
- users/ — thư mục con, xem README bên trong.

## Luồng và phạm vi

Mỗi module có controller/service/guard/repository/module đặt phẳng, dto/ và security/. README từng module mô tả trách nhiệm và trạng thái. Guard/repository mới chỉ là khung; guard chưa gắn vào route để giữ hành vi main. Luồng thực thi hiện tại: DTO → controller → service placeholder.

## Bảo trì

Dùng JS/TS và TypeScript strict, không dùng any. Kiểm thử tại src/test; cập nhật README khi chức năng, phụ thuộc hoặc luồng thay đổi. Không ghi credentials vào tài liệu.

## Cập nhật BE-1

Auth/Users đã có persistence và global AuthGuard/OwnershipGuard. Các mô tả scaffold phía trên còn đúng với 5 module nghiệp vụ chưa triển khai, không còn đúng với Auth/Users. Cần dùng Principal/fence theo docs/plans/be1-handoff.md khi triển khai BE-2/3; không gắn guard placeholder của module vào route đã được global guard bảo vệ.
