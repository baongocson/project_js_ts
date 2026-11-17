# Báo cáo Neon Cyber Analytics + Futuristic 3D

Nhánh: feat/ui-3d-redesign-nguyen. Chỉ thay đổi frontend; không commit/push/merge, không cài thư viện, không sửa .env/contract/core/backend/database. Phát triển tiếp design system trước đó, giữ nguyên các thay đổi đang có.

## 1. Tổng quan

Nền navy với radial purple/cyan và lưới tĩnh; viền gradient, glass có kiểm soát, soft glow, button xanh–tím, tiêu đề phân cấp, sidebar responsive và visualization đa sắc. Light/Dark/System vẫn theo ưu tiên tài khoản > lựa chọn local > hệ thống. Không có animation nền liên tục.

## 2. Kết quả từng giai đoạn

| Giai đoạn | Thay đổi | Bằng chứng |
| --- | --- | --- |
| 1 — Design system | Tokens neon, background, card/control/form/tab/dialog states, focus/reduced motion/forced colors | Browser light/dark/system, contrast gradient, dialog, focus, 375/768/1366/1920px |
| 2 — Shell/dashboard | Header glass, theme selector dễ tìm, sidebar route thật và mobile toggle; accent project cards; giữ tám bước workspace | Shell/protected routing/theme reload tests, CRUD/profile contract UI với server giả lập |
| 3 — Analytics | KPI thật phân cấp, toolbar/trục, bảng sticky/selection/missing, preview/history | Import/filter độc lập KPI, preview trước publish, Apply, restore, reload local |
| 4 — Visualization | Palette WebGL/SVG/legend chung, gradient X/Y/Z, grid/trục, tooltip, selection, context lifecycle | Numeric/full bounds/extreme unit tests, SVG keyboard/theme, WebGL hover/pin/projection/camera/context loss-restored/unavailable |
| 5 — Nghiệm thu | Workload 100/1000/4000/10000, responsive/a11y, production local regression | 16 browser UI tests, 7 acceptance local, unit/queue/typecheck/lint/architecture/build |

## 3. Module và README

- App/navigation: [src/app/README.md](src/app/README.md).
- Design system: [src/shared/style/README.md](src/shared/style/README.md).
- Controls/workspace UI: [src/shared/ui/README.md](src/shared/ui/README.md).
- Projects: [src/features/projects/README.md](src/features/projects/README.md).
- Datasets/table: [src/features/datasets/README.md](src/features/datasets/README.md).
- Processing: [src/features/processing/README.md](src/features/processing/README.md).
- History: [src/features/history/README.md](src/features/history/README.md).
- Visualization/analysis: [src/features/analysis/README.md](src/features/analysis/README.md).
- Browser QA: [test/design-system/README.md](test/design-system/README.md).

Các README module đã có đủ 10 mục, giữ tài liệu nghiệp vụ hiện hữu và bổ sung phạm vi UI thực tế.

## 4. Chức năng và bảo toàn dữ liệu

Không thay authentication/session transport, router/RequireSession, CRUD handlers, CSV parser/schema, processing methods, API adapter, history/restore, IndexedDB, backup hoặc sync logic. ThemeSwitcher dùng session.patch preferences đã được API hiện hữu hỗ trợ; khách dùng fe-theme và sự kiện nội bộ để ThemeEffect đọc lại. ThemeEffect giữ nguyên precedence và lắng nghe OS/storage.

Numeric color setting chỉ là React state trong Scatter3D, không thêm persisted colorMode. Remount có thể đặt lại setting. Bounds toàn phiên bản được ưu tiên; khi thiếu axes, legend ghi rõ miền của điểm hiển thị. Không thay normalization, sample membership, rowId hoặc giá trị. Selected có màu riêng và kích thước/viền; tooltip/title/danh sách giữ thông tin chữ.

## 5. Chưa triển khai / chưa nghiệm thu

- Category coloring: response điểm không chứa category từng dòng. Không lấy hàng nghìn row để dựng giả; cần thống nhất dữ liệu hỗ trợ trước.
- Chưa chạy E2E server thật cho login/register/profile, online Projects/CSV/processing/history và sync end-to-end. Backend cổng3000 không hoạt động; không khởi động hay sửa backend trong phạm vi này. CRUD/profile browser dùng server giả lập chỉ chứng minh UI/contract.
- Chưa đo FPS/GPU thật, chưa kiểm Safari/Firefox hoặc screen reader thực. Không tuyên bố audit WCAG toàn sản phẩm.

## 6. Kết quả kiểm thử thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| tsc --noEmit: app, tsconfig.test, design-system config | Đạt |
| ESLint frontend --max-warnings=0 | Đạt |
| Kiến trúc frontend | 111 file, đúng chiều import, không vòng |
| Frontend unit | 29/29 đạt |
| Offline replay unit | 10/10 đạt |
| Browser UI/visualization | 16/16 đạt; Edge headless có WebGL |
| Acceptance local trên production build | 7/7 đạt |
| Build frontend trực tiếp | Đạt; có cảnh báo chunk WebGL lớn |
| git diff --check | Đạt, chỉ cảnh báo chuyển LF/CRLF |

Ca acceptance chọn từ test hiện có: WebGL point editor, IndexedDB migration + offline reload, workspace CAS hai tab, quota/export, blocked upgrade, quota import và quota Apply. Mỗi ca dùng browser context thử nghiệm riêng.

Lỗi đã xử lý: selector history local khác online; label numeric cần liên kết ID rõ; context restore test phải giữ extension trước loss; Vite preview Vary: Origin gây cache miss. Chỉ tắt CORS ở config preview thử nghiệm same-origin để kiểm cache, không sửa service worker. Toàn bộ ca liên quan đã chạy lại đạt.

## 7. Hiệu năng và WebGL

Build hiện tại: JS chính 477.14kB (149.67kB gzip); WebGL lazy chunk 958.12kB (256.30kB gzip); CSS 32.48kB (7.47kB gzip). WebGL trước đó khoảng958kB, chưa cần thay code splitting hoặc dependency. InstancedMesh, demand frames, DPR1–1.5 giữ nguyên. Điểm dùng material không bị ánh sáng làm lệch palette; không bloom/postprocessing. Grid tĩnh; texture ticks dispose khi đổi/unmount; listener context được dọn.

Workload browser gồm mở WebGL, xoay, chuyển SVG, reset và chọn điểm cuối: 100điểm/375px khoảng1.4s; 1000/768 khoảng1.9s; 4000/1366 khoảng3.0s; 10000/1920 khoảng4.9s trong lần chạy UI đầy đủ. Đây là thời gian test gồm trình duyệt, không phải FPS hay SLA. SVG10000 vẫn là10000 DOM nodes; thiết bị yếu nên dùng WebGL hoặc giảm sample bằng control sẵn có.

## 8. Accessibility và responsive

Đã kiểm focus-visible3px, keyboard skip link, dialog focus/Escape/return, checkbox native, gradient button contrast >=4.5 tại các stop, reduced-motion tắt transition/lift, forced-colors và không tràn ngang tại375/768/1366/1920. Chỉ một điểm SVG nhận Tab, arrow/Home/End di chuyển và Enter/Space chọn. Chú giải có chữ, selection có viền/kích thước; không chỉ dùng màu.

## 9. Rủi ro còn lại

Blur chỉ header và có fallback, nhưng native select/font có thể khác theo OS. WebGL lớn vẫn cảnh báo build. Service-worker offline phải kiểm lại trên hosting thật nếu thêm Vary/CORS khác fixture. Numeric gradient không biểu thị flags bằng màu cùng lúc; xem tooltip/title/danh sách. Không sửa storage/sync để giải quyết giao diện.

## 10. Cách chạy và kiểm tra

Tránh npm predev/prebuild vì gọi core ngoài frontend. Từ gốc repo, vào frontend rồi chạy trực tiếp với config không đọc .env:

```powershell
cd frontend
node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort --config test/design-system/vite.config.ts --configLoader runner
```

Mở localhost5173/offline. Chọn Giao diện trên header; mobile mở Điều hướng. Import CSV riêng để xem KPI/table, chuyển Không gian3D và chọn Màu hiển thị. Numeric settings không ghi workspace. Dùng hình chiếu tương thích để kiểm SVG, chọn điểm và sửa ô trên dữ liệu thử.

Các lệnh build/test an toàn đầy đủ ở test/design-system/README.md và src/shared/style/README.md. Không chạy wrapper acceptance có backend hoặc build core ngoài phạm vi.

## 11. Phạm vi Git

Danh sách bên dưới bao gồm tracked và untracked; dist/.artifact-work/test-results được bỏ qua, không đưa vào Git. Không có file ngoài frontend. Chưa stage hoặc commit.

## 12. Danh sách file thay đổi

- `frontend/NEON-REDESIGN.md`
- `frontend/src/app/components/AppShell.tsx`
- `frontend/src/app/components/ThemeEffect.tsx`
- `frontend/src/app/components/ThemeSwitcher.tsx`
- `frontend/src/app/README.md`
- `frontend/src/features/analysis/components/Scatter3D.tsx`
- `frontend/src/features/analysis/components/ScatterFallback.tsx`
- `frontend/src/features/analysis/components/ScatterLegend.tsx`
- `frontend/src/features/analysis/components/WebGLScatter.tsx`
- `frontend/src/features/analysis/README.md`
- `frontend/src/features/analysis/scatter-colors.ts`
- `frontend/src/features/datasets/README.md`
- `frontend/src/features/history/README.md`
- `frontend/src/features/processing/README.md`
- `frontend/src/features/projects/README.md`
- `frontend/src/index.css`
- `frontend/src/shared/style/analytics.css`
- `frontend/src/shared/style/design-system.css`
- `frontend/src/shared/style/global.css`
- `frontend/src/shared/style/README.md`
- `frontend/src/shared/style/shell.css`
- `frontend/src/shared/style/tokens.css`
- `frontend/src/shared/ui/README.md`
- `frontend/test/design-system/acceptance-local.config.ts`
- `frontend/test/design-system/design-system.spec.ts`
- `frontend/test/design-system/fixture.html`
- `frontend/test/design-system/fixture.tsx`
- `frontend/test/design-system/playwright.config.ts`
- `frontend/test/design-system/README.md`
- `frontend/test/design-system/tsconfig.json`
- `frontend/test/design-system/visualization.html`
- `frontend/test/design-system/visualization.tsx`
- `frontend/test/design-system/vite.config.ts`
- `frontend/test/unit/scatter-colors.test.ts`
- `frontend/tsconfig.test.json`
