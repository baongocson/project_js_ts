# Kiểm tra kiến trúc

`check-architecture.mjs` dùng TypeScript parser/resolver để đọc import, re-export và dynamic import có đường dẫn literal trong src. Kiểm chiều app → features/shared, features → shared, shared chỉ dùng shared; phát hiện import sâu từ bên ngoài feature và vòng phụ thuộc trong code nội bộ. `tsc` phụ trách đường dẫn không tồn tại và lỗi kiểu.

Chạy từ gốc: `npm run check:architecture -w frontend`. Được gọi trong typecheck frontend. Không phân tích đường dẫn import tính động từ biến; khi thêm loại đó cần rà soát thủ công. Không áp quy tắc này cho dependency, CSS hoặc file build.

`run-e2e.mjs` chạy build frontend với VITE_API_BASE_URL=/api/v1 riêng cho tiến trình thử, build backend, rồi gọi Playwright. Không sửa .env, giữ nguyên các lệnh build phát triển/production. Chạy `npm run test:e2e:frontend` từ gốc; có thể thêm đối số Playwright qua `npm run test:e2e -w frontend -- --workers=1`.
