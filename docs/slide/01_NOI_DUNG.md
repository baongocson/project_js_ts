# 01 — Dàn ý và nội dung slide

Đọc 00 và ba file khảo sát. Tổng cộng **30–35 slide**, bao gồm bìa và kết luận; tổng thời lượng **15 phút**.
Mỗi slide: số, tiêu đề, thông điệp chính

## Bao phủ đúng yêu cầu giảng viên

1. Bài toán: bối cảnh, mục tiêu, phạm vi, tác nhân.
2. Chức năng và Use Case: actor, input/output, luồng chính, luồng lỗi.
3. Phi chức năng: phản hồi, throughput, người dùng, bảo mật, phục hồi, môi trường.
4. AI: tác vụ, dữ liệu, output, flow gọi model, lưu kết quả, chi phí nếu có chứng cứ.
5. Kiến trúc tổng thể: vai trò từng thành phần.
6. Database: schema/collection/index/quan hệ, lưu phiên bản nếu có.
7. API thật: endpoint, request, response, error handling.
8. Giao diện và luồng người dùng: ảnh thật, đăng nhập → thao tác → kết quả nếu có.
9. Frontend: cấu trúc thư mục, component, feature, router, UI màu/font/spacing/trạng thái.
10. Backend: cấu trúc thư mục, route/controller/service/repository nếu có.
11. **Workflow xuyên suốt**: thao tác → file frontend → API → file backend → DB nếu có → response → UI.
12. Test: unit, integration, E2E, kết quả có chứng cứ.
13. Đóng gói và deploy: Docker, Nginx, local so với public.
14. Bảo mật, k6, hiệu suất frontend: không bịa số đo.
15. Kết quả, hạn chế, hướng phát triển, kết luận.

## Workflow bắt buộc

Chọn nghiệp vụ thật truy vết được; ghi tên file và hàm cho từng bước, input/output, lỗi.
Nếu xử lý trong trình duyệt, không tự thêm backend.
