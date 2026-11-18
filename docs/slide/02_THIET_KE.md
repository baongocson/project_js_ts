# 02 — Thiết kế slide và sơ đồ
Đọc 00, 01, evidence. Phong cách **Academic Minimalism**, 16:9, phù hợp phòng học.

## Màu sắc
- Nền `#F8FAFC`; trắng `#FFFFFF`; xanh pastel `#DCEAF7`.
- Tiêu đề `#244563`; nhấn `#527DA3`; chữ `#475569`; viền `#E2E8F0`.
- Font Arial/Aptos/Inter có tiếng Việt; chữ lớn, tương phản tốt.
- Ít animation, không gradient mạnh, khoảng trắng rộng, bố cục thống nhất.
- Một slide tập trung một ý; ưu tiên sơ đồ thay vì nhiều chữ.

## Hình cần có khi có nguồn
1. Kiến trúc tổng thể.
2. Use Case chính.
3. Database schema/ERD phù hợp MongoDB.
4. API request/response thực tế.
5. Frontend và Backend module architecture.
6. User Flow có nhánh lỗi.
7. **Sequence Diagram FE → BE → DB → BE → FE** đúng file mã nguồn.
8. Docker/Nginx deployment.
9. AI flow nếu có thiết kế/triển khai được chứng minh.
10. Biểu đồ kiểm thử chỉ khi có số đo thật.

## Quy tắc
- SVG/vector ưu tiên, không mờ hoặc cắt chữ.
- Screenshot phải là ảnh thật từ ứng dụng; không tạo giao diện giả.
- Ghi rõ “Sơ đồ thiết kế” nếu chưa triển khai.
- Mũi tên, request/response, tên file, nhánh lỗi chính xác.
- Mỗi hình có nguồn trong repo.

## Xuất
- `docs/slide/assets/diagrams/`
- `docs/slide/07_design_spec.md`
- `docs/slide/08_diagram_sources.md`
