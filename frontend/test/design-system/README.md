# Kiểm thử Design System — Giai đoạn 1

## 1. Giới thiệu

Bộ kiểm thử UI độc lập dùng Playwright và trình duyệt đã cài, chỉ phục vụ kiểm design system frontend. Không khởi động MongoDB, backend hoặc build data-core.

Playwright tự động thao tác trình duyệt như người dùng. Fixture là trang mẫu cô lập để kiểm component. Smoke test kiểm một luồng cơ bản từ đầu đến cuối. DOM là cấu trúc HTML của trang; computed style là CSS thực tế sau khi trình duyệt áp dụng các quy tắc.

## 2. Chức năng chính

Kiểm light/dark, system preference, lựa chọn lưu qua reload, contrast nút chính, disabled, lỗi input, checkbox, focus, dialog/Escape/focus return, reduced motion, không tràn ngang tại390/1366/1920px. Smoke test thật trên /offline import CSV thử, mở bảng, SVG fallback và chọn dòng bằng bàn phím.

## 3. Cấu trúc thư mục

- `fixture.html`, `fixture.tsx`: trang mẫu chỉ dành cho test, import đúng controls và CSS production; không gắn vào router/app.
- `design-system.spec.ts`: test trình duyệt và ảnh chụp màn hình.
- `playwright.config.ts`: port4175, output frontend/test-results/design-system, ưu tiên Edge/Chrome đã cài nếu có.
- `vite.config.ts`: dùng cấu hình app, tắt đọc .env và bỏ watcher với artifacts/browser profiles.
- `tsconfig.json`: kiểm cả fixture TSX và cấu hình/test TypeScript.

## 4. Luồng hoạt động

Playwright chạy Vite frontend → mở fixture hoặc route thật → thao tác control → kiểm DOM/computed style → lưu screenshot. API của test route thật được trả401 có kiểm soát để không dùng tài khoản/backend thực. Test local tạo CSV riêng trong browser context tạm; không dùng dữ liệu người dùng.

## 5. Component và hàm quan trọng

Fixture gọi Button/Field/Feedback/Dialog production. Phép tính contrast dùng luminance (độ sáng tương đối) của chữ và nền, yêu cầu nút chính đạt4,5:1. Test theme dùng ThemeEffect thật của app; không sửa implementation để vượt test.

## 6. Props, state và dữ liệu

Fixture chỉ có state mở/đóng dialog. Theme được đặt trực tiếp trên html của fixture; test app thật dùng media preference và key fe-theme hiện có. CSV smoke gồm3dòng x/y/z/label; dữ liệu nằm trong context test mới.

## 7. Hướng dẫn sử dụng

Chạy từ gốc bằng PowerShell để mọi output/temp của test ở frontend:

```powershell
New-Item -ItemType Directory -Path frontend/.artifact-work/design-system-runtime -Force | Out-Null
$env:TEMP = (Resolve-Path frontend/.artifact-work/design-system-runtime).Path
$env:TMP = $env:TEMP
node node_modules/@playwright/test/cli.js test -c frontend/test/design-system/playwright.config.ts
```

Vite dùng port4175 và không tái sử dụng server khác. Đóng test trước khi dùng lại cổng. Không cài trình duyệt tự động: nếu không có Edge/Chrome hoặc Playwright browser đã cài thì báo dependency thiếu.

## 8. Hướng dẫn kiểm thử

```powershell
node node_modules/typescript/bin/tsc --noEmit -p frontend/test/design-system/tsconfig.json
node node_modules/@playwright/test/cli.js test -c frontend/test/design-system/playwright.config.ts --grep "theme|reduced"
```

Khi chạy browser, đặt TEMP/TMP như mục7. Screenshots/trace ở frontend/test-results/design-system (Git ignored). Xem ảnh cả hai theme và nhiều viewport; không thay assertion thành PASS khi server/test fail.

## 9. Phụ thuộc

Playwright, Vite, React và TypeScript đã có trong repository; trình duyệt cục bộ. Fixture đọc CSS/controls hiện có và core artifact của app, không build hoặc chỉnh package ngoài frontend.

## 10. Giới hạn và lưu ý

Đây không phải full backend acceptance, kiểm authentication thành công hoặc nghiệm thu sync. Không chứng minh mọi browser/GPU và mọi component đạt WCAG. Test trực tiếp SVG fallback, không coi đó là kiểm chứng WebGL context loss/recovery. Chunk WebGL giữ nguyên, chưa tối ưu bundle ở giai đoạn1.

Lượt đầu watcher gặp EBUSY khi theo dõi browser profile đặt trong frontend; cấu hình test riêng đã loại profile/artifacts khỏi watcher. Không sửa cấu hình Vite production để giải quyết vấn đề test.

### Kiểm tra neon

Contrast nút chính kiểm từng stop RGB của gradient; disabled phải bỏ background-image. Responsive bao gồm 375/768/1366/1920px. Reduced motion kiểm cả thời lượng và độ dịch chuyển hover. Đây là các kiểm tra trình bày, không chứng minh nghiệp vụ backend.

### Visualization fixture

visualization.html/tsx render Scatter3D thật với dữ liệu kiểm thử được ghi nhãn rõ. Query count hỗ trợ 100/1000/4000/10000 điểm để đánh giá UI riêng. Không nằm trong router/production build. Browser tests kiểm numeric legend, semantic/theme mapping, SVG keyboard và WebGL context extension; kết quả headless không đại diện FPS trên GPU người dùng.

### Acceptance local trên production build

Sau build frontend trực tiếp (xem shared/style README), chạy:

```powershell
$env:TEMP = (Resolve-Path 'frontend/.artifact-work/design-system-runtime').Path
$env:TMP = $env:TEMP
node node_modules/@playwright/test/cli.js test -c frontend/test/design-system/acceptance-local.config.ts
node --experimental-strip-types --test frontend/test/offline/replay.test.mjs
```

Config chỉ chọn 7 ca acceptance hiện có: WebGL point editor, IndexedDB migration/offline reload, CAS hai tab, quota/export, blocked upgrade, quota import và quota Apply. Mỗi ca dùng browser context riêng; không khởi động backend hoặc ghi database thật. Preview same-origin tắt CORS riêng cho fixture: Vite mặc định thêm Vary: Origin khiến request precache không có Origin khác request module crossorigin và cache miss khi offline. Không sửa service worker để vượt test. Triển khai thật có header Vary khác cần nghiệm thu lại tại môi trường đó.

Bộ design-system có 16 ca: theme/light/dark/system, controls, contrast gradient, dialog/focus, reduced motion, forced colors, shell/mobile/protected routes, local import/edit/processing/restore, numeric/SVG palette, WebGL pointer/pin/projection/context lifecycle/unavailable và workload100/1000/4000/10000. CRUD/profile kiểm với server giả lập được ghi nhãn, không phải nghiệm thu backend.
