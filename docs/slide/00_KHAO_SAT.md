# 00 — Khảo sát và nguyên tắc
Bạn là Codex Agent tại `D:\JS_TS\project_js_ts`. Thư mục làm việc cho slide: `D:\JS_TS\project_js_ts\docs\slide`.
Đọc prompt theo thứ tự 00 → 05. Tạo **30–35 slide**, thuyết trình **tối đa 15 phút**.

## Bất biến
- Chỉ lấy thông tin từ repository, code, docs và bằng chứng thật; không bịa kết quả, API, chức năng, chi phí AI, số liệu k6.
- Phân biệt: đã triển khai có kiểm chứng / đã triển khai chưa kiểm chứng / một phần / chỉ thiết kế / chưa có.
- Mã nguồn chứng minh triển khai; tài liệu thiết kế không chứng minh đã chạy.
- Không sửa code ứng dụng, không xóa dữ liệu, không deploy, không chạy stress test vào môi trường thật.
- Không đưa secret, `.env`, token, mật khẩu lên slide.
- Thiếu nguồn: ghi rõ “Chưa có bằng chứng trong repository”.

## Khảo sát
1. README, docs, docs/slide, cấu trúc apps/packages/scripts.
2. Frontend: router, components, features, API client, state, CSS.
3. Backend: routes, controllers, services, repositories, validation, auth.
4. Database: schema, collection, index, versioning.
5. AI/ML: tác vụ, input/output, cách gọi, lưu kết quả, chi phí nếu có.
6. Docker, Nginx, HTTPS, cấu hình triển khai.
7. Unit/integration/E2E/security/k6: tách script và kết quả thực tế.
8. Ảnh giao diện thật, sơ đồ và tài liệu có sẵn.

## Xuất
- `docs/slide/01_repo_inventory.md`: các thành phần và trạng thái.
- `docs/slide/02_evidence_matrix.md`: yêu cầu → file nguồn → trạng thái.
- `docs/slide/03_missing_evidence.md`: thiếu gì và cần chứng cứ nào.
Mọi kết luận kỹ thuật phải truy được đường dẫn file thực tế.
