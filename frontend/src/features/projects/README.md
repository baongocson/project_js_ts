# Feature projects và workspace

ProjectsPage quản lý project server: list/sort/page, create với stable key, open/rename/delete có xác nhận và states. WorkspacePage ở app composition ghép dataset table/import, processing, history và analysis qua public index, giữ feature graph không vòng.

Workspace online autosave debounce/serialize theo revision/boundVersionId; response cũ bị generation fence. Lỗi 409 dừng lưu, tải lại server để review; normalized adjustments được hiển thị. Apply/restore đọc lại project/metadata/rows và remount panels theo version.

`workspace-drafts.ts` lưu patch đồng bộ vào localStorage trước debounce, key riêng account/project/tab, không có token/dataset cell. Không ghi đè draft của tab khác khi đọc. Nếu response mất sau commit, đọc lại so đầy đủ patch/bound version để bỏ prompt replay; nếu khác, chỉ recovery khi người dùng chọn. Draft version cũ chỉ giữ/export, không tự apply refs cũ. Quota/corrupt/future schema không clear storage; lỗi có thông báo, export và cảnh báo rời trang khi chưa có bản bền vững.

Restore draft lên revision server mới là lựa chọn tường minh; server CAS/normalization vẫn quyết định hợp lệ. Bản nháp còn lại được tính trong dialog logout/delete ở profile; chỉ dọn theo lựa chọn của user. Local dataset workspace nằm trong IndexedDB workspaces của feature offline, không dùng draft này thay outbox.

Test acceptance: project CRUD/profile/table reload, CAS hai tab, rời trước debounce, response loss không replay, fail/reload/recovery và conflict/export. Unit kiểm isolation, quota/corrupt và canonical match. Session-expiry/storage-failure/restart nâng cao tiếp tục được audit theo checklist.

## 1. Giới thiệu giao diện Projects
Danh sách project server và thao tác quản lý giữ nguyên, nâng skin bằng shared/style.
## 2. Chức năng chính
Card có accent gradient, tiêu đề rõ, badge lifecycle, metadata cập nhật và actions thật. Empty/loading/error hiện có được giữ.
## 3. Cấu trúc thư mục
pages/ProjectsPage.tsx render; api/projects-api.ts gọi contract; types.ts DTO; workspace-drafts.ts bảo vệ nháp; shared/style/shell.css trang trí card.
## 4. Luồng hoạt động
List từ projectsApi; sort/page kích hoạt tải lại; create điều hướng workspace; rename/delete qua Dialog rồi tải lại. Skin không can thiệp luồng.
## 5. Component và hàm quan trọng
ProjectsPage sở hữu CRUD; create giữ idempotency key; mutate khóa thao tác; Dialog giữ focus và xác nhận xóa.
## 6. Props, state và dữ liệu
Project name/lifecycle/updatedAt đến từ server. Không tạo KPI giả. Loading/error/busy/page/sort là state hiện có.
## 7. Hướng dẫn sử dụng
Projects online trên sidebar; nhập tên tạo project, Mở workspace, Đổi tên hoặc Xóa có xác nhận.
## 8. Hướng dẫn kiểm thử
Frontend unit và design-system browser config; acceptance online-workspace cần backend test riêng. Kiểm empty/loading/error, list sort/page, create/rename/delete và keyboard dialog. Không chạy wrapper tạo dữ liệu ngoài frontend.
## 9. Phụ thuộc
React, router, shared/api, shared/ui và API server hiện hữu.
## 10. Giới hạn và lưu ý
CSS không kiểm chứng backend CRUD; acceptance server chỉ chạy khi môi trường được chuẩn bị. Hover lift2px tắt khi reduced motion, không thay callback.
