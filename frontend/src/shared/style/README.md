# Style chung — Dark Analytics + Futuristic 3D

## 1. Giới thiệu

Module định nghĩa giao diện dùng chung của Dashboard 3D. Giai đoạn 1 chỉ thay lớp trình bày: màu, bề mặt, viền, bóng, chữ và trạng thái control. Không đổi bố cục nghiệp vụ, router, API hoặc dữ liệu.

**Design token** là biến CSS có tên theo vai trò, ví dụ `--surface` cho nền card. Dùng token giúp đổi theme đồng bộ thay vì sửa mã màu ở từng màn hình.

Hover là trạng thái rê chuột; active là lúc đang nhấn; disabled là bị khóa; focus-visible là viền nhận biết vị trí thao tác bằng bàn phím. Surface là bề mặt chứa nội dung, radius là độ bo góc và shadow là bóng đổ.

## 2. Chức năng chính

- Dark mode: background `#0B1220`, surface `#111C30`, elevated surface `#17253D`, primary `#3B82F6`, purple `#A855F7`, cyan `#22D3EE`, success `#34D399`, warning `#FBBF24`, danger `#FB7185`, text `#F1F5F9`, secondary text `#94A3B8`.
- Light mode dùng nền sáng và accent xanh có độ tương phản phù hợp; giữ System mode theo cơ chế sẵn có.
- Card có gradient nhẹ, viền và bóng mềm. Control có hover/active/disabled/focus-visible.
- Đồng bộ input/select/textarea, checkbox native, tab, dialog, toolbar, badge và bảng.
- Tôn trọng reduced motion (yêu cầu giảm chuyển động của hệ điều hành), forced colors (bảng màu tương phản hệ thống) và responsive.

## 3. Cấu trúc thư mục

| File | Vai trò |
| --- | --- |
| `tokens.css` | Token light/dark, font, spacing, radius, shadow, thời lượng transition và reduced motion |
| `global.css` | Bố cục, grid, kích thước và các selector hiện hữu; giữ nguyên logic bố trí workspace |
| `design-system.css` | Skin component sau legacy CSS; giới hạn theo class/control trong main hoặc dialog |
| `shell.css` | Sidebar/header/theme selector responsive và project cards |
| `analytics.css` | KPI/table/processing/history và legend/khung visualization |
| `index.ts` | Không tự nạp CSS qua JavaScript barrel |
| `../../index.css` | Import lần lượt tokens → global → design-system |

## 4. Luồng hoạt động

`main.tsx` nạp `src/index.css`. ThemeEffect hiện có đặt `data-theme` trên phần tử html. Trình duyệt chọn token tương ứng rồi áp dụng vào các component.

**Cascade** là quy tắc xác định khai báo CSS được ưu tiên. Skin được import cuối để cập nhật màu/control; nó không thay số cột grid, thứ tự tab hoặc handlers. Các alias `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--tint`, `--button-bg` được giữ để code cũ tiếp tục hoạt động.

## 5. Thành phần và quy tắc quan trọng

- `:root`: light mặc định; `:root[data-theme="dark"]`: palette dark.
- `--surface-elevated`: bề mặt cao hơn như KPI, secondary button, dialog.
- `--control-border`: viền control rõ hơn viền card trang trí.
- `--focus`: outline 3px cho thao tác bàn phím; sửa cả focus của cell-button vốn có `all: unset`.
- `--button-bg`: màu nền thao tác, có thể tối hơn brand primary để chữ trắng đạt contrast; không đổi giá trị `--primary`.
- Native checkbox/range giữ hành vi trình duyệt; không dùng hình giả thay input.

## 6. Props, state và dữ liệu

CSS không có React props/state và không đọc dataset. Đầu vào là class, pseudo-class như `:disabled`, thuộc tính ARIA và `data-theme` đã có. Không viết localStorage, IndexedDB, preferences hoặc API.

ThemeEffect vẫn ưu tiên preferences tài khoản, sau đó lựa chọn lưu và hệ thống. Không thêm cơ chế chọn theme thứ hai trong CSS.

## 7. Hướng dẫn sử dụng

Chọn Sáng/Tối/Theo hệ thống ngay trên header hoặc trong màn hình hồ sơ. Trong component, dùng token theo ý nghĩa, ví dụ `background: var(--surface)` và `color: var(--text)`.

Không thêm màu hard-code cho component mới nếu đã có token phù hợp. Gradient dùng để trang trí nhẹ, không phủ lên chữ hay biểu thị dữ liệu chưa được tính.

## 8. Hướng dẫn kiểm thử

Từ gốc repository, dùng compiler trực tiếp để tránh prehook build core:

```powershell
node node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.test.json
node node_modules/typescript/bin/tsc --noEmit -p frontend/test/design-system/tsconfig.json
node node_modules/@playwright/test/cli.js test -c frontend/test/design-system/playwright.config.ts
git diff --check
git diff --name-only
```

Xem `frontend/test/design-system/README.md` để đặt thư mục tạm trong frontend khi chạy browser test. Test kiểm light/dark/system, preference đã lưu, focus, dialog, reduced motion, responsive và smoke local import/SVG. Không coi fixture API401 là kiểm chứng authentication/backend thật.

Build chỉ frontend: tại `frontend/`, chạy `node --input-type=module -e "import { build } from 'vite'; await build({ root: process.cwd(), configLoader: 'runner', envDir: false });"`. Output ở frontend/dist; không chạy npm prebuild của core. Core artifact cần đã có sẵn và tương thích.

## 9. Phụ thuộc

CSS thuần và tính năng trình duyệt; không thêm framework UI, font ngoài, dependency hoặc hiệu ứng hậu kỳ Three.js. Các component React dùng class hiện hữu từ shared/ui và features.

## 10. Giới hạn và lưu ý

- Palette Three.js/SVG và numeric coloring hiện nằm trong analysis/scatter-colors.ts; category chưa có vì response điểm không chứa category từng dòng.
- shell.css bổ sung sidebar responsive; analytics.css phân cấp KPI/bảng/preview/history. Token spacing chưa thay mọi pixel legacy trong app.
- Native select/checkbox có thể khác hình thức giữa trình duyệt/hệ điều hành.
- Test contrast hiện tập trung nút chính; không tuyên bố toàn sản phẩm đã audit WCAG đầy đủ.
- Không dùng `npm run build/typecheck/test:acceptance` qua wrapper nếu đang bị giới hạn frontend-only: các wrapper hiện có gọi core/backend.

### Neon Cyber Analytics — token trang trí

Nền dùng radial gradient tĩnh `--ambient-purple`, `--ambient-cyan` và lưới `--grid-line`; không có vòng animation. Card dùng hai lớp background: `--glass` ở padding-box giữ chữ dễ đọc và `--neon-border` ở border-box tạo viền chuyển màu. Chỉ header dùng blur 8px nếu trình duyệt hỗ trợ; card không blur hàng loạt để bảo vệ FPS.

Tùy chỉnh `--glow-color` (alpha quyết định cường độ) và `--glow-radius` (độ lan) để giảm/tăng ánh sáng. `--gradient-action` dùng stop xanh/tím tối cho chữ trắng; `--gradient-heading` chỉ áp dụng tiêu đề chính. `--hover-lift` giới hạn dịch chuyển 2px, về 0 khi reduced motion. Disabled bỏ gradient, glow và dịch chuyển; forced colors dùng màu hệ thống. Light mode có token riêng nhẹ hơn. Các hiệu ứng không đọc hoặc sửa dữ liệu.
