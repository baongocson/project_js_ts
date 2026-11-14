# Tiến độ tiếp nhận bàn giao (14/11/2026)

## Nguồn

- ZIP cập nhật mới nhất tương ứng commit `1067712` (`baongocson/project_js_ts`, nhánh `main`).
- Giữ nguyên source Backend và bộ contract MongoDB đã có; bản vá hiện tại chỉ bổ sung Frontend offline và tài liệu.
- **Không được tự merge lên `main`**; cần tạo nhánh riêng trước khi áp dụng bản này.

## Đã thực hiện trong bản vá

- Tích hợp vào bản source commit 1067712 một bản demo browser-first: nhập CSV, bảng, phép chiếu 3D bằng toán học Canvas, Preview trim/fill, Apply và Restore tạo local version mới, lưu IndexedDB.
- Giữ toàn bộ Backend database contracts, schemas, validators, index và API/DTO gốc không đổi.
- Thêm kiểm tra giới hạn CSV 16.000.000 byte ngay lúc chọn file, tối đa 1.000 cột, và xử lý 3D với CSV ít hơn ba cột.
- Xếp hàng tuần tự các ghi IndexedDB để thao tác lưu trước không ghi đè thao tác mới khi hoàn thành trễ.
- Đã chạy `npm run test:local-engine -w frontend`: **8/8 PASS** (logic CSV/transform/version). Đã compile `model.ts` bằng TypeScript strict trong script này.
- Tạo tài liệu `docs/HUONG_DAN_API_DTO_ERD_TU_SO_0.md` giải thích tất cả 27 API/DTO và 12 collection.
- Bổ sung README thật trạng thái cho 7 NestJS module nghiệp vụ.

## Chưa xác minh / chưa thực hiện

- Chưa chạy lại kiểm thử MongoDB Atlas từ môi trường này, không thay đổi cluster chung. Theo `docs/database.md` trước đó: **46/46 DB tests PASS** tại môi trường nhóm trưởng.
- Chưa xác minh build toàn bộ React+NestJS, typecheck toàn repo, 56 contract tests hoặc browser E2E trong bản vá này.
- **Chưa có đồng bộ offline → Atlas**; `pendingSync` trong browser không tự gửi dữ liệu về server. Không được trình bày đã hoàn thành chức năng sync.
- 27 API nghiệp vụ vẫn còn `501` khi request hợp lệ. Backend Auth/Project/Import/Preview/Apply/History/Restore thực tế chưa triển khai.
- Chưa có giao diện đăng nhập, ownership guard, phục hồi dữ liệu server, PWA mở trang khi mất mạng, đầy đủ 27 phương pháp xử lý, kiểm thử end-to-end thật.

## Thứ tự phát triển sau bản demo offline

1. Trên nhánh mới: install + build + typecheck + unit + 56 DTO/HTTP contract tests + 46 DB tests trong database sandbox (sau khi có credential được thu hồi/đổi mật khẩu đúng cách).
2. Chạy browser E2E cho demo local (CSV → 3D → Preview → Apply → History → Restore; Backend tắt giữa phiên).
3. Triển khai Auth/session/ownership đúng D01–D26.
4. Triển khai Project/Workspace, rồi import CSV/schema/chunk/version + frontend service thật.
5. Triển khai Preview edit_cell + Apply + History/Restore với CAS, Idempotency-Key, transaction thật.
6. Thiết kế và test sync queue: local operation → authenticated API, receipt/hash, base revision, conflict UX; không tạo version trùng.
7. Mở rộng Analysis/3D và các phương pháp cleaning/missing/outliers/scaling/transform/encoding; thêm unit/integration/E2E và AI prompting log đầy đủ.

## Checklist kiểm tra nguồn

```powershell
npm ci
npm run typecheck
npm run build
npm run test:contracts -w backend
npm run test:http -w backend
npm run test:local-engine -w frontend
# Chỉ khi cấu hình DB test an toàn và được cấp phép:
npm run db:verify -w backend
npm run test:database -w backend
npm run dev
```

**Bảo mật:** đoạn hội thoại đã lộ database credential; đổi mật khẩu và dùng user quyền tối thiểu. Không commit `.env` hoặc dùng lại credential cũ.

## Kiểm tra `any` bằng TypeScript AST

Đã thêm `npm run check:no-any` để phát hiện **explicit TypeScript `any`** trên 76 file nguồn và báo file/dòng nếu có. Lệnh đã chạy `PASS` trong môi trường kiểm toán. Chuỗi literal `'any'` trong tham số nghiệp vụ (`drop_missing_rows`) không phải type `any` nên không bị đánh dấu. Vẫn cần TypeScript `strict` và review các kiểu khai báo lách qua alias hoặc suppressions.

## Cài đặt dependencies trong môi trường kiểm toán

- `npm ci --offline` thất bại vì npm cache thiếu gói (ENOTCACHED).
- `npm ci` tiếp tục thất bại với lỗi trình quản lý npm `Exit handler never called!`.
- Chưa thể gọi `npm run build` và toàn bộ lệnh typecheck/contract suites; không suy luận PASS từ kiểm thử 8 unit.
