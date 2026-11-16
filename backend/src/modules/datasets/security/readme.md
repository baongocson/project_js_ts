# Datasets security

Nơi đặt chính sách bảo mật riêng cho datasets: ví dụ kiểm quyền thao tác hoặc phạm vi tài nguyên sau khi Auth được triển khai. Hiện chỉ là thư mục cấu trúc, chưa có logic bảo mật.

datasets.guard.ts đặt ở cấp module và sẽ sử dụng các policy này; service/repository không đọc HTTP headers trực tiếp. Secret được lấy từ môi trường, không lưu ở đây. Guard/repository hiện chưa làm nghiệp vụ và không tự cho phép truy cập.

Test chính sách khi triển khai đặt trong src/test/unit; test luồng HTTP đặt trong src/test/e2e.
