# UsersModule

Hồ sơ và tài khoản.

## Cấu trúc

| Thành phần | Trách nhiệm |
| --- | --- |
| users.controller.ts | Khai báo route và gọi validation DTO trước khi chuyển đến service. |
| users.service.ts | Điều phối nghiệp vụ; bản main hiện còn trả HTTP 501 cho nghiệp vụ chưa triển khai. |
| users.guard.ts | File guard riêng. Khung hiện từ chối với 501 nếu được gọi; chưa gắn vào controller. |
| users.repository.ts | Ranh giới truy cập dữ liệu, đang là khung, chưa có CRUD. |
| users.module.ts | Đăng ký controller, service, guard và repository với NestJS. |
| security/ | Chính sách bảo mật riêng của module khi triển khai; không chứa secret. |
| dto/ | Kiểu request/response và validation hiện có; xem README bên trong. |

## Luồng và trạng thái

Luồng đang chạy: HTTP → DTO/pipe → controller → service → HTTP 501 khi chưa có nghiệp vụ. Luồng dự kiến sau khi triển khai bảo mật: HTTP → guard → DTO → controller → service → repository → database. Guard đã đăng ký provider nhưng chưa dùng @UseGuards để không thay hành vi API của main bằng một kiểm tra bảo mật giả. Không dùng guard này để tuyên bố route đã được bảo vệ.

Schema/validator/index vẫn do infrastructure/database quản lý tập trung. Không tạo bản schema thứ hai trong module. Chưa triển khai thêm nghiệp vụ, kết nối hay collection trong đợt cấu hình này.

## Kiểm thử

Test tập trung trong backend/src/test: unit/, e2e/, integration/. Chạy npm run test:unit hoặc npm run test:e2e:backend từ gốc repo. Test hiện kiểm hợp đồng và trạng thái khung, không chứng minh CRUD đã hoàn thành. Mã nguồn JS/TS, không dùng kiểu any.
