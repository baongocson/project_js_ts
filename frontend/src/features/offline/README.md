# Feature offline

Phần dành cho khả năng làm việc offline theo kế hoạch. Checkout hiện chưa có offline engine, IndexedDB hoặc đồng bộ; chưa tạo triển khai giả.

## Cấu trúc và luồng dự kiến

- `api/`: endpoint riêng của feature, gọi transport ở shared/api.
- `components/`: UI đặc thù của feature.
- `hooks/`: logic/trạng thái tái sử dụng trong feature.
- `pages/`: màn hình được app router lắp ghép.
- `types.ts`: kiểu dữ liệu riêng của feature.
- `index.ts`: API công khai, chỉ export thành phần thực sự được triển khai.

Luồng dự kiến khi có nghiệp vụ: app router → page → hooks/API → shared/api → backend. Feature được dùng shared; không import ngược app. Chưa có code nghiệp vụ nên index/types hiện chỉ đánh dấu TypeScript module (`export {}`), không giả lập thành công.

## Chạy và kiểm tra

Từ gốc repo: `npm run dev -w frontend`, `npm run typecheck -w frontend`. E2E chung: `npm run test:e2e:frontend`. Hiện chưa có test chứng minh nghiệp vụ offline hoàn thành; chỉ có E2E trang hệ thống. Khi triển khai, thêm test luồng tương ứng và export qua index, cập nhật README.
