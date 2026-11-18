# Hoàn thiện fix-frontend sau review — 18/11/2026

Phạm vi: hoàn thiện nhánh `fix-frontend` từ commit `d9547bc` theo khuyến nghị review, kiểm thử rồi merge vào `main`.

## Thay đổi

- Giữ ProfilePage chỉ PATCH `displayName`. Theme được lưu riêng từ ThemeSwitcher trên header; form Profile không giữ bản theme cũ để ghi đè khi lưu tên. Acceptance kiểm đổi theme sau khi mở Profile, lưu tên và reload giữ cả hai giá trị.
- Giữ `pretest:unit` của frontend để build `@dashboard/data-core` trước khi chạy unit tests.
- Bỏ `manualChunks` gom Three/Fiber cùng dependency chung vào `vendor-three`. Bản trước sinh `modulepreload` của chunk khoảng963KB ngay trong HTML trang đăng nhập, nên thư viện3D nằm trên đường tải ban đầu. Khôi phục cấu hình Vite của main để WebGLScatter tiếp tục được import động.
- Bỏ việc nâng ngưỡng cảnh báo bundle lên1000KB. Build vẫn công khai cảnh báo chunk WebGL lớn; cảnh báo này không được dùng làm lý do kéo thư viện3D vào entry hoặc che giới hạn bundle.
- Đưa `package-lock.json` về đúng bản main, loại phần nâng nhóm ESLint8.72.2→8.73.0 không liên quan. Không cài thêm dependency hoặc thay manifest phiên bản thư viện.
- Cập nhật README auth theo vị trí lưu theme hiện hành. Không đổi API/backend/database/core hoặc service worker.

## Kiểm tra bundle

Production build giữ app entry riêng và chunk WebGLScatter khoảng958KB (gzip256KB). HTML không preload chunk Three/WebGL. Kiểm tra trình duyệt mới tại trang đăng nhập, chặn service worker riêng cho phép đo dependency của trang: chỉ tải `index-*.js` và `index-*.css`, không tải WebGL/vendor-three, không có lỗi JavaScript.

`offline-assets.json` vẫn chứa WebGLScatter. Service worker tiếp tục chủ động precache asset để đảm bảo3D offline; đây là tác vụ cache nền, khác với dependency bắt buộc của entry. Không vô hiệu hóa precache để làm đẹp kết quả tải trang.

## Kiểm thử

- Lint frontend: đạt.
- Typecheck và architecture check frontend: đạt,111file không có vòng phụ thuộc.
- Frontend unit:29/29đạt, bao gồm chạy hook pretest build core.
- Build backend/frontend: đạt; backend được build để chạy bộ acceptance cô lập, không sửa source backend.
- Acceptance HTTPS/Nest/MongoDB replica tạm:53/53đạt. Bao gồm Profile/theme với backend thật,27fixture processing online và offline/server parity, WebGL offline trước khi từng mở renderer, chunk fallback, account lifecycle, CAS, receipt loss, quota, backup/restore, sync và mobile.
- Design-system browser:16/16đạt. Bao gồm theme/light/dark/system, responsive, contrast/focus, WebGL/SVG, context recovery và workload100–10000điểm. Một số ca contract UI dùng server giả lập theo tên test; không thay thế53ca nghiệp vụ phía trên.
- Kiểm tra phạm vi trước commit: Vite config và lockfile khớp hoàn toàn `origin/main`; phần thay đổi cuối so với main chỉ còn Profile, hook pretest, acceptance tương ứng và tài liệu.

Artifact/ảnh/trace ở `frontend/test-results/` và thư mục `.artifact-work/`, không đưa vào commit. Các kiểm thử nghiệp vụ dùng MongoDB replica tạm và HTTPS/API riêng, không dùng tài khoản hoặc database người dùng.
