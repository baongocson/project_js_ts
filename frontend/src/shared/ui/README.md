# UI dùng chung

## 1. Giới thiệu

Module cung cấp component React dùng chung. Giai đoạn 1 nâng cấp hình thức qua shared/style; **không sửa code, props hoặc logic của controls.tsx và WorkspaceLayout.tsx**.

**Props** là thông tin component nhận từ cha. **State** là trạng thái React giữ trong component. Business state như project, preview và receipt vẫn thuộc feature/app, không chuyển vào UI.

Component là khối giao diện tái sử dụng. Native nghĩa là dùng control HTML thật của trình duyệt. Focus là vị trí đang nhận thao tác bàn phím; modal là hộp thoại giữ thao tác bên trong nó. ARIA là các thuộc tính mô tả nhãn/trạng thái để công cụ hỗ trợ như trình đọc màn hình hiểu giao diện.

## 2. Chức năng chính

- Button primary/secondary/danger, trạng thái disabled, hover, active và focus.
- Field gắn label với input và thông báo lỗi/hướng dẫn.
- Feedback phân biệt trạng thái bình thường và lỗi cho trình đọc màn hình.
- Dialog native có focus modal, Escape và trả focus về phần tử trước đó.
- Section và WorkspaceLayout giữ cấu trúc panel/tám bước/preview hiện hữu.

## 3. Cấu trúc thư mục

| File | Vai trò |
| --- | --- |
| `controls.tsx` | Button, Field, Feedback, Dialog |
| `Section.tsx` | Panel HTML section, nhận thuộc tính HTML |
| `WorkspaceLayout.tsx` | Slots analysis/processing/table/history và tám bước |
| `workspace-preview.ts` | Context cung cấp vị trí hiển thị preview |
| `index.ts` | Public exports để app/features sử dụng |
| `../style/` | Tokens và CSS quyết định hình thức |

## 4. Luồng hoạt động

Feature truyền giá trị, children, trạng thái busy/disabled và callback vào UI. UI hiển thị rồi gọi callback được truyền; nghiệp vụ vẫn chạy ở chủ sở hữu cũ.

ThemeEffect đặt theme; shared/style cung cấp màu/control. WorkspaceLayout chỉ cung cấp slots và preview host (phần tử DOM nhận preview qua React portal), không tính toán hoặc Apply dữ liệu.

## 5. Component và hàm quan trọng

- `Button`: chuyển tiếp thuộc tính button native; variant quyết định class, không thay onClick.
- `Field`: tạo ID ổn định bằng useId nếu không có id; gắn aria-invalid và aria-describedby.
- `Feedback`: dùng role status hoặc alert.
- `Dialog`: showModal/close, giữ Escape và busy semantics; cleanup trả focus nếu phần tử trước vẫn tồn tại.
- `WorkspaceLayout`: giữ thứ tự tám bước và navigationLocked khi mutation/Apply chưa rõ kết quả.
- `useWorkspacePreviewHost`: đọc vị trí hiển thị preview; không xử lý dữ liệu.

## 6. Props, state và dữ liệu

Button nhận variant và ButtonHTMLAttributes. Field nhận label/error/hint và InputHTMLAttributes. Dialog nhận title/onClose/busy/children, chỉ giữ ref DOM và ID. WorkspaceLayout nhận activeTab/onTab/navigationLocked cùng các slot ReactNode; state previewHost chỉ phục vụ bố trí.

Không thêm state authentication, API, CSV, processing, history, IndexedDB hoặc sync trong giai đoạn này.

## 7. Hướng dẫn sử dụng

```tsx
<Button variant="primary" disabled={busy} onClick={onPreview}>Xem trước</Button>
<Field label="Tên project" value={name} onChange={onNameChange} error={error}/>
<Feedback error>Chưa thể lưu thay đổi.</Feedback>
```

Người dùng vẫn thao tác như trước: Tab để focus, Enter/Space kích hoạt nút, Escape đóng dialog khi không busy. Disabled vẫn là thuộc tính native, không chỉ là màu xám. Không thay handler để chạy demo.

## 8. Hướng dẫn kiểm thử

Chạy từ gốc:

```powershell
node node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p frontend/test/design-system/tsconfig.json
node node_modules/@playwright/test/cli.js test -c frontend/test/design-system/playwright.config.ts
npm run test:unit -w frontend
```

Browser test và cách giữ artifacts trong frontend được mô tả ở `frontend/test/design-system/README.md`. Kiểm label/error, disabled, bàn phím, modal/focus return và mobile/light/dark. Unit runner chỉ tạo bundle tại frontend/.artifact-work/unit, không build backend/core.

## 9. Phụ thuộc

React, DOM native và CSS shared/style. Shared UI không import app/features hoặc backend. Không thêm UI library hay package.

## 10. Giới hạn và lưu ý

Design system không phải bằng chứng nghiệp vụ auth/sync thành công. Fixture UI độc lập không gọi backend; smoke local chỉ dùng dữ liệu thử trong browser context mới. Full acceptance/HTTPS/DB vẫn cần môi trường riêng; wrapper hiện có có bước build backend/core nên không tự chạy trong scope frontend-only.

Không đổi component keys, vị trí preview portal hoặc navigationLocked trong một đợt đổi CSS. Không dùng gradient/màu làm tín hiệu trạng thái duy nhất.

### Skin neon

Button tiếp tục dùng props/handler cũ; gradient xanh–tím và glow thuộc shared/style. Disabled/loading dựa trên thuộc tính disabled hiện có và không có glow. Viền focus 3px không dựa riêng vào bóng. Reduced motion tắt thời lượng và độ nâng hover. Không thay controls.tsx hoặc luồng dialog.

### Shell và workspace
App shell có sidebar route thật và theme selector; tám bước workspace vẫn render theo activeTab/onTab/navigationLocked. CSS shell.css tăng nhận biết step-index, không đổi props, slot hay thứ tự nghiệp vụ. Menu mobile thu gọn độc lập với workspace tabs.
