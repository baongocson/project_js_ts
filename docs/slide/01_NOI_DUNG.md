# 01 — Dàn ý và nội dung slide
Đọc 00 và ba file khảo sát. Tổng cộng **30–35 slide**, bao gồm bìa và kết luận; tổng thời lượng **15 phút**.
Mỗi slide: số, tiêu đề, thông điệp chính, 2–4 ý ngắn, nguồn, số giây dự kiến.

## Bao phủ đúng yêu cầu giảng viên
1. Bài toán: bối cảnh, mục tiêu, phạm vi, tác nhân.
2. Chức năng và Use Case: actor, input/output, luồng chính, luồng lỗi.
3. Phi chức năng: phản hồi, throughput, người dùng, bảo mật, phục hồi, môi trường.
4. AI: tác vụ, dữ liệu, output, flow gọi model, lưu kết quả, chi phí nếu có chứng cứ.
5. Kiến trúc tổng thể: vai trò từng thành phần.
6. Database: schema/collection/index/quan hệ, lưu phiên bản nếu có.
7. API thật: endpoint, request, response, error handling.
8. Giao diện và luồng người dùng: ảnh thật, đăng nhập → thao tác → kết quả nếu có.
9. Frontend: thư mục, component, feature, router, UI màu/font/spacing/trạng thái.
10. Backend: cấu trúc file, route/controller/service/repository nếu có.
11. **Workflow xuyên suốt**: thao tác → file frontend → API → file backend → DB nếu có → response → UI.
12. Test: unit, integration, E2E, kết quả có chứng cứ.
13. Đóng gói và deploy: Docker, Nginx, local so với public.
14. Bảo mật, k6, hiệu suất frontend: không bịa số đo.
15. Kết quả, hạn chế, hướng phát triển, kết luận.

## Phân bổ tham khảo (33 slide)
- 1–3 mở đầu; 4–8 yêu cầu; 9–15 kiến trúc/DB/API/AI.
- 16–24 giao diện/FE/BE/workflow; 25–30 test/deploy/bảo mật/hiệu năng.
- 31–33 kết quả/hạn chế/kết luận. Điều chỉnh trong khoảng 30–35.
- Không kéo dài chỉ để đủ số slide. Cộng tổng thời lượng bằng 15:00.

## Workflow bắt buộc
Chọn nghiệp vụ thật truy vết được; ghi tên file và hàm cho từng bước, input/output, lỗi.
Nếu xử lý trong trình duyệt, không tự thêm backend. Có sequence diagram hai chiều.

## Xuất
- `docs/slide/04_slide_outline.md`
- `docs/slide/05_slide_content.md`
- `docs/slide/06_workflow_trace.md`
